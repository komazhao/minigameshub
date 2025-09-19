const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.resolve(ROOT, 'data', 'gameData.json');

const BASE_URL = 'https://minigameshub.co';
const today = new Date().toISOString().split('T')[0];

function loadGameData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const parsed = JSON.parse(raw || '{}');
  const games = Array.isArray(parsed.games) ? parsed.games : [];
  const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
  return { games, categories };
}

function buildUrl(loc, priority = '0.8', changefreq = 'weekly', lastmod = today) {
  return {
    loc: `${BASE_URL}${loc}`,
    priority,
    changefreq,
    lastmod
  };
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createUrlset(urls, namespaceExtra = '') {
  const ns = `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${namespaceExtra}`;
  const body = urls.map(url => {
    const { loc, priority, changefreq, lastmod, images } = url;
    const lines = [
      '  <url>',
      `    <loc>${escapeXml(loc)}</loc>`
    ];
    if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
    if (changefreq) lines.push(`    <changefreq>${changefreq}</changefreq>`);
    if (priority) lines.push(`    <priority>${priority}</priority>`);
    if (Array.isArray(images) && images.length > 0) {
      lines.push(images.map(img => {
        const parts = [
          '    <image:image>',
          `      <image:loc>${escapeXml(img.loc)}</image:loc>`
        ];
        if (img.title) {
          parts.push(`      <image:title>${escapeXml(img.title)}</image:title>`);
        }
        if (img.caption) {
          parts.push(`      <image:caption>${escapeXml(img.caption)}</image:caption>`);
        }
        parts.push('    </image:image>');
        return parts.join('\n');
      }).join('\n'));
    }
    lines.push('  </url>');
    return lines.join('\n');
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${ns}>\n${body}\n</urlset>\n`;
}

function createSitemapIndex(files) {
  const body = files.map(file => {
    const location = `${BASE_URL}/${file}`;
    return [
      '  <sitemap>',
      `    <loc>${escapeXml(location)}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      '  </sitemap>'
    ].join('\n');
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

function main() {
  const { games, categories } = loadGameData();

  const staticPages = [
    buildUrl('/', '1.0', 'daily'),
    buildUrl('/collections/featured', '0.9', 'daily'),
    buildUrl('/collections/new', '0.9', 'daily'),
    buildUrl('/collections/popular', '0.9', 'daily'),
    buildUrl('/random', '0.6', 'daily'),
    buildUrl('/sitemap.xml', '0.3', 'weekly')
  ];

  const categoryUrls = categories.map(category => buildUrl(`/collections/category/${category.slug}`, '0.8', 'weekly'));

  const gameUrls = games.map(game => buildUrl(`/games/${game.slug}`, '0.8', 'weekly', game.date_added ? game.date_added.split('T')[0] : today));

  const imageUrls = games.map(game => ({
    loc: `${BASE_URL}/games/${game.slug}`,
    priority: '0.6',
    changefreq: 'weekly',
    lastmod: game.date_added ? game.date_added.split('T')[0] : today,
    images: [
      {
        loc: game.image || `${BASE_URL}/assets/images/game-placeholder.png`,
        title: game.name || game.game_name || 'Mini game screenshot',
        caption: game.description ? game.description.slice(0, 190) : 'Play free HTML5 mini games online.'
      }
    ]
  }));

  const outputMap = {
    'sitemap-pages.xml': createUrlset(staticPages),
    'sitemap-categories.xml': createUrlset(categoryUrls),
    'sitemap-games.xml': createUrlset(gameUrls),
    'sitemap-images.xml': createUrlset(imageUrls, ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')
  };

  Object.entries(outputMap).forEach(([filename, xml]) => {
    fs.writeFileSync(path.resolve(ROOT, filename), xml);
  });

  const sitemapIndex = createSitemapIndex(Object.keys(outputMap));
  fs.writeFileSync(path.resolve(ROOT, 'sitemap.xml'), sitemapIndex);
}

main();
