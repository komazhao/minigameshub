#!/usr/bin/env node
/**
 * One-click release script for MiniGamesHub
 * - Bump asset version and SW cache version
 * - Update HTML references with ?v=<version>
 * - Regenerate sitemaps (pages, categories, games, images) based on generated-pages
 * - Ensure robots.txt has Sitemap entry
 * - Update JSON-LD counts on homepage (numberOfItems)
 */

import fs from 'fs';
import path from 'path';

const CWD = process.cwd();

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { version: null, site: 'https://minigameshub.co' };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === '--version' || a === '-v') && args[i + 1]) {
      out.version = args[++i];
    } else if ((a === '--site' || a === '-s') && args[i + 1]) {
      out.site = args[++i].replace(/\/$/, '');
    }
  }
  if (!out.version) {
    const d = new Date();
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    out.version = [
      d.getUTCFullYear(),
      pad(d.getUTCMonth() + 1),
      pad(d.getUTCDate()),
      pad(d.getUTCHours()),
      pad(d.getUTCMinutes())
    ].join('');
  }
  return out;
}

function read(file) {
  return fs.readFileSync(path.join(CWD, file), 'utf8');
}
function write(file, content) {
  fs.writeFileSync(path.join(CWD, file), content, 'utf8');
}
function exists(p) {
  return fs.existsSync(path.join(CWD, p));
}

function bumpServiceWorker(version) {
  const file = 'sw.js';
  if (!exists(file)) return;
  let src = read(file);
  // Replace cache names like: minigameshub-v1.0.1, minigameshub-games-v1.0.1, minigameshub-api-v1.0.1
  src = src.replace(/minigameshub-v[0-9\.\-]+/g, `minigameshub-v${version}`)
           .replace(/minigameshub-games-v[0-9\.\-]+/g, `minigameshub-games-v${version}`)
           .replace(/minigameshub-api-v[0-9\.\-]+/g, `minigameshub-api-v${version}`);
  write(file, src);
}

function bumpSwRegister(version) {
  const file = 'assets/js/swRegister.js';
  if (!exists(file)) return;
  let src = read(file);
  src = src.replace(/ASSET_VERSION\s*=\s*['"][^'"]+['"]/g, `ASSET_VERSION = '${version}'`);
  write(file, src);
}

function updateHtmlAssetVersion(file, version) {
  if (!exists(file)) return;
  let html = read(file);
  // Append or update ?v= for local CSS/JS and config.js; ignore external (http/https)
  html = html.replace(/(href|src)=\"([^\"]+)\"/g, (m, attr, url) => {
    if (/^https?:/i.test(url)) return m;
    const isTarget = /\.css(\?|#|$)/i.test(url) || /\.js(\?|#|$)/i.test(url) || /(^|\/)config\.js(\?|#|$)/i.test(url);
    if (!isTarget) return m;
    const hashIndex = url.indexOf('#');
    const hash = hashIndex >= 0 ? url.slice(hashIndex) : '';
    const base = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
    const [pathOnly, qs] = base.split('?', 2);
    const params = new URLSearchParams(qs || '');
    params.set('v', version);
    const newUrl = `${pathOnly}?${params.toString()}${hash}`;
    return `${attr}=\"${newUrl}\"`;
  });
  // Ensure swRegister injected on pages if not present
  if (!/swRegister\.js/.test(html)) {
    html = html.replace(/<\/body>/i, `    <script src="assets/js/swRegister.js?v=${version}"></script>\n</body>`);
  }
  write(file, html);
}

function formatDate(d = new Date()) {
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function collectGeneratedPages() {
  const base = 'generated-pages';
  const out = { categories: [], games: [] };
  const catDir = path.join(CWD, base, 'categories');
  const gameDir = path.join(CWD, base, 'games');
  if (fs.existsSync(catDir)) {
    for (const f of fs.readdirSync(catDir)) {
      if (f.endsWith('.html')) {
        const slug = f.replace(/\.html$/, '');
        out.categories.push(slug);
      }
    }
  }
  if (fs.existsSync(gameDir)) {
    for (const f of fs.readdirSync(gameDir)) {
      if (f.endsWith('.html')) {
        const slug = f.replace(/\.html$/, '');
        out.games.push(slug);
      }
    }
  }
  return out;
}

function extractGameImages(site, gameSlug) {
  // Try to parse og:image and title from generated game HTML
  const file = path.join('generated-pages', 'games', `${gameSlug}.html`);
  if (!exists(file)) return null;
  const html = read(file);
  const ogImg = /<meta\s+property=\"og:image\"\s+content=\"([^\"]+)\"/i.exec(html)?.[1] || null;
  const ogTitle = /<meta\s+property=\"og:title\"\s+content=\"([^\"]+)\"/i.exec(html)?.[1] || null;
  return { image: ogImg, title: ogTitle };
}

function writeSitemapIndex(site, lastmod) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
`  <sitemap>\n    <loc>${site}/sitemap-pages.xml</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>\n` +
`  <sitemap>\n    <loc>${site}/sitemap-categories.xml</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>\n` +
`  <sitemap>\n    <loc>${site}/sitemap-games.xml</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>\n` +
`  <sitemap>\n    <loc>${site}/sitemap-images.xml</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>\n` +
`</sitemapindex>\n`;
  write('sitemap.xml', xml);
}

function writeSitemapPages(site, lastmod) {
  const urls = [
    { loc: `${site}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${site}/collections/featured`, changefreq: 'daily', priority: '0.9' },
    { loc: `${site}/collections/new`, changefreq: 'daily', priority: '0.9' },
    { loc: `${site}/collections/popular`, changefreq: 'daily', priority: '0.9' },
    { loc: `${site}/random`, changefreq: 'daily', priority: '0.6' },
    { loc: `${site}/sitemap.xml`, changefreq: 'weekly', priority: '0.3' }
  ];
  const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    .concat(urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`))
    .concat(['</urlset>']).join('\n') + '\n';
  write('sitemap-pages.xml', xml);
}

function writeSitemapCategories(site, lastmod, categories) {
  const xmlParts = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  categories.forEach(slug => {
    xmlParts.push(`  <url>\n    <loc>${site}/collections/category/${slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
  });
  xmlParts.push('</urlset>');
  write('sitemap-categories.xml', xmlParts.join('\n') + '\n');
}

function writeSitemapGames(site, lastmod, games) {
  const xmlParts = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  games.forEach(slug => {
    xmlParts.push(`  <url>\n    <loc>${site}/games/${slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
  });
  xmlParts.push('</urlset>');
  write('sitemap-games.xml', xmlParts.join('\n') + '\n');
}

function writeSitemapImages(site, lastmod, games) {
  const xmlParts = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'];
  games.forEach(slug => {
    const info = extractGameImages(site, slug);
    if (!info || !info.image) return;
    const title = info.title || slug;
    const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    xmlParts.push(`  <url>\n    <loc>${site}/games/${slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n    <image:image>\n      <image:loc>${info.image}</image:loc>\n      <image:title>${safeTitle}</image:title>\n      <image:caption>${safeTitle}</image:caption>\n    </image:image>\n  </url>`);
  });
  xmlParts.push('</urlset>');
  write('sitemap-images.xml', xmlParts.join('\n') + '\n');
}

function ensureRobotsSitemap(site) {
  const file = 'robots.txt';
  if (!exists(file)) return;
  let txt = read(file);
  const line = `Sitemap: ${site}/sitemap.xml`;
  if (!/Sitemap:\s*https?:\/\//i.test(txt)) {
    if (!/\n$/.test(txt)) txt += '\n';
    txt += line + '\n';
  } else {
    // Replace any existing Sitemap line
    txt = txt.replace(/Sitemap:\s*https?:\/\/[^\s]+/i, line);
  }
  write(file, txt);
}

function updateHomeSchemaCounts(gamesCount) {
  const file = 'index.html';
  if (!exists(file)) return;
  let html = read(file);
  // Update numberOfItems inside #games-schema JSON-LD (if present)
  html = html.replace(/("numberOfItems"\s*:\s*)\d+/i, `$1${gamesCount}`);
  write(file, html);
}

function main() {
  const { version, site } = parseArgs();
  console.log(`[release] version=${version} site=${site}`);

  // 1) Bump versions
  bumpServiceWorker(version);
  bumpSwRegister(version);
  updateHtmlAssetVersion('index.html', version);
  updateHtmlAssetVersion('collection.html', version);

  // 2) Collect content
  const { categories, games } = collectGeneratedPages();
  const lastmod = formatDate(new Date());

  // 3) Sitemaps
  writeSitemapIndex(site, lastmod);
  writeSitemapPages(site, lastmod);
  writeSitemapCategories(site, lastmod, categories);
  writeSitemapGames(site, lastmod, games);
  writeSitemapImages(site, lastmod, games);
  ensureRobotsSitemap(site);

  // 4) SEO JSON-LD counts
  updateHomeSchemaCounts(games.length);

  console.log('[release] Completed successfully.');
}

main();
