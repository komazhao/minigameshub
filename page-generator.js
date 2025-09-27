#!/usr/bin/env node

/**
 * 文件编码: UTF-8
 * MiniGamesHub.co 静态页面生成器
 * 从模板和数据库数据生成单个游戏页面和分类页面
 */

const fs = require('fs');
const path = require('path');

class PageGenerator {
    constructor() {
        this.gameData = null;
        this.templates = {};
        this.outputDir = './generated-pages';
        
        // 确保输出目录存在
        this.ensureDirectories();
    }
    
    /**
     * 初始化页面生成器
     */
    async init() {
        await this.loadGameData();
        await this.loadTemplates();
    }
    
    /**
     * 从JSON文件加载游戏数据
     */
    async loadGameData() {
        try {
            const dataPath = path.join(__dirname, 'data', 'gameData.json');
            const rawData = fs.readFileSync(dataPath, 'utf8');
            this.gameData = JSON.parse(rawData);
            console.log(`已加载 ${this.gameData.games.length} 个游戏和 ${this.gameData.categories.length} 个分类`);
        } catch (error) {
            console.error('加载游戏数据时出错:', error);
            process.exit(1);
        }
    }
    
    /**
     * 加载HTML模板
     */
    async loadTemplates() {
        try {
            const gameTemplatePath = path.join(__dirname, 'templates', 'game-page.html');
            const categoryTemplatePath = path.join(__dirname, 'templates', 'category-page.html');
            
            this.templates.game = fs.readFileSync(gameTemplatePath, 'utf8');
            this.templates.category = fs.readFileSync(categoryTemplatePath, 'utf8');
            
            console.log('模板加载成功');
        } catch (error) {
            console.error('加载模板时出错:', error);
            process.exit(1);
        }
    }
    
    /**
     * 确保输出目录存在
     */
    ensureDirectories() {
        const dirs = [
            this.outputDir,
            path.join(this.outputDir, 'games'),
            path.join(this.outputDir, 'categories')
        ];
        
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    
    /**
     * 生成所有页面
     */
    async generateAllPages() {
        console.log('开始生成页面...');
        
        const startTime = Date.now();
        
        // 生成游戏页面
        await this.generateGamePages();
        
        // 生成分类页面
        await this.generateCategoryPages();
        
        // 生成站点地图
        await this.generateSitemap();
        
        const endTime = Date.now();
        console.log(`页面生成完成，耗时 ${endTime - startTime}ms`);
    }
    
    /**
     * 生成单个游戏页面
     */
    async generateGamePages() {
        console.log('生成游戏页面...');
        
        for (const game of this.gameData.games) {
            if (!game.published) continue;
            
            try {
                const html = this.generateGamePage(game);
                const filename = `${game.slug}.html`;
                const filepath = path.join(this.outputDir, 'games', filename);
                
                fs.writeFileSync(filepath, html, 'utf8');
                
                if (this.gameData.games.indexOf(game) % 10 === 0) {
                    console.log(`已生成 ${this.gameData.games.indexOf(game) + 1}/${this.gameData.games.length} 个游戏页面`);
                }
            } catch (error) {
                console.error(`生成游戏 ${game.name} 的页面时出错:`, error);
            }
        }
        
        console.log(`已生成 ${this.gameData.games.filter(g => g.published).length} 个游戏页面`);
    }
    
    /**
     * 生成分类页面
     */
    async generateCategoryPages() {
        console.log('生成分类页面...');
        
        for (const category of this.gameData.categories) {
            try {
                const html = this.generateCategoryPage(category);
                const filename = `${category.slug}.html`;
                const filepath = path.join(this.outputDir, 'categories', filename);
                
                fs.writeFileSync(filepath, html, 'utf8');
            } catch (error) {
                console.error(`生成分类 ${category.name} 的页面时出错:`, error);
            }
        }
        
        console.log(`已生成 ${this.gameData.categories.length} 个分类页面`);
    }
    
    /**
     * 生成单个游戏页面HTML
     */
    generateGamePage(game) {
        const category = this.gameData.categories.find(cat => cat.id === game.category) || { name: 'Game', slug: 'games' };
        
        // 生成相关游戏
        const relatedGames = this.getRelatedGames(game.game_id, 6);
        
        // 模板替换
        const replacements = {
            '{{GAME_ID}}': game.game_id,
            '{{GAME_NAME}}': this.escapeHtml(game.name),
            '{{GAME_SLUG}}': game.slug,
            '{{GAME_DESCRIPTION}}': this.escapeHtml(game.description),
            '{{GAME_DESCRIPTION_EXCERPT}}': this.escapeHtml(this.truncateText(game.description, 150)),
            '{{GAME_DESCRIPTION_HTML}}': this.formatDescription(game.description),
            '{{GAME_INSTRUCTIONS}}': this.escapeHtml(game.instructions),
            '{{GAME_KEYWORDS}}': this.escapeHtml(game.keywords),
            '{{GAME_IMAGE}}': game.image,
            '{{GAME_FILE}}': game.file,
            '{{GAME_WIDTH}}': game.width,
            '{{GAME_HEIGHT}}': game.height,
            '{{GAME_RATING}}': game.rating.toFixed(1),
            '{{GAME_PLAYS}}': game.plays.toLocaleString(),
            '{{GAME_TYPE}}': this.escapeHtml(game.game_type || 'HTML5'),
            '{{GAME_CATEGORY_ID}}': game.category,
            '{{CATEGORY_NAME}}': this.escapeHtml(category.name),
            '{{CATEGORY_SLUG}}': category.slug,
            '{{GAME_TAGLINE}}': this.escapeHtml(this.generateGameTagline(game)),
            '{{STAR_RATING_HTML}}': this.generateStarRating(game.rating),
            '{{GAME_TAGS_HTML}}': this.generateGameTags(game),
            '{{MOBILE_FRIENDLY}}': game.mobile ? 'Yes' : 'No',
            '{{DATE_ADDED}}': game.date_added ? new Date(game.date_added * 1000).toISOString() : new Date().toISOString(),
            '{{RELATED_GAMES_HTML}}': this.generateRelatedGamesHTML(relatedGames)
        };
        
        return this.replaceTemplate(this.templates.game, replacements);
    }
    
    /**
     * 生成分类页面HTML
     */
    generateCategoryPage(category) {
        const categoryGames = this.gameData.games.filter(game => 
            game.category === category.id && game.published
        );
        
        const featuredGames = categoryGames.filter(game => game.featured).slice(0, 6);
        const allGames = categoryGames.slice(0, 12); // 第一页
        const relatedCategories = this.getRelatedCategories(category.id, 4);
        
        // 计算统计信息
        const totalPlays = categoryGames.reduce((sum, game) => sum + game.plays, 0);
        const averageRating = categoryGames.length > 0 
            ? (categoryGames.reduce((sum, game) => sum + game.rating, 0) / categoryGames.length).toFixed(1)
            : 0;
        
        // 模板替换
        const replacements = {
            '{{CATEGORY_ID}}': category.id,
            '{{CATEGORY_NAME}}': this.escapeHtml(category.name),
            '{{CATEGORY_SLUG}}': category.slug,
            '{{CATEGORY_DESCRIPTION}}': this.escapeHtml(category.description),
            '{{CATEGORY_DESCRIPTION_FULL}}': this.escapeHtml(this.generateCategoryDescription(category)),
            '{{CATEGORY_ICON}}': this.getCategoryIcon(category.name),
            '{{GAME_COUNT}}': categoryGames.length,
            '{{TOTAL_PLAYS}}': totalPlays.toLocaleString(),
            '{{AVERAGE_RATING}}': averageRating,
            '{{FEATURED_GAMES_DISPLAY}}': featuredGames.length > 0 ? '' : 'display: none;',
            '{{FEATURED_GAMES_HTML}}': this.generateGamesGridHTML(featuredGames),
            '{{ALL_GAMES_HTML}}': this.generateGamesGridHTML(allGames),
            '{{LOAD_MORE_DISPLAY}}': categoryGames.length > 12 ? '' : 'display: none;',
            '{{RELATED_CATEGORIES_HTML}}': this.generateCategoriesGridHTML(relatedCategories),
            '{{CATEGORY_NAVIGATION_LINKS}}': this.generateCategoryNavigationLinks(),
            '{{FOOTER_CATEGORY_LINKS}}': this.generateFooterCategoryLinks(),
            '{{GAMES_STRUCTURED_DATA}}': this.generateGamesStructuredData(categoryGames.slice(0, 12)),
            '{{STRUCTURED_COUNT}}': Math.min(12, categoryGames.length),
            '{{FAQ_DISPLAY}}': 'display: block;',
            '{{FAQ_WHAT_ARE}}': this.generateCategoryFAQ(category),
            '{{FAQ_JSONLD}}': this.generateCategoryFaqJsonLd(category)
        };
        
        return this.replaceTemplate(this.templates.category, replacements);
    }
    
    /**
     * 替换模板占位符
     */
    replaceTemplate(template, replacements) {
        let result = template;
        
        for (const [placeholder, value] of Object.entries(replacements)) {
            const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            result = result.replace(regex, value);
        }
        
        return result;
    }
    
    /**
     * 获取相关游戏
     */
    getRelatedGames(gameId, count = 6) {
        const game = this.gameData.games.find(g => g.game_id === gameId);
        if (!game) return [];
        
        // 获取同分类游戏
        const sameCategory = this.gameData.games
            .filter(g => g.category === game.category && g.game_id !== gameId && g.published)
            .sort((a, b) => b.rating - a.rating)
            .slice(0, count);
        
        return sameCategory;
    }
    
    /**
     * 获取相关分类
     */
    getRelatedCategories(categoryId, count = 4) {
        return this.gameData.categories
            .filter(cat => cat.id !== categoryId)
            .sort((a, b) => b.game_count - a.game_count)
            .slice(0, count);
    }
    
    /**
     * 生成相关游戏HTML
     */
    generateRelatedGamesHTML(relatedGames) {
        if (!relatedGames || relatedGames.length === 0) {
            return '<p>No related games.</p>';
        }
        return this.generateGamesGridHTML(relatedGames);
    }

    /**
     * 生成游戏网格HTML
     */
    generateGamesGridHTML(games) {
        return games.map(game => {
            const category = this.gameData.categories.find(cat => cat.id === game.category);
            return `
                <div class="game-card" data-game-id="${game.game_id}">
                    <div class="game-image">
                        <img src="${game.image}" alt="${this.escapeHtml(game.name)}" loading="lazy" width="512" height="384">
                        ${game.featured ? '<div class="game-badge">Featured</div>' : ''}
                        <button class="game-favorite" data-game-id="${game.game_id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="game-info">
                        <h3 class="game-title">${this.escapeHtml(game.name)}</h3>
                        <p class="game-description">${this.escapeHtml(this.truncateText(game.description, 100))}</p>
                        <div class="game-meta">
                            <div class="game-rating">
                                <div class="stars">${this.generateStarRating(game.rating)}</div>
                                <span class="plays">${game.plays.toLocaleString()} plays</span>
                            </div>
                            <span class="game-category">${category ? this.escapeHtml(category.name) : 'Game'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * 生成分类网格HTML
     */
    generateCategoriesGridHTML(categories) {
        return categories.map(category => `
            <a class="category-card" data-category="${category.id}" href="/collections/category/${category.slug}" data-local-href="/collection.html?category=${category.slug}">
                <div class="category-icon">${this.getCategoryIcon(category.name)}</div>
                <h3 class="category-name">${this.escapeHtml(category.name)}</h3>
                <p class="category-description">${this.escapeHtml(category.description)}</p>
                <span class="category-count">${category.game_count} games</span>
            </a>
        `).join('');
    }
    
    /**
     * 生成星级评分HTML
     */
    generateStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let html = '';
        
        // 实心星星
        for (let i = 0; i < fullStars; i++) {
            html += '<svg class="star" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
        }
        
        // 半星
        if (hasHalfStar) {
            html += '<svg class="star half" width="14" height="14" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" opacity="0.5"/></svg>';
        }
        
        // 空星星
        for (let i = 0; i < emptyStars; i++) {
            html += '<svg class="star empty" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
        }
        
        return html;
    }
    
    /**
     * 获取分类图标
     */
    getCategoryIcon(categoryName) {
        const icons = {
            'Action': '⚡',
            'Racing': '🏎️',
            'Puzzle': '🧩',
            'Sports': '⚽',
            'Adventure': '🗺️',
            'Arcade': '🕹️',
            'Shooting': '🎯',
            'Simulation': '🎮'
        };
        
        return icons[categoryName] || '🎮';
    }
    
    /**
     * 生成游戏标语
     */
    generateGameTagline(game) {
        const category = this.gameData.categories.find(cat => cat.id === game.category);
        const categoryName = category ? category.name.toLowerCase() : 'game';
        
        const taglines = [
            `An exciting ${categoryName} game that will entertain you for hours!`,
            `Feel the thrill of this amazing ${categoryName} adventure!`,
            `Test your skills in this challenging ${categoryName} game!`,
            `Join the fun in this popular ${categoryName} game!`,
            `Discover the excitement of this awesome ${categoryName} experience!`
        ];
        
        return taglines[Math.floor(Math.random() * taglines.length)];
    }
    
    /**
     * 生成游戏标签
     */
    generateGameTags(game) {
        const tags = [];
        
        if (game.keywords) {
            tags.push(...game.keywords.split(',').map(tag => tag.trim()));
        }
        
        const category = this.gameData.categories.find(cat => cat.id === game.category);
        if (category) {
            tags.push(category.name.toLowerCase());
        }
        
        if (game.mobile) {
            tags.push('Mobile-friendly');
        }
        
        if (game.featured) {
            tags.push('Featured');
        }
        
        // 去重并生成HTML
        const uniqueTags = [...new Set(tags)].slice(0, 8);
        return uniqueTags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('');
    }
    
    /**
     * 生成分类导航链接
     */
    generateCategoryNavigationLinks() {
        return this.gameData.categories.map(category => 
            `<li><a href="#" class="nav-link" data-category="${category.id}">${this.escapeHtml(category.name)}</a></li>`
        ).join('');
    }
    
    /**
     * 生成页脚分类链接
     */
    generateFooterCategoryLinks() {
        return this.gameData.categories.slice(0, 6).map(category => 
            `<li><a href="/collections/category/${category.slug}" data-category="${category.id}" data-local-href="/collection.html?category=${category.slug}">${this.escapeHtml(category.name)} Games</a></li>`
        ).join('');
    }
    
    /**
     * 生成游戏结构化数据
     */
    generateGamesStructuredData(games) {
        return games.map((game, index) => `
            {
                "@type": "Game",
                "position": ${index + 1},
                "name": "${this.escapeJson(game.name)}",
                "url": "https://minigameshub.co/games/${game.slug}",
                "image": "${game.image}",
                "description": "${this.escapeJson(this.truncateText(game.description, 200))}",
                "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": ${game.rating},
                    "ratingCount": ${Math.max(1, game.plays)}
                }
            }
        `).join(',');
    }
    
    /**
     * 生成分类描述
     */
    generateCategoryDescription(category) {
        const name = category.name;
        const lower = name.toLowerCase();
        const count = category.game_count || 0;
        // Compose ~90–110 words intro
        const sentences = [
            `${name} games deliver engaging, pick‑up‑and‑play fun across browsers with no downloads required. Whether you prefer quick sessions or longer challenges, this hand‑curated collection is designed to be smooth, mobile‑friendly, and easy to jump into.`,
            `Explore ${count} free ${lower} titles featuring ${this.getCategoryFeatures(name)} and accessible controls for players of all skill levels.`,
            `Start with community favorites, discover hidden gems, and bookmark the ones you love — MiniGamesHub makes it simple to find quality ${lower} experiences that run great on desktop and phones.`
        ];
        return sentences.join(' ');
    }
    
    /**
     * 生成分类FAQ
     */
    generateCategoryFAQ(category) {
        return `${category.name} games are ${category.description.toLowerCase()}. They typically feature ${this.getCategoryFeatures(category.name)} and are great for players who enjoy ${this.getCategoryAudience(category.name)}.`;
    }
    
    /**
     * 获取分类特征
     */
    getCategoryFeatures(categoryName) {
        const features = {
            'Action': 'fast-paced gameplay, combat mechanics, and quick reflexes',
            'Racing': 'high-speed vehicles, competitive races, and precise driving',
            'Puzzle': 'brain-teasing challenges, logic, and problem solving',
            'Sports': 'sports competition, teamwork, and simulations',
            'Adventure': 'exploration, storytelling, and immersive worlds',
            'Arcade': 'classic gameplay, simple controls, and addictive loops',
            'Shooting': 'aim training, combat scenarios, and weapon variety',
            'Simulation': 'realistic scenarios, management elements, and life sims'
        };
        
        return features[categoryName] || 'engaging gameplay and entertainment';
    }
    
    /**
     * 获取分类受众
     */
    getCategoryAudience(categoryName) {
        const audiences = {
            'Action': 'thrilling, adrenaline-pumping experiences',
            'Racing': 'speed and competitive driving challenges',
            'Puzzle': 'mental challenges and brain training',
            'Sports': 'sports competition and entertainment',
            'Adventure': 'exploration and immersive storytelling',
            'Arcade': 'classic games and nostalgic experiences',
            'Shooting': 'precision challenges and combat scenarios',
            'Simulation': 'realistic experiences and management gameplay'
        };
        
        return audiences[categoryName] || 'fun and engaging gameplay';
    }

    /**
     * 生成分类 FAQ 的 JSON-LD
     */
    generateCategoryFaqJsonLd(category) {
        const qas = [
            { q: `What are ${category.name} games?`, a: this.generateCategoryFAQ(category) },
            { q: `Are these ${category.name} games free to play?`, a: `Yes! All ${category.name.toLowerCase()} games on MiniGamesHub are completely free to play. You don't need to download anything or sign up — just click and play instantly in your web browser.` },
            { q: `Can I play ${category.name} games on mobile?`, a: `Many of our ${category.name.toLowerCase()} games are mobile-friendly and work great on smartphones and tablets. Look for the mobile-friendly badge on each game.` }
        ];
        
        const json = {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: qas.map(({ q, a }) => ({
                '@type': 'Question',
                name: q,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: a
                }
            }))
        };
        return JSON.stringify(json);
    }
    
    /**
     * 格式化描述为HTML
     */
    formatDescription(description) {
        return description
            .split('\n')
            .filter(line => line.trim())
            .map(line => `<p>${this.escapeHtml(line.trim())}</p>`)
            .join('');
    }
    
    /**
     * 生成站点地图
     */
    async generateSitemap() {
        console.log('生成站点地图...');
        
        const urls = [];
        
        // 主页
        urls.push({
            loc: 'https://minigameshub.co/',
            priority: '1.0',
            changefreq: 'daily'
        });
        
        // 游戏页面
        for (const game of this.gameData.games) {
            if (game.published) {
                urls.push({
                    loc: `https://minigameshub.co/games/${game.slug}`,
                    priority: '0.8',
                    changefreq: 'weekly'
                });
            }
        }
        
        // 分类页面
        for (const category of this.gameData.categories) {
            urls.push({
                loc: `https://minigameshub.co/collections/category/${category.slug}`,
                priority: '0.7',
                changefreq: 'weekly'
            });
        }
        
        // 生成XML
        const xmlContent = this.generateSitemapXML(urls);
        
        // 写入站点地图
        fs.writeFileSync(path.join(this.outputDir, 'sitemap.xml'), xmlContent, 'utf8');
        
        console.log(`已生成包含 ${urls.length} 个URL的站点地图`);
    }
    
    /**
     * 生成站点地图XML
     */
    generateSitemapXML(urls) {
        const urlElements = urls.map(url => `
    <url>
        <loc>${url.loc}</loc>
        <priority>${url.priority}</priority>
        <changefreq>${url.changefreq}</changefreq>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    </url>`).join('');
        
        return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
    }
    
    /**
     * 实用函数
     */
    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    escapeJson(text) {
        if (!text) return '';
        return text
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }
    
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substr(0, maxLength).trim() + '...';
    }
}

// CLI功能
if (require.main === module) {
    const generator = new PageGenerator();
    
    generator.init()
        .then(() => generator.generateAllPages())
        .then(() => {
            console.log('所有页面生成成功！');
            console.log(`输出目录: ${generator.outputDir}`);
        })
        .catch(error => {
            console.error('生成页面时出错:', error);
            process.exit(1);
        });
}

module.exports = PageGenerator;
