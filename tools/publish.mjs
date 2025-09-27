#!/usr/bin/env node
/**
 * Publish script (one-command):
 * - Generate static pages from templates (game + category)
 * - Bump versions and regenerate sitemaps via tools/release.mjs
 * - Optionally commit and push changes (use --git to enable)
 *
 * Usage:
 *   node tools/publish.mjs --version 1.0.3 --site https://minigameshub.co --git
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { version: null, site: 'https://minigameshub.co', git: false, branch: 'main', remote: 'origin', noFetch: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === '--version' || a === '-v') && args[i+1]) out.version = args[++i];
    else if ((a === '--site' || a === '-s') && args[i+1]) out.site = args[++i].replace(/\/$/, '');
    else if (a === '--git') out.git = true;
    else if (a === '--branch' && args[i+1]) out.branch = args[++i];
    else if (a === '--remote' && args[i+1]) out.remote = args[++i];
    else if (a === '--no-fetch') out.noFetch = true;
  }
  return out;
}

function run(cmd, opts = {}) {
  console.log(`[publish] $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function exists(p) {
  return fs.existsSync(path.join(process.cwd(), p));
}

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}

function write(file, content) {
  fs.writeFileSync(path.join(process.cwd(), file), content, 'utf8');
}

function slugify(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function fetchSupabaseData() {
  try {
    const cfg = require('../config.js');
    const supa = cfg.getConfig ? cfg.getConfig('supabase') : (cfg.CONFIG ? cfg.CONFIG.supabase : null);
    const tables = cfg.getConfig ? cfg.getConfig('database') : (cfg.CONFIG ? cfg.CONFIG.database : null);
    if (!supa || !supa.url || !supa.anonKey || !tables) {
      throw new Error('Supabase or database table config missing');
    }

    const base = `${supa.url.replace(/\/$/, '')}/rest/v1`;
    const headers = {
      apikey: supa.anonKey,
      Authorization: `Bearer ${supa.anonKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    // Fetch categories
    const catRes = await fetch(`${base}/${tables.categories}?select=id,name,description&order=id.asc`, { headers });
    if (!catRes.ok) throw new Error(`Fetch categories failed: ${catRes.status}`);
    const catRows = await catRes.json();
    const categories = (catRows || []).map(c => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      slug: slugify(c.name),
      game_count: 0
    }));

    // Fetch games (published only). We sort locally after fetch.
    const gameFields = [
      'game_id','catalog_id','game_name','name','image','category','plays','rating',
      'description','instructions','file','game_type','w','h','date_added','published','featured','mobile','slug'
    ];
    const gameRes = await fetch(`${base}/${tables.games}?select=${encodeURIComponent(gameFields.join(','))}&published=eq.1`, { headers });
    if (!gameRes.ok) throw new Error(`Fetch games failed: ${gameRes.status}`);
    const gameRows = await gameRes.json();
    const games = (gameRows || []).map(g => {
      const name = g.name || g.game_name || 'Untitled Game';
      const slug = g.slug || slugify(name);
      return {
        game_id: Number(g.game_id) || Number(g.id) || 0,
        catalog_id: g.catalog_id || '',
        game_name: g.game_name || slug,
        name,
        image: g.image || '/assets/images/game-placeholder.png',
        category: Number(g.category) || Number(g.category_id) || 0,
        plays: Number(g.plays) || 0,
        rating: Number(g.rating) || 0,
        description: g.description || '',
        instructions: g.instructions || '',
        file: g.file || '',
        game_type: g.game_type || 'html5',
        width: Number(g.w) || Number(g.width) || 800,
        height: Number(g.h) || Number(g.height) || 600,
        published: String(g.published) === '1' || g.published === true,
        featured: String(g.featured) === '1' || g.featured === true,
        mobile: g.mobile === undefined ? true : (String(g.mobile) !== '0' && g.mobile !== false),
        keywords: g.keywords || '',
        slug
      };
    }).filter(g => g.published);

    // Sort games: featured desc, rating desc, plays desc
    games.sort((a, b) => (b.featured - a.featured) || (b.rating - a.rating) || (b.plays - a.plays));

    // Recompute category counts
    const counts = new Map();
    games.forEach(g => counts.set(g.category, (counts.get(g.category) || 0) + 1));
    categories.forEach(c => c.game_count = counts.get(c.id) || 0);

    // Stats
    const stats = {
      totalGames: games.length,
      totalCategories: categories.length,
      totalPlays: games.reduce((s, g) => s + (g.plays || 0), 0),
      lastUpdated: new Date().toISOString()
    };

    return { categories, games, stats };
  } catch (e) {
    console.warn('[publish] Supabase fetch failed, fallback to existing data:', e.message);
    try {
      const existing = JSON.parse(read('data/gameData.json'));
      return existing;
    } catch {
      return null;
    }
  }
}

async function main() {
  const { version, site, git, branch, remote, noFetch } = parseArgs();
  console.log(`[publish] start (site=${site}, version=${version || 'auto'})`);

  // 1) Pull latest data from Supabase and write data/gameData.json
  if (!noFetch) {
    try {
      const data = await fetchSupabaseData();
      if (data && data.games && data.categories) {
        write('data/gameData.json', JSON.stringify(data, null, 2));
        console.log(`[publish] data/gameData.json updated (games=${data.games.length}, categories=${data.categories.length})`);
      } else {
        console.warn('[publish] Skip updating gameData.json due to missing data.');
      }
    } catch (e) {
      console.warn('[publish] Failed to update gameData.json:', e.message);
    }
  } else {
    console.log('[publish] --no-fetch enabled, skip Supabase pull');
  }

  // 2) Regenerate static pages
  if (!exists('page-generator.js')) {
    console.error('[publish] page-generator.js not found');
    process.exit(1);
  }
  run('node page-generator.js');

  // 3) Run release (bump versions + sitemaps)
  const releaseCmd = version
    ? `node tools/release.mjs --version ${version} --site ${site}`
    : `node tools/release.mjs --site ${site}`;
  run(releaseCmd);

  // 4) Optionally commit & push
  if (git) {
    try {
      run('git add sw.js index.html collection.html offline.html robots.txt sitemap*.xml');
      run('git add assets/js/swRegister.js assets/js/navRouter.js');
      run('git add privacy-policy/index.html terms-of-service/index.html contact/index.html contact/thanks/index.html about/index.html');
      run('git add templates/game-page.html templates/category-page.html');
      run('git add generated-pages');
      run('git add tools/release.mjs tools/publish.mjs page-generator.js');
      const msg = `publish: v${version || 'auto'} + regenerate pages & sitemaps`;
      run(`git commit -m "${msg}"`);
      try {
        run(`git push ${remote} ${branch}`);
      } catch (e) {
        console.warn('[publish] git push failed (possibly due to CI or network). You can push manually.');
      }
    } catch (e) {
      console.warn('[publish] git commit/push skipped or failed:', e.message);
    }
  }

  console.log('[publish] done');
}

main();
