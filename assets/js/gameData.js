/**
 * Game Data Management System with Supabase Integration
 * Handles loading, caching, and providing game data from Supabase database
 */

// Import Supabase client (需要在 HTML 中先加载 Supabase JS SDK)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

class GameDataManager {
    constructor() {
        this.data = null;
        this.games = [];
        this.categories = [];
        this.loading = false;
        this.loaded = false;
        this.cache = new Map();
        this.supabase = null;
        
        // Event system
        this.listeners = {};
        
        // 数据库配置 (从 config.js 获取)
        this.dbConfig = window.MiniGamesHubConfig ? 
            window.MiniGamesHubConfig.getConfig('database') : 
            {
                games: 'gm_games',
                categories: 'gm_categories'
            };
        
        // Initialize
        this.init();
    }
    
    async init() {
        console.log('GameDataManager 初始化开始...');

        try {
            console.log('1. 初始化 Supabase...');
            await this.initializeSupabase();

            console.log('2. 加载数据...');
            await this.loadData();

            console.log('3. 设置缓存...');
            this.setupCache();

            console.log('GameDataManager 初始化完成');
        } catch (error) {
            console.error('GameDataManager initialization failed:', error);
            console.log('尝试使用默认数据作为回退...');

            // 使用默认数据作为回退
            this.useDefaultData();
        }
    }

    /**
     * Use default data as fallback when Supabase fails
     */
    useDefaultData() {
        console.log('Using default data as fallback');

        // 创建默认分类
        this.categories = this.getDefaultCategories();

        // 创建默认游戏
        this.games = this.getDefaultGames();

        // 创建数据对象
        this.data = {
            games: this.games,
            categories: this.categories,
            stats: this.calculateStats()
        };

        // Process data
        this.processGames();
        this.processCategories();

        this.loaded = true;
        this.emit('loaded', this.data);

        console.log('Default data loaded successfully');
    }

    /**
     * Initialize Supabase client
     */
    async initializeSupabase() {
        try {
            // 获取 Supabase 配置
            const config = window.MiniGamesHubConfig ? 
                window.MiniGamesHubConfig.getConfig('supabase') : null;
            
            if (!config || !config.url || !config.anonKey) {
                throw new Error('Supabase configuration not found. Please check config.js');
            }
            
            // 检查 Supabase 是否已加载
            if (typeof window.supabase === 'undefined') {
                throw new Error('Supabase library not loaded. Please include the Supabase script.');
            }
            
            // 创建 Supabase 客户端
            this.supabase = window.supabase.createClient(config.url, config.anonKey);
            
            console.log('Supabase client initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Supabase:', error);
            this.emit('error', error);
        }
    }
    
    /**
     * Load game data from Supabase database
     */
    async loadData() {
        if (this.loading || this.loaded) return;

        this.loading = true;
        this.emit('loading', true);

        try {
            console.log('开始从数据库加载数据...');

            if (!this.supabase) {
                throw new Error('Supabase not initialized');
            }

            // 并行加载游戏和分类数据
            console.log('加载游戏和分类数据...');
            const [gamesResult, categoriesResult] = await Promise.all([
                this.loadGamesFromDB(),
                this.loadCategoriesFromDB()
            ]);

            this.games = gamesResult || [];
            this.categories = categoriesResult || [];

            console.log(`从数据库加载了 ${this.games.length} 个游戏和 ${this.categories.length} 个分类`);

            // 如果数据库数据为空，使用默认数据
            if (this.games.length === 0) {
                console.log('数据库数据为空，使用默认数据...');
                this.games = this.getDefaultGames();
                this.categories = this.getDefaultCategories();
            }

            // 创建数据对象
            this.data = {
                games: this.games,
                categories: this.categories,
                stats: this.calculateStats()
            };

            // Process and enrich data
            this.processGames();
            this.processCategories();

            this.loaded = true;
            this.emit('loaded', this.data);

            console.log(`数据加载完成：${this.games.length} 个游戏，${this.categories.length} 个分类`);

        } catch (error) {
            console.error('Error loading game data from Supabase:', error);
            console.log('数据库加载失败，使用默认数据...');

            // 使用默认数据作为完全回退
            this.games = this.getDefaultGames();
            this.categories = this.getDefaultCategories();

            this.data = {
                games: this.games,
                categories: this.categories,
                stats: this.calculateStats()
            };

            this.processGames();
            this.processCategories();

            this.loaded = true;
            this.emit('loaded', this.data);

            console.log(`使用默认数据：${this.games.length} 个游戏，${this.categories.length} 个分类`);
        } finally {
            this.loading = false;
            this.emit('loading', false);
        }
    }
    
    /**
     * Load games from Supabase database
     */
    async loadGamesFromDB() {
        try {
            const { data, error } = await this.supabase
                .from(this.dbConfig.games)
                .select(`
                    game_id,
                    catalog_id,
                    game_name,
                    name,
                    image,
                    category,
                    plays,
                    rating,
                    description,
                    instructions,
                    file,
                    game_type,
                    w,
                    h,
                    date_added,
                    published,
                    featured,
                    mobile
                `)
                .eq('published', '1')  // 只获取已发布的游戏
                .order('featured', { ascending: false })  // 特色游戏排前面
                .order('plays', { ascending: false });    // 然后按播放量排序
            
            if (error) {
                throw error;
            }
            
            // 处理数据格式
            return data.map(game => ({
                game_id: game.game_id,
                catalog_id: game.catalog_id,
                game_name: game.game_name,
                name: game.name,
                image: game.image,
                category: parseInt(game.category) || 0,
                plays: parseInt(game.plays) || 0,
                rating: parseFloat(game.rating) || 0,
                description: game.description || '',
                instructions: game.instructions || '',
                file: game.file,
                game_type: game.game_type || 'html5',
                width: parseInt(game.w) || 800,
                height: parseInt(game.h) || 600,
                date_added: game.date_added,
                published: game.published === '1',
                featured: game.featured === '1',
                mobile: parseInt(game.mobile) !== 0
            }));
            
        } catch (error) {
            console.error('Error loading games from database:', error);
            throw error;
        }
    }
    
    /**
     * Load categories from Supabase database
     */
    async loadCategoriesFromDB() {
        try {
            const { data, error } = await this.supabase
                .from(this.dbConfig.categories)
                .select('*')
                .order('id', { ascending: true });
            
            if (error) {
                throw error;
            }
            
            // 处理数据格式
            return data.map(category => ({
                id: category.id,
                name: category.name,
                description: category.description || '',
                slug: this.generateSlug(category.name),
                game_count: 0  // 将在 processCategories 中计算
            }));
            
        } catch (error) {
            console.error('Error loading categories from database:', error);
            // 如果分类加载失败，返回默认分类
            return this.getDefaultCategories();
        }
    }
    
    /**
     * Calculate site statistics
     */
    calculateStats() {
        return {
            totalGames: this.games.length,
            totalCategories: this.categories.length,
            totalPlays: this.games.reduce((sum, game) => sum + (game.plays || 0), 0),
            featuredGames: this.games.filter(game => game.featured).length,
            averageRating: this.games.length > 0 ? 
                this.games.reduce((sum, game) => sum + (game.rating || 0), 0) / this.games.length : 0,
            lastUpdated: new Date().toISOString()
        };
    }
    
    /**
     * Process and enrich game data
     */
    processGames() {
        this.games = this.games.map(game => {
            // 统一字段映射（处理数据库中不同的字段名）
            const processedGame = {
                ...game,
                // 基本信息字段映射
                id: game.game_id || game.id,
                game_id: game.game_id || game.id,
                name: game.name || game.game_name || 'Untitled Game',
                description: game.description || game.game_description || '一款有趣的在线游戏，快来体验吧！',
                instructions: game.instructions || game.game_instructions || game.how_to_play || '使用鼠标或键盘控制游戏。具体操作请参考游戏内的说明。',

                // 游戏文件和资源
                file: game.file || game.game_file || game.game_url || '',
                image: game.image || game.game_image || game.thumbnail || '/assets/images/game-placeholder.png',

                // 统计数据
                plays: game.plays || game.play_count || game.game_plays || 0,
                rating: game.rating || game.game_rating || 4.0,

                // 布尔属性
                featured: game.featured || game.is_featured || false,
                mobile: game.mobile !== false && game.is_mobile !== false, // Default to true
                published: game.published !== false && game.is_published !== false, // Default to true

                // 分类信息
                category: game.category || game.category_id || game.game_category || 1,

                // 游戏尺寸
                width: game.width || game.game_width || 800,
                height: game.height || game.game_height || 600,

                // 时间戳
                date_added: game.date_added || game.created_at || new Date().toISOString(),

                // Generate additional fields
                slug: game.slug || this.generateSlug(game.name || game.game_name || 'untitled'),
                searchKeywords: this.generateSearchKeywords(game),
                categoryName: this.getCategoryName(game.category || game.category_id || 1),

                // Add timestamps
                lastPlayed: null,
                addedToFavorites: null,

                // Performance metrics
                loadTime: null,
                errorCount: 0
            };

            return processedGame;
        });

        // Sort games by featured status and rating
        this.games.sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return b.rating - a.rating;
        });
    }
    
    /**
     * Process and enrich category data
     */
    processCategories() {
        this.categories = this.categories.map(category => ({
            ...category,
            slug: category.slug || this.generateSlug(category.name),
            games: this.getGamesByCategory(category.id),
            game_count: this.getGamesByCategory(category.id).length
        }));
        
        // Sort categories by game count
        this.categories.sort((a, b) => b.game_count - a.game_count);
    }
    
    /**
     * Generate URL-friendly slug
     */
    generateSlug(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
    
    /**
     * Generate search keywords for a game
     */
    generateSearchKeywords(game) {
        const keywords = [
            game.name,
            game.game_name,
            game.description,
            game.keywords,
            this.getCategoryName(game.category)
        ].filter(Boolean).join(' ').toLowerCase();
        
        return keywords;
    }
    
    /**
     * Get category name by ID
     */
    getCategoryName(categoryId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        return category ? category.name : 'Uncategorized';
    }
    
    /**
     * Setup caching system
     */
    setupCache() {
        // Cache frequently accessed data
        this.cache.set('allGames', this.games);
        this.cache.set('allCategories', this.categories);
        this.cache.set('featuredGames', this.buildFeaturedCollection());
        this.cache.set('popularGames', this.games.slice().sort((a, b) => (b.plays || 0) - (a.plays || 0)));
        this.cache.set('newestGames', this.games.slice().sort((a, b) => {
            const dateA = new Date(a.date_added || a.created_at || 0).getTime();
            const dateB = new Date(b.date_added || b.created_at || 0).getTime();
            return dateB - dateA;
        }));
    }

    /**
     * Get all games
     */
    getAllGames() {
        return this.cache.get('allGames') || this.games;
    }
    
    /**
     * Get all categories
     */
    getAllCategories() {
        return this.cache.get('allCategories') || this.categories;
    }
    
    /**
     * Get featured games
     */
    getFeaturedGames(limit = null, options = {}) {
        const ensureMin = options.ensureMin || (limit || 4);
        let featured = this.cache.get('featuredGames');

        if (!featured || featured.length < ensureMin) {
            featured = this.buildFeaturedCollection(ensureMin);
            this.cache.set('featuredGames', featured);
        }

        return limit ? featured.slice(0, limit) : featured;
    }

    /**
     * Get popular games
     */
    getPopularGames(limit = null) {
        const popular = this.cache.get('popularGames') || this.games.slice().sort((a, b) => b.plays - a.plays);
        return limit ? popular.slice(0, limit) : popular;
    }
    
    /**
     * Get newest games
     */
    getNewestGames(limit = null) {
        const newest = this.cache.get('newestGames') || this.games.slice().sort((a, b) => b.date_added - a.date_added);
        return limit ? newest.slice(0, limit) : newest;
    }
    
    /**
     * Get games by category
     */
    getGamesByCategory(category) {
        if (category === 'all' || !category) {
            return this.getAllGames();
        }

        let categoryId = parseInt(category, 10);
        let categorySlug = null;

        if (Number.isNaN(categoryId)) {
            const categoryObj = this.getCategoryBySlug(category);
            if (!categoryObj) {
                return [];
            }
            categoryId = categoryObj.id;
            categorySlug = categoryObj.slug;
        } else {
            const categoryObj = this.getCategoryById(categoryId);
            categorySlug = categoryObj ? categoryObj.slug : null;
        }

        const cacheKeys = new Set([`category_${categoryId}`]);
        if (categorySlug) {
            cacheKeys.add(`category_${categorySlug}`);
        }

        let cachedGames = null;
        for (const key of cacheKeys) {
            if (this.cache.has(key)) {
                cachedGames = this.cache.get(key);
                break;
            }
        }

        if (!cachedGames) {
            const games = this.games.filter(game => game.category === parseInt(categoryId, 10));
            cacheKeys.forEach(key => this.cache.set(key, games));
            cachedGames = games;
        }

        return cachedGames || [];
    }

    /**
     * Build featured games list with fallback when the dataset lacks enough flagged entries
     */
    buildFeaturedCollection(ensureMin = 4) {
        const seen = new Set();
        const addGame = (game, list) => {
            if (!game || seen.has(game.game_id)) return;
            seen.add(game.game_id);
            list.push(game);
        };

        const featuredCandidates = this.games
            .filter(game => game.featured)
            .sort((a, b) => {
                const ratingDiff = (b.rating || 0) - (a.rating || 0);
                if (Math.abs(ratingDiff) > 0.01) return ratingDiff;
                return (b.plays || 0) - (a.plays || 0);
            });

        const result = [];
        featuredCandidates.forEach(game => addGame(game, result));

        if (result.length < ensureMin) {
            const fallbackCandidates = this.games
                .slice()
                .sort((a, b) => {
                    const ratingDiff = (b.rating || 0) - (a.rating || 0);
                    if (Math.abs(ratingDiff) > 0.01) return ratingDiff;
                    return (b.plays || 0) - (a.plays || 0);
                });

            for (const game of fallbackCandidates) {
                addGame(game, result);
                if (result.length >= ensureMin + 12) {
                    break;
                }
            }
        }

        return result;
    }
    
    /**
     * Get game by ID
     */
    getGameById(gameId) {
        return this.games.find(game => game.game_id === parseInt(gameId));
    }
    
    /**
     * Get game by slug
     */
    getGameBySlug(slug) {
        return this.games.find(game => game.slug === slug);
    }
    
    /**
     * Get category by ID
     */
    getCategoryById(categoryId) {
        return this.categories.find(category => category.id === parseInt(categoryId));
    }
    
    /**
     * Get category by slug
     */
    getCategoryBySlug(slug) {
        return this.categories.find(category => category.slug === slug);
    }
    
    /**
     * Search games
     */
    searchGames(query, options = {}) {
        if (!query || query.trim().length < 2) {
            return [];
        }
        
        const {
            limit = 20,
            category = null,
            sortBy = 'relevance',
            includeDescription = true
        } = options;
        
        const searchTerm = query.toLowerCase().trim();
        const words = searchTerm.split(' ').filter(word => word.length > 1);
        
        let games = this.games.filter(game => {
            // Category filter
            if (category && game.category !== parseInt(category)) {
                return false;
            }
            
            // Search in name, keywords, and optionally description
            const searchText = [
                game.name,
                game.game_name,
                game.keywords,
                includeDescription ? game.description : ''
            ].join(' ').toLowerCase();
            
            // Check for exact matches first
            if (searchText.includes(searchTerm)) {
                game._searchScore = 10;
                return true;
            }
            
            // Check for word matches
            const matchedWords = words.filter(word => searchText.includes(word));
            if (matchedWords.length > 0) {
                game._searchScore = matchedWords.length * 2;
                return true;
            }
            
            return false;
        });
        
        // Sort by relevance or other criteria
        if (sortBy === 'relevance') {
            games.sort((a, b) => (b._searchScore || 0) - (a._searchScore || 0));
        } else if (sortBy === 'popularity') {
            games.sort((a, b) => b.plays - a.plays);
        } else if (sortBy === 'rating') {
            games.sort((a, b) => b.rating - a.rating);
        } else if (sortBy === 'name') {
            games.sort((a, b) => a.name.localeCompare(b.name));
        }
        
        return games.slice(0, limit);
    }
    
    /**
     * Get random games
     */
    getRandomGames(count = 10, excludeIds = []) {
        const availableGames = this.games.filter(game => !excludeIds.includes(game.game_id));
        const shuffled = [...availableGames].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
    
    /**
     * Get related games
     */
    getRelatedGames(gameId, count = 6) {
        const game = this.getGameById(gameId);
        if (!game) return [];
        
        // Get games from same category
        const sameCategory = this.getGamesByCategory(game.category)
            .filter(g => g.game_id !== gameId)
            .slice(0, count);
        
        // Fill remaining slots with random games if needed
        if (sameCategory.length < count) {
            const remaining = count - sameCategory.length;
            const random = this.getRandomGames(remaining, [gameId, ...sameCategory.map(g => g.game_id)]);
            return [...sameCategory, ...random];
        }
        
        return sameCategory;
    }
    
    /**
     * Update game statistics locally and sync to Supabase
     */
    async updateGameStats(gameId, stats) {
        const game = this.getGameById(gameId);
        if (!game) return false;
        
        // Update local stats
        if (stats.plays !== undefined) {
            game.plays = Math.max(0, game.plays + stats.plays);
        }
        
        if (stats.rating !== undefined) {
            game.rating = Math.max(0, Math.min(5, stats.rating));
        }
        
        if (stats.lastPlayed) {
            game.lastPlayed = stats.lastPlayed;
        }
        
        // Update cache
        this.updateCache();
        
        // Sync to Supabase database (async, non-blocking)
        this.syncStatsToSupabase(gameId, stats);
        
        // Emit event
        this.emit('gameStatsUpdated', { gameId, stats });
        
        return true;
    }
    
    /**
     * Sync game statistics to Supabase database
     */
    async syncStatsToSupabase(gameId, stats) {
        try {
            if (!this.supabase) {
                console.warn('Supabase client not available for stats sync');
                return;
            }

            const updates = {};

            // Prepare update data
            if (stats.plays !== undefined && stats.plays > 0) {
                // 直接使用 UPDATE 语句而不是 RPC 函数
                try {
                    // 先获取当前播放次数
                    const { data: currentData, error: fetchError } = await this.supabase
                        .from(this.dbConfig.games)
                        .select('plays')
                        .eq('game_id', gameId)
                        .single();

                    if (!fetchError && currentData) {
                        const newPlays = (parseInt(currentData.plays) || 0) + stats.plays;
                        updates.plays = newPlays.toString();
                    } else {
                        // 如果获取失败，仅增加传入的值
                        updates.plays = stats.plays.toString();
                    }
                } catch (error) {
                    console.warn('Failed to fetch current plays, using increment value:', error);
                    updates.plays = stats.plays.toString();
                }
            }

            if (stats.rating !== undefined) {
                // 直接更新评分
                updates.rating = stats.rating.toString();
            }

            // Update database if we have changes
            if (Object.keys(updates).length > 0) {
                const { error } = await this.supabase
                    .from(this.dbConfig.games)
                    .update(updates)
                    .eq('game_id', gameId);

                if (error) {
                    throw error;
                }

                console.log('Game stats synced to Supabase:', { gameId, updates });
            }

        } catch (error) {
            console.error('Failed to sync stats to Supabase:', error);

            // 即使同步失败也不要影响用户体验，只是记录错误
            console.warn('Stats sync failed, continuing without database update');

            // Store failed sync for retry later
            this.storePendingSync('stats', { gameId, stats, timestamp: Date.now() });
        }
    }
    
    /**
     * Store pending sync data for retry when online
     */
    storePendingSync(type, data) {
        try {
            const pendingKey = `minigameshub_pending_${type}`;
            const pending = JSON.parse(localStorage.getItem(pendingKey) || '[]');
            pending.push(data);
            
            // Keep only last 50 pending items per type
            if (pending.length > 50) {
                pending.splice(0, pending.length - 50);
            }
            
            localStorage.setItem(pendingKey, JSON.stringify(pending));
        } catch (error) {
            console.error('Failed to store pending sync:', error);
        }
    }
    
    /**
     * Retry pending syncs (called when connection is restored)
     */
    async retryPendingSyncs() {
        const syncTypes = ['stats', 'favorites', 'ratings'];
        
        for (const type of syncTypes) {
            try {
                const pendingKey = `minigameshub_pending_${type}`;
                const pending = JSON.parse(localStorage.getItem(pendingKey) || '[]');
                
                if (pending.length === 0) continue;
                
                console.log(`Retrying ${pending.length} pending ${type} syncs...`);
                
                const successful = [];
                
                for (const item of pending) {
                    try {
                        if (type === 'stats') {
                            await this.syncStatsToSupabase(item.gameId, item.stats);
                            successful.push(item);
                        }
                        // Add other types as needed
                        
                    } catch (itemError) {
                        console.error(`Failed to retry sync for ${type}:`, itemError);
                        // Keep failed items for next retry
                    }
                }
                
                // Remove successful syncs
                const remaining = pending.filter(item => !successful.includes(item));
                localStorage.setItem(pendingKey, JSON.stringify(remaining));
                
                if (successful.length > 0) {
                    console.log(`Successfully synced ${successful.length}/${pending.length} ${type} items`);
                }
                
            } catch (error) {
                console.error(`Failed to retry pending ${type} syncs:`, error);
            }
        }
    }
    
    /**
     * Update cache after data changes
     */
    updateCache() {
        this.cache.clear();
        this.setupCache();
    }
    
    /**
     * Get site statistics
     */
    getStats() {
        return {
            totalGames: this.games.length,
            totalCategories: this.categories.length,
            totalPlays: this.games.reduce((sum, game) => sum + game.plays, 0),
            featuredGames: this.games.filter(game => game.featured).length,
            averageRating: this.games.reduce((sum, game) => sum + game.rating, 0) / this.games.length,
            lastUpdated: this.data.stats?.lastUpdated || new Date().toISOString()
        };
    }
    
    /**
     * Event system
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }
    
    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }
    
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    /**
     * Get default categories as fallback
     */
    getDefaultCategories() {
        return [
            {
                id: 1,
                name: 'Action',
                description: 'Fast-paced action games',
                slug: 'action',
                game_count: 0
            },
            {
                id: 2,
                name: 'Puzzle',
                description: 'Brain-teasing puzzle games',
                slug: 'puzzle',
                game_count: 0
            },
            {
                id: 3,
                name: 'Adventure',
                description: 'Exciting adventure games',
                slug: 'adventure',
                game_count: 0
            },
            {
                id: 4,
                name: 'Racing',
                description: 'High-speed racing games',
                slug: 'racing',
                game_count: 0
            },
            {
                id: 5,
                name: 'Sports',
                description: 'Sports simulation games',
                slug: 'sports',
                game_count: 0
            }
        ];
    }

    /**
     * Get default games as fallback
     */
    getDefaultGames() {
        return [
            {
                game_id: 1,
                catalog_id: 1,
                game_name: 'Sample Game 1',
                name: 'Sample Game 1',
                image: '/assets/images/game-placeholder.png',
                category: 1,
                plays: 150,
                rating: 4.2,
                description: 'A fun action game to get you started',
                instructions: 'Use arrow keys to move, space to jump',
                file: 'https://html5.gamemonetize.com/0r1dkqj1oomd4f5t4l6b9pjqgvw8sfs1/',
                game_type: 'html5',
                width: 800,
                height: 600,
                date_added: new Date().toISOString(),
                published: true,
                featured: true,
                mobile: true
            },
            {
                game_id: 2,
                catalog_id: 2,
                game_name: 'Sample Game 2',
                name: 'Sample Game 2',
                image: '/assets/images/game-placeholder.png',
                category: 2,
                plays: 89,
                rating: 3.8,
                description: 'A challenging puzzle game',
                instructions: 'Click and drag to solve puzzles',
                file: 'https://html5.gamemonetize.com/3tb8hfnuewdm5zz7c9u0c0o8lqb79t6u/',
                game_type: 'html5',
                width: 800,
                height: 600,
                date_added: new Date().toISOString(),
                published: true,
                featured: false,
                mobile: true
            },
            {
                game_id: 3,
                catalog_id: 3,
                game_name: 'Sample Game 3',
                name: 'Sample Game 3',
                image: '/assets/images/game-placeholder.png',
                category: 3,
                plays: 234,
                rating: 4.5,
                description: 'An exciting adventure awaits',
                instructions: 'Explore the world and complete quests',
                file: 'https://html5.gamemonetize.com/1l0bb9r5oeq7n1c6r5a1kzb2u8g47f1i/',
                game_type: 'html5',
                width: 800,
                height: 600,
                date_added: new Date().toISOString(),
                published: true,
                featured: true,
                mobile: true
            }
        ];
    }
}

// Create global instance
window.gameDataManager = new GameDataManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameDataManager;
}
