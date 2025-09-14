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
        await this.initializeSupabase();
        await this.loadData();
        this.setupCache();
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
            if (!this.supabase) {
                throw new Error('Supabase not initialized');
            }
            
            // 并行加载游戏和分类数据
            const [gamesResult, categoriesResult] = await Promise.all([
                this.loadGamesFromDB(),
                this.loadCategoriesFromDB()
            ]);
            
            this.games = gamesResult || [];
            this.categories = categoriesResult || [];
            
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
            
            console.log(`Loaded ${this.games.length} games and ${this.categories.length} categories from Supabase`);
            
        } catch (error) {
            console.error('Error loading game data from Supabase:', error);
            this.emit('error', error);
            
            // Fallback to empty data
            this.data = { games: [], categories: [], stats: {} };
            this.games = [];
            this.categories = [];
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
        this.games = this.games.map(game => ({
            ...game,
            // Ensure required fields
            plays: game.plays || 0,
            rating: game.rating || 0,
            featured: game.featured || false,
            mobile: game.mobile !== false, // Default to true
            published: game.published !== false, // Default to true
            
            // Generate additional fields
            slug: game.slug || this.generateSlug(game.name),
            searchKeywords: this.generateSearchKeywords(game),
            categoryName: this.getCategoryName(game.category),
            
            // Add timestamps
            lastPlayed: null,
            addedToFavorites: null,
            
            // Performance metrics
            loadTime: null,
            errorCount: 0
        }));
        
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
        this.cache.set('featuredGames', this.games.filter(game => game.featured));
        this.cache.set('popularGames', this.games.slice().sort((a, b) => b.plays - a.plays));
        this.cache.set('newestGames', this.games.slice().sort((a, b) => b.date_added - a.date_added));
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
    getFeaturedGames(limit = null) {
        const featured = this.cache.get('featuredGames') || this.games.filter(game => game.featured);
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
    getGamesByCategory(categoryId) {
        if (categoryId === 'all' || !categoryId) {
            return this.getAllGames();
        }
        
        const cacheKey = `category_${categoryId}`;
        if (!this.cache.has(cacheKey)) {
            const games = this.games.filter(game => game.category === parseInt(categoryId));
            this.cache.set(cacheKey, games);
        }
        
        return this.cache.get(cacheKey) || [];
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
                // Increment plays count in database using RPC function for atomic operation
                const { error: playsError } = await this.supabase
                    .rpc('increment_game_plays', { 
                        game_id: gameId, 
                        increment_by: stats.plays 
                    });
                
                if (playsError && playsError.code !== '42883') { // Function doesn't exist
                    // Fallback to regular update
                    const { data: currentData } = await this.supabase
                        .from(this.dbConfig.games)
                        .select('plays')
                        .eq('game_id', gameId)
                        .single();
                    
                    if (currentData) {
                        updates.plays = (parseInt(currentData.plays) || 0) + stats.plays;
                    }
                }
            }
            
            if (stats.rating !== undefined) {
                // For now, directly update rating
                // TODO: Implement proper rating system with user ratings table
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
}

// Create global instance
window.gameDataManager = new GameDataManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameDataManager;
}