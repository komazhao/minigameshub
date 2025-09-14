/**
 * Game Manager
 * Handles game operations, favorites, ratings, and user interactions
 */

class GameManager {
    constructor() {
        this.favorites = new Set();
        this.playHistory = [];
        this.userRatings = new Map();
        this.currentGame = null;
        this.gameModal = null;
        this.gameIframe = null;
        
        // Storage keys
        this.STORAGE_KEYS = {
            FAVORITES: 'minigameshub_favorites',
            PLAY_HISTORY: 'minigameshub_play_history',
            USER_RATINGS: 'minigameshub_user_ratings',
            USER_PREFERENCES: 'minigameshub_preferences'
        };
        
        // Initialize
        this.init();
    }
    
    init() {
        this.loadUserData();
        this.setupEventListeners();
        this.initializeModal();
    }
    
    /**
     * Load user data from localStorage
     */
    loadUserData() {
        try {
            // Load favorites
            const favoritesData = localStorage.getItem(this.STORAGE_KEYS.FAVORITES);
            if (favoritesData) {
                this.favorites = new Set(JSON.parse(favoritesData));
            }
            
            // Load play history
            const historyData = localStorage.getItem(this.STORAGE_KEYS.PLAY_HISTORY);
            if (historyData) {
                this.playHistory = JSON.parse(historyData);
            }
            
            // Load user ratings
            const ratingsData = localStorage.getItem(this.STORAGE_KEYS.USER_RATINGS);
            if (ratingsData) {
                this.userRatings = new Map(JSON.parse(ratingsData));
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }
    
    /**
     * Save user data to localStorage
     */
    saveUserData() {
        try {
            localStorage.setItem(this.STORAGE_KEYS.FAVORITES, JSON.stringify([...this.favorites]));
            localStorage.setItem(this.STORAGE_KEYS.PLAY_HISTORY, JSON.stringify(this.playHistory));
            localStorage.setItem(this.STORAGE_KEYS.USER_RATINGS, JSON.stringify([...this.userRatings]));
        } catch (error) {
            console.error('Error saving user data:', error);
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for game data manager events
        if (window.gameDataManager) {
            window.gameDataManager.on('loaded', () => {
                this.updateFavoritesUI();
            });
        }
        
        // Window events
        window.addEventListener('beforeunload', () => {
            this.saveUserData();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }
    
    /**
     * Initialize game modal
     */
    initializeModal() {
        this.gameModal = document.getElementById('game-modal');
        this.gameIframe = document.getElementById('game-iframe');
        
        if (!this.gameModal || !this.gameIframe) return;
        
        // Modal close events
        const closeBtn = document.getElementById('modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeGame());
        }
        
        // Click outside to close
        this.gameModal.addEventListener('click', (e) => {
            if (e.target === this.gameModal) {
                this.closeGame();
            }
        });
        
        // Favorite button
        const favoriteBtn = document.getElementById('modal-favorite');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', () => {
                if (this.currentGame) {
                    this.toggleFavorite(this.currentGame.game_id);
                }
            });
        }
        
        // Fullscreen button
        const fullscreenBtn = document.getElementById('modal-fullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
        
        // Play/Pause buttons
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        
        if (playBtn) {
            playBtn.addEventListener('click', () => this.playGame());
        }
        
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pauseGame());
        }
    }
    
    /**
     * Play a game
     */
    async playGame(gameId) {
        if (!window.gameDataManager || !window.gameDataManager.loaded) {
            console.error('Game data not loaded yet');
            return;
        }
        
        const game = typeof gameId === 'object' ? gameId : window.gameDataManager.getGameById(gameId);
        if (!game) {
            console.error('Game not found:', gameId);
            return;
        }
        
        this.currentGame = game;
        
        // Update play count
        this.recordGamePlay(game.game_id);
        
        // Update modal
        this.updateGameModal(game);
        
        // Show modal
        this.showGameModal();
        
        // Load game in iframe
        this.loadGameInIframe(game);
        
        // Update SEO for game page
        this.updatePageSEO(game);
    }
    
    /**
     * Update game modal with game info
     */
    updateGameModal(game) {
        // Update title
        const titleElement = document.getElementById('modal-game-title');
        if (titleElement) {
            titleElement.textContent = game.name;
        }
        
        // Update description
        const descElement = document.getElementById('modal-description');
        if (descElement) {
            descElement.textContent = game.description;
        }
        
        // Update instructions
        const instructionsElement = document.getElementById('modal-instructions');
        if (instructionsElement) {
            instructionsElement.textContent = game.instructions;
        }
        
        // Update rating
        const ratingElement = document.getElementById('modal-rating');
        if (ratingElement) {
            ratingElement.innerHTML = this.generateStarRating(game.rating);
        }
        
        // Update plays count
        const playsElement = document.getElementById('modal-plays');
        if (playsElement) {
            playsElement.textContent = `${game.plays} plays`;
        }
        
        // Update favorite button
        const favoriteBtn = document.getElementById('modal-favorite');
        if (favoriteBtn) {
            const isFavorite = this.isFavorite(game.game_id);
            favoriteBtn.classList.toggle('active', isFavorite);
            favoriteBtn.setAttribute('aria-pressed', isFavorite.toString());
        }
    }
    
    /**
     * Load game in iframe
     */
    loadGameInIframe(game) {
        if (!this.gameIframe) return;
        
        // Show loading state
        this.gameIframe.style.opacity = '0.5';
        
        // Set iframe attributes
        this.gameIframe.src = game.file;
        this.gameIframe.width = game.width || 800;
        this.gameIframe.height = game.height || 600;
        
        // Handle iframe load
        this.gameIframe.onload = () => {
            this.gameIframe.style.opacity = '1';
            this.onGameLoaded(game);
        };
        
        // Handle iframe error
        this.gameIframe.onerror = () => {
            this.onGameLoadError(game);
        };
    }
    
    /**
     * Handle game loaded
     */
    onGameLoaded(game) {
        // Update game stats
        if (window.gameDataManager) {
            window.gameDataManager.updateGameStats(game.game_id, { lastPlayed: Date.now() });
        }
        
        // Show play controls
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        
        if (playBtn) playBtn.style.display = 'none';
        if (pauseBtn) pauseBtn.style.display = 'inline-block';
    }
    
    /**
     * Handle game load error
     */
    onGameLoadError(game) {
        console.error('Failed to load game:', game.name);
        
        // Show error message
        if (this.gameIframe) {
            this.gameIframe.srcdoc = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #666;">
                    <div style="text-align: center;">
                        <h3>Game temporarily unavailable</h3>
                        <p>We're working to restore access to this game.</p>
                        <button onclick="window.parent.location.reload()" style="padding: 8px 16px; background: #007AFF; color: white; border: none; border-radius: 6px; cursor: pointer;">Try Again</button>
                    </div>
                </div>
            `;
        }
        
        // Update game error count
        if (window.gameDataManager) {
            const gameData = window.gameDataManager.getGameById(game.game_id);
            if (gameData) {
                gameData.errorCount = (gameData.errorCount || 0) + 1;
            }
        }
    }
    
    /**
     * Show game modal
     */
    showGameModal() {
        if (this.gameModal) {
            this.gameModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Focus management
            this.gameModal.focus();
        }
    }
    
    /**
     * Close game modal
     */
    closeGame() {
        if (this.gameModal) {
            this.gameModal.classList.remove('active');
            document.body.style.overflow = '';
            
            // Clear iframe
            if (this.gameIframe) {
                this.gameIframe.src = '';
            }
            
            // Clear current game
            this.currentGame = null;
            
            // Reset page SEO
            this.resetPageSEO();
        }
    }
    
    /**
     * Toggle fullscreen
     */
    toggleFullscreen() {
        if (!this.gameModal) return;
        
        if (!document.fullscreenElement) {
            this.gameModal.requestFullscreen().catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }
    
    /**
     * Pause game
     */
    pauseGame() {
        // This is a placeholder - actual implementation depends on the games
        // Most HTML5 games don't support pause from parent window
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        
        if (playBtn) playBtn.style.display = 'inline-block';
        if (pauseBtn) pauseBtn.style.display = 'none';
    }
    
    /**
     * Resume/play game
     */
    resumeGame() {
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        
        if (playBtn) playBtn.style.display = 'none';
        if (pauseBtn) pauseBtn.style.display = 'inline-block';
    }
    
    /**
     * Toggle favorite status
     */
    toggleFavorite(gameId) {
        if (this.isFavorite(gameId)) {
            this.removeFavorite(gameId);
        } else {
            this.addFavorite(gameId);
        }
        
        this.updateFavoritesUI();
        this.saveUserData();
    }
    
    /**
     * Add game to favorites
     */
    addFavorite(gameId) {
        this.favorites.add(gameId);
        
        // Update game data if available
        if (window.gameDataManager) {
            const game = window.gameDataManager.getGameById(gameId);
            if (game) {
                game.addedToFavorites = Date.now();
            }
        }
        
        // Dispatch event
        this.dispatchEvent('favoriteAdded', { gameId });
    }
    
    /**
     * Remove game from favorites
     */
    removeFavorite(gameId) {
        this.favorites.delete(gameId);
        
        // Update game data if available
        if (window.gameDataManager) {
            const game = window.gameDataManager.getGameById(gameId);
            if (game) {
                game.addedToFavorites = null;
            }
        }
        
        // Dispatch event
        this.dispatchEvent('favoriteRemoved', { gameId });
    }
    
    /**
     * Check if game is favorite
     */
    isFavorite(gameId) {
        return this.favorites.has(gameId);
    }
    
    /**
     * Get favorite games
     */
    getFavoriteGames() {
        if (!window.gameDataManager) return [];

        return [...this.favorites]
            .map(gameId => window.gameDataManager.getGameById(gameId))
            .filter(Boolean)
            .sort((a, b) => (b.addedToFavorites || 0) - (a.addedToFavorites || 0));
    }

    /**
     * Get favorite game IDs (for backward compatibility)
     */
    getFavorites() {
        return Array.from(this.favorites);
    }
    
    /**
     * Record game play
     */
    recordGamePlay(gameId) {
        const timestamp = Date.now();
        
        // Add to play history
        this.playHistory.unshift({
            gameId,
            timestamp,
            date: new Date().toISOString().split('T')[0]
        });
        
        // Keep only last 100 plays
        if (this.playHistory.length > 100) {
            this.playHistory = this.playHistory.slice(0, 100);
        }
        
        // Update game play count
        if (window.gameDataManager) {
            window.gameDataManager.updateGameStats(gameId, { plays: 1 });
        }
        
        // Save data
        this.saveUserData();
        
        // Dispatch event
        this.dispatchEvent('gamePlayed', { gameId, timestamp });
    }
    
    /**
     * Rate a game
     */
    rateGame(gameId, rating) {
        if (rating < 0 || rating > 5) return;
        
        this.userRatings.set(gameId, {
            rating,
            timestamp: Date.now()
        });
        
        // Update game rating (could implement more sophisticated averaging)
        if (window.gameDataManager) {
            window.gameDataManager.updateGameStats(gameId, { rating });
        }
        
        this.saveUserData();
        this.dispatchEvent('gameRated', { gameId, rating });
    }
    
    /**
     * Get recently played games
     */
    getRecentlyPlayed(limit = 10) {
        if (!window.gameDataManager) return [];
        
        const recentGameIds = [...new Set(this.playHistory.map(entry => entry.gameId))]
            .slice(0, limit);
            
        return recentGameIds
            .map(gameId => window.gameDataManager.getGameById(gameId))
            .filter(Boolean);
    }
    
    /**
     * Update favorites UI
     */
    updateFavoritesUI() {
        const favoritesCount = document.getElementById('favorites-count');
        if (favoritesCount) {
            favoritesCount.textContent = this.favorites.size.toString();
        }
        
        // Update favorite buttons
        document.querySelectorAll('.game-favorite, .modal-favorite').forEach(btn => {
            const gameId = parseInt(btn.dataset.gameId);
            if (gameId && this.isFavorite(gameId)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    /**
     * Generate star rating HTML
     */
    generateStarRating(rating, interactive = false) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let html = '';
        
        // Full stars
        for (let i = 0; i < fullStars; i++) {
            html += '<svg class="star" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
        }
        
        // Half star
        if (hasHalfStar) {
            html += '<svg class="star" width="14" height="14" viewBox="0 0 24 24"><defs><clipPath id="half"><rect x="0" y="0" width="12" height="24"/></clipPath></defs><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" clip-path="url(#half)"/><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke="currentColor" stroke-width="1"/></svg>';
        }
        
        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            html += '<svg class="star" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
        }
        
        return html;
    }
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        if (this.gameModal && this.gameModal.classList.contains('active')) {
            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    this.closeGame();
                    break;
                case 'f':
                case 'F':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.toggleFullscreen();
                    }
                    break;
                case ' ':
                    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        // Toggle play/pause if implemented
                    }
                    break;
            }
        }
    }
    
    /**
     * Update page SEO for current game
     */
    updatePageSEO(game) {
        // Update title
        document.title = `${game.name} - Play Free Online | MiniGamesHub.co`;
        
        // Update meta description
        let metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.content = `Play ${game.name} online for free! ${game.description.substring(0, 100)}...`;
        }
        
        // Update canonical URL
        let canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) {
            canonical.href = `https://minigameshub.co/games/${game.slug}`;
        }
        
        // Update structured data
        this.updateGameStructuredData(game);
    }
    
    /**
     * Reset page SEO
     */
    resetPageSEO() {
        document.title = 'Best Free Online Mini Games Hub - Play Fun Games Online | MiniGamesHub.co';
        
        let metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.content = 'Play thousands of free online mini games including action, puzzle, racing, sports, and arcade games. The ultimate gaming destination for fun browser games - no downloads required!';
        }
        
        let canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) {
            canonical.href = 'https://minigameshub.co/';
        }
    }
    
    /**
     * Update game structured data
     */
    updateGameStructuredData(game) {
        const structuredData = {
            "@context": "https://schema.org",
            "@type": "Game",
            "name": game.name,
            "description": game.description,
            "url": `https://minigameshub.co/games/${game.slug}`,
            "image": game.image,
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": game.rating,
                "ratingCount": Math.max(1, game.plays),
                "bestRating": 5,
                "worstRating": 1
            },
            "genre": window.gameDataManager ? window.gameDataManager.getCategoryById(game.category)?.name : "Game",
            "playMode": "SinglePlayer",
            "accessibilityFeature": "textOnlyContent",
            "accessibilityHazard": "none",
            "interactionType": "browser"
        };
        
        let script = document.getElementById('game-structured-data');
        if (!script) {
            script = document.createElement('script');
            script.id = 'game-structured-data';
            script.type = 'application/ld+json';
            document.head.appendChild(script);
        }
        
        script.textContent = JSON.stringify(structuredData);
    }
    
    /**
     * Dispatch custom event
     */
    dispatchEvent(eventType, data) {
        window.dispatchEvent(new CustomEvent(`gameManager:${eventType}`, {
            detail: data
        }));
    }
    
    /**
     * Get user statistics
     */
    getUserStats() {
        return {
            favoritesCount: this.favorites.size,
            gamesPlayed: new Set(this.playHistory.map(entry => entry.gameId)).size,
            totalPlayTime: this.playHistory.length, // Approximation
            ratingsGiven: this.userRatings.size,
            lastActive: this.playHistory[0]?.timestamp || null
        };
    }
}

// Create global instance
window.gameManager = new GameManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameManager;
}