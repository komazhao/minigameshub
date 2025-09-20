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

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { version: null, site: 'https://minigameshub.co', git: false, branch: 'main', remote: 'origin' };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === '--version' || a === '-v') && args[i+1]) out.version = args[++i];
    else if ((a === '--site' || a === '-s') && args[i+1]) out.site = args[++i].replace(/\/$/, '');
    else if (a === '--git') out.git = true;
    else if (a === '--branch' && args[i+1]) out.branch = args[++i];
    else if (a === '--remote' && args[i+1]) out.remote = args[++i];
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

function main() {
  const { version, site, git, branch, remote } = parseArgs();
  console.log(`[publish] start (site=${site}, version=${version || 'auto'})`);

  // 1) Regenerate static pages
  if (!exists('page-generator.js')) {
    console.error('[publish] page-generator.js not found');
    process.exit(1);
  }
  run('node page-generator.js');

  // 2) Run release (bump versions + sitemaps)
  const releaseCmd = version
    ? `node tools/release.mjs --version ${version} --site ${site}`
    : `node tools/release.mjs --site ${site}`;
  run(releaseCmd);

  // 3) Optionally commit & push
  if (git) {
    try {
      run('git add sw.js index.html collection.html offline.html robots.txt sitemap*.xml');
      run('git add assets/js/swRegister.js assets/js/navRouter.js');
      run('git add privacy-policy/index.html terms-of-service/index.html contact/index.html');
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

