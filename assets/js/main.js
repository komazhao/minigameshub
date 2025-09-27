/**
 * 文件编码: UTF-8
 * MiniGamesHub.co 主应用程序逻辑
 * 处理用户界面交互、页面生成和应用初始化
 */

class MiniGamesHubApp {
    constructor() {
        this.currentCategory = 'all';
        this.currentSort = 'featured';
        this.currentView = 'grid';
        this.loadedGames = 0;
        this.gamesPerPage = 12;
        this.searchQuery = '';
        
        // DOM 元素缓存
        this.elements = {};
        
        // 在 DOM 准备就绪时初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    /**
     * 初始化应用程序
     */
    async init() {
        console.log('MiniGamesHubApp initializing...');

        this.initializeElements();
        this.setupEventListeners();
        this.showLoadingScreen();

        // 等待游戏数据加载
        if (window.gameDataManager) {
            if (window.gameDataManager.loaded) {
                console.log('Game data already loaded');
                this.onDataLoaded();
            } else {
                console.log('Waiting for game data to load...');

                // 设置超时机制
                const timeout = setTimeout(() => {
                    console.log('Data load timeout, forcing default data...');
                    if (window.gameDataManager && !window.gameDataManager.loaded) {
                        console.log('Forcing default data load...');
                        if (typeof window.gameDataManager.useDefaultData === 'function') {
                            window.gameDataManager.useDefaultData();
                        }
                    }
                }, 8000); // 8s timeout

                window.gameDataManager.on('loaded', () => {
                    clearTimeout(timeout);
                    console.log('Game data loaded event received');
                    this.onDataLoaded();
                });

                window.gameDataManager.on('error', (error) => {
                    clearTimeout(timeout);
                    console.log('Game data error event:', error);
                    this.onDataLoadError(error);
                });
            }
        } else {
            console.log('gameDataManager not ready, retrying...');
            setTimeout(() => this.init(), 100); // Retry if not ready
        }
    }
    
    /**
     * 初始化 DOM 元素引用
     */
    initializeElements() {
        this.elements = {
            loadingScreen: document.getElementById('loading-screen'),
            searchContainer: document.getElementById('search-container'),
            searchInput: document.getElementById('search-input'),
            searchButton: document.getElementById('search-btn'),
            searchToggle: document.getElementById('search-toggle'),
            searchSuggestions: document.getElementById('search-suggestions'),
            categoriesDropdown: document.getElementById('categories-dropdown'),
            footerCategories: document.getElementById('footer-categories'),
            gamesGrid: document.getElementById('games-grid'),
            featuredGames: document.getElementById('featured-games'),
            categoriesGrid: document.getElementById('categories-grid'),
            categoriesFilter: document.querySelector('.categories-filter'),
            gamesSectionTitle: document.getElementById('games-section-title'),
            sortSelect: document.getElementById('sort-select'),
            viewToggle: document.querySelector('.view-toggle'),
            loadMoreBtn: document.getElementById('load-more-btn'),
            navToggle: document.getElementById('nav-toggle'),
            navMenu: document.getElementById('nav-menu'),
            favoritesToggle: document.getElementById('favorites-toggle'),
            favoritesCount: document.getElementById('favorites-count'),
            totalGames: document.getElementById('total-games'),
            totalCategories: document.getElementById('total-categories'),
            totalPlays: document.getElementById('total-plays'),
            gameModal: document.getElementById('game-modal'),
            modalClose: document.getElementById('modal-close'),
            modalGameTitle: document.getElementById('modal-game-title'),
            gameIframe: document.getElementById('game-iframe')
        };
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 搜索功能
        if (this.elements.searchToggle) {
            this.elements.searchToggle.addEventListener('click', () => this.toggleSearch());
        }
        
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
            this.elements.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.closeSearch();
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch();
                }
            });
        }

        if (this.elements.searchButton) {
            this.elements.searchButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.performSearch();
            });
        }
        
        // 分类筛选
        if (this.elements.categoriesFilter) {
            this.elements.categoriesFilter.addEventListener('click', (e) => {
                if (e.target.classList.contains('category-btn')) {
                    this.handleCategoryFilter(e.target.dataset.category);
                }
            });
        }
        
        // 排序选择
        if (this.elements.sortSelect) {
            this.elements.sortSelect.addEventListener('change', (e) => {
                this.handleSortChange(e.target.value);
            });
        }
        
        // 视图切换
        if (this.elements.viewToggle) {
            this.elements.viewToggle.addEventListener('click', (e) => {
                if (e.target.classList.contains('view-btn')) {
                    this.handleViewChange(e.target.dataset.view);
                }
            });
        }
        
        // 加载更多按钮
        if (this.elements.loadMoreBtn) {
            this.elements.loadMoreBtn.addEventListener('click', () => this.loadMoreGames());
        }
        
        // 移动端导航
        if (this.elements.navToggle) {
            this.elements.navToggle.addEventListener('click', () => this.toggleNavigation());
        }
        
        // 收藏功能
        if (this.elements.favoritesToggle) {
            this.elements.favoritesToggle.addEventListener('click', () => this.toggleFavorites());
        }
        
        // 游戏卡片点击事件（事件委托）
        document.addEventListener('click', (e) => {
            const gameCard = e.target.closest('.game-card');
            if (gameCard) {
                console.log('Game card clicked:', gameCard);
                const gameId = gameCard.dataset.gameId;
                console.log('Game ID from dataset:', gameId);
                if (gameId) {
                    this.openGameModal(parseInt(gameId));
                } else {
                    console.error('No game ID found on clicked card');
                }
                return;
            }

            // 收藏按钮点击
            const favoriteBtn = e.target.closest('.favorite-btn');
            if (favoriteBtn) {
                e.stopPropagation();
                const gameId = favoriteBtn.dataset.gameId;
                if (gameId) {
                    this.toggleGameFavorite(parseInt(gameId));
                }
                return;
            }
        });
        
        // 模态框关闭
        if (this.elements.modalClose) {
            this.elements.modalClose.addEventListener('click', () => this.closeGameModal());
        }
        
        if (this.elements.gameModal) {
            this.elements.gameModal.addEventListener('click', (e) => {
                if (e.target === this.elements.gameModal) {
                    this.closeGameModal();
                }
            });
        }
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeGameModal();
                this.closeSearch();
            }
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                this.openSearch();
            }
        });
        
        // 窗口大小变化时的响应式处理
        window.addEventListener('resize', () => this.handleResize());
    }
    
    /**
     * 数据加载完成时的处理
     */
    onDataLoaded() {
        // 安全地检查和调用方法
        try {
            this.hideLoadingScreen();
            this.populateCategories();
            // 若存在 URL 查询参数 q，预填充搜索并应用过滤
            try {
                const params = new URLSearchParams(window.location.search || '');
                const q = (params.get('q') || '').trim();
                if (q && this.elements.searchInput) {
                    this.openSearch();
                    this.elements.searchInput.value = q;
                    this.searchQuery = q;
                }
            } catch {}
            this.populateFeaturedGames();
            this.populateGames();
            this.updateSiteStats();
            this.updateFavoritesCount();

            // Handle /random route: redirect to a random game detail page
            try {
                const path = (window.location && window.location.pathname || '').replace(/\/+$/, '');
                if (path === '/random' && window.gameDataManager) {
                    const pick = window.gameDataManager.getRandomGames(1);
                    if (pick && pick.length) {
                        const game = pick[0];
                        const slug = game.slug || (window.gameDataManager.generateSlug ? window.gameDataManager.generateSlug(game.name || 'game') : 'game');
                        if (slug) {
                            window.location.replace(`/games/${slug}`);
                            return;
                        }
                    }
                }
            } catch (e) {
                // no-op for random redirect
            }

            console.log('MiniGamesHub app initialized');
        } catch (error) {
            console.warn('onDataLoaded error (possibly missing DOM elements):', error);
        }
    }
    
    /**
     * 数据加载错误处理
     */
    onDataLoadError(error) {
        console.error('Data load error:', error);
        this.hideLoadingScreen();
        this.showErrorMessage('Game data failed to load. Please refresh and try again');
    }
    
    /**
     * 显示加载屏幕
     */
    showLoadingScreen() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.display = 'flex';
        }
    }
    
    /**
     * 隐藏加载屏幕
     */
    hideLoadingScreen() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.elements.loadingScreen.style.display = 'none';
            }, 300);
        }
    }
    
    /**
     * 显示错误消息
     */
    showErrorMessage(message) {
        // 创建错误提示元素
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <h2>Load Error</h2>
                <p>${message}</p>
                <button onclick="location.reload()" class="retry-btn">Retry</button>
            </div>
        `;
        
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.innerHTML = '';
            this.elements.loadingScreen.appendChild(errorDiv);
            this.elements.loadingScreen.style.display = 'flex';
        }
    }
    
    /**
     * 填充分类数据
     */
    populateCategories() {
        // 安全检查：确保elements已初始化
        if (!this.elements) {
            console.warn('Elements not initialized, skipping populateCategories');
            return;
        }

        const categories = window.gameDataManager.getAllCategories();

        // 填充导航栏下拉菜单
        if (this.elements.categoriesDropdown && categories.length > 0) {
            this.elements.categoriesDropdown.innerHTML = categories.map(category => `
                <li>
                    <a href="/collections/category/${category.slug}" class="dropdown-link" data-category="${category.id}" data-local-href="/collection.html?category=${category.slug}">
                        ${category.name}
                    </a>
                </li>
            `).join('');
        }

        // 填充分类筛选按钮
        if (this.elements.categoriesFilter) {
            const categoryButtons = categories.map(category => `
                <button class="category-btn" data-category="${category.id}">
                    ${category.name} (${category.game_count || 0})
                </button>
            `).join('');

            this.elements.categoriesFilter.innerHTML = `
                <button class="category-btn active" data-category="all">All Games</button>
                ${categoryButtons}
            `;
        }

        // 填充页脚分类链接
        if (this.elements.footerCategories) {
            this.elements.footerCategories.innerHTML = categories.map(category => `
                <li><a href="/collections/category/${category.slug}" data-category="${category.id}" data-local-href="/collection.html?category=${category.slug}">${category.name}</a></li>
            `).join('');
        }

        // 填充分类网格
        if (this.elements.categoriesGrid) {
            this.elements.categoriesGrid.innerHTML = categories.map(category => `
                <a class="category-card" data-category="${category.id}" href="/collections/category/${category.slug}" data-local-href="/collection.html?category=${category.slug}">
                    <div class="category-icon">🎮</div>
                    <h3>${category.name}</h3>
                    <p>${category.description || ''}</p>
                    <div class="category-stats">
                        <span>${category.game_count || 0} games</span>
                    </div>
                </a>
            `).join('');
        }
    }
    
    /**
     * 填充特色游戏
     */
    populateFeaturedGames() {
        // 安全检查
        if (!this.elements || !this.elements.featuredGames) {
            console.warn('Featured games element not found, skipping populateFeaturedGames');
            return;
        }

        const featuredGames = window.gameDataManager.getFeaturedGames(8);

        this.elements.featuredGames.innerHTML = featuredGames.map(game =>
            this.createGameCard(game)
        ).join('');
    }
    
    /**
     * 填充游戏列表
     */
    populateGames() {
        this.loadedGames = 0;
        this.loadMoreGames();
    }
    
    /**
     * 创建游戏卡片 HTML
     */
    createGameCard(game) {
        const isFavorite = window.gameManager && window.gameManager.isFavorite(game.game_id);
        
        return `
            <div class="game-card" data-game-id="${game.game_id}">
                <div class="game-image">
                    <img src="${game.image || '/assets/images/game-placeholder.png'}" 
                         alt="${game.name}" 
                         loading="lazy" width="512" height="384">
                    <div class="game-overlay">
                        <button class="play-btn">▶ Play</button>
                    </div>
                    ${game.featured ? '<div class="featured-badge">Featured</div>' : ''}
                </div>
                <div class="game-info">
                    <h3 class="game-title">${game.name}</h3>
                    <div class="game-meta">
                        <div class="game-rating">
                            ${this.createStarRating(game.rating || 0)}
                        </div>
                        <div class="game-stats">
                            <span class="plays">${this.formatNumber(game.plays || 0)} plays</span>
                        </div>
                    </div>
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                            data-game-id="${game.game_id}"
                            title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                        ♥
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * 创建星级评分 HTML
     */
    createStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let stars = '';
        
        // 实心星星
        for (let i = 0; i < fullStars; i++) {
            stars += '<span class="star filled">★</span>';
        }
        
        // 半星
        if (hasHalfStar) {
            stars += '<span class="star half">☆</span>';
        }
        
        // 空星星
        for (let i = 0; i < emptyStars; i++) {
            stars += '<span class="star empty">☆</span>';
        }
        
        return `<div class="stars">${stars}</div>`;
    }
    
    /**
     * 格式化数字（如播放次数）
     */
    formatNumber(num) {
        if (!num || isNaN(num)) return '0';
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * 显示错误消息（非弹窗）
     */
    showErrorMessage(message) {
        console.error(message);

        // 创建错误消息元素
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        errorDiv.textContent = message;

        document.body.appendChild(errorDiv);

        // 3秒后自动移除
        setTimeout(() => {
            errorDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    document.body.removeChild(errorDiv);
                }
            }, 300);
        }, 3000);
    }

    /**
     * 显示加载指示器
     */
    showLoadingIndicator(iframe) {
        const container = iframe.parentElement;

        // 移除已存在的加载器
        const existingLoader = container.querySelector('.game-loader');
        if (existingLoader) {
            container.removeChild(existingLoader);
        }

        // 创建加载指示器
        const loader = document.createElement('div');
        loader.className = 'game-loader';
        loader.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 100;
            text-align: center;
        `;
        loader.innerHTML = `
            <div style="
                width: 60px;
                height: 60px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #007AFF;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            "></div>
            <div style="color: white; font-size: 16px;">Loading game...</div>
        `;

        container.appendChild(loader);
        iframe.style.opacity = '0.3';
    }

    /**
     * 隐藏加载指示器
     */
    hideLoadingIndicator(iframe) {
        const container = iframe.parentElement;
        const loader = container.querySelector('.game-loader');
        if (loader) {
            container.removeChild(loader);
        }
        iframe.style.opacity = '1';
    }

    /**
     * 生成星级评分
     */
    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let starsHTML = '';

        // 满星
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<span style="color: #FFD700;">★</span>';
        }

        // 半星
        if (hasHalfStar) {
            starsHTML += '<span style="color: #FFD700;">☆</span>';
        }

        // 空星
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '<span style="color: #ccc;">☆</span>';
        }

        return starsHTML + ` <span style="color: #666; font-size: 0.9em;">(${rating.toFixed(1)})</span>`;
    }

    /**
     * 加载更多游戏
     */
    loadMoreGames() {
        // 安全检查
        if (!this.elements || !this.elements.gamesGrid) {
            console.warn('Games grid element not found, skipping loadMoreGames');
            return;
        }

        let games;

        if (this.searchQuery) {
            const allMatches = window.gameDataManager.searchGames(this.searchQuery, {
                category: this.currentCategory === 'all' ? null : this.currentCategory,
                includeDescription: true,
                limit: 999999
            });
            const sorted = this.sortListByCurrent(allMatches);
            games = sorted.slice(this.loadedGames, this.loadedGames + this.gamesPerPage);
        } else if (this.currentCategory === 'all') {
            games = this.getSortedGames().slice(this.loadedGames, this.loadedGames + this.gamesPerPage);
        } else {
            games = this.getSortedGames()
                .filter(game => game.category === parseInt(this.currentCategory))
                .slice(this.loadedGames, this.loadedGames + this.gamesPerPage);
        }

        if (games.length > 0) {
            const gameCards = games.map(game => this.createGameCard(game)).join('');

            if (this.loadedGames === 0) {
                this.elements.gamesGrid.innerHTML = gameCards;
            } else {
                this.elements.gamesGrid.insertAdjacentHTML('beforeend', gameCards);
            }

            this.loadedGames += games.length;

            // 更新加载更多按钮状态
            if (this.elements.loadMoreBtn) {
                const hasMoreGames = this.getTotalAvailableGames() > this.loadedGames;
                this.elements.loadMoreBtn.style.display = hasMoreGames ? 'block' : 'none';
            }
        } else if (this.loadedGames === 0) {
            this.elements.gamesGrid.innerHTML = `
                <div class="no-games-message">
                    <h3>No games found</h3>
                    <p>Try adjusting your search or choose another category</p>
                </div>
            `;
        }
    }
    
    /**
     * 获取排序后的游戏列表
     */
    getSortedGames() {
        const allGames = window.gameDataManager.getAllGames();
        
        switch (this.currentSort) {
            case 'popular':
                return window.gameDataManager.getPopularGames();
            case 'newest':
                return window.gameDataManager.getNewestGames();
            case 'rating':
                return allGames.slice().sort((a, b) => b.rating - a.rating);
            case 'name':
                return allGames.slice().sort((a, b) => a.name.localeCompare(b.name));
            case 'featured':
            default:
                return allGames.slice().sort((a, b) => {
                    if (a.featured && !b.featured) return -1;
                    if (!a.featured && b.featured) return 1;
                    return b.rating - a.rating;
                });
        }
    }
    
    /**
     * 获取当前条件下的总游戏数
     */
    getTotalAvailableGames() {
        if (this.searchQuery) {
            return window.gameDataManager.searchGames(this.searchQuery, {
                category: this.currentCategory === 'all' ? null : this.currentCategory,
                limit: 999999
            }).length;
        } else if (this.currentCategory === 'all') {
            return window.gameDataManager.getAllGames().length;
        } else {
            return window.gameDataManager.getGamesByCategory(parseInt(this.currentCategory)).length;
        }
    }

    /**
     * 将给定游戏列表按当前排序规则排序
     */
    sortListByCurrent(list) {
        const arr = [...(list || [])];
        switch (this.currentSort) {
            case 'popular':
                return arr.sort((a, b) => (b.plays || 0) - (a.plays || 0));
            case 'newest':
                return arr.sort((a, b) => {
                    const timeA = new Date(a.date_added || 0).getTime();
                    const timeB = new Date(b.date_added || 0).getTime();
                    return timeB - timeA;
                });
            case 'rating':
                return arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            case 'name':
                return arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            case 'featured':
            default:
                return arr.sort((a, b) => {
                    if (a.featured && !b.featured) return -1;
                    if (!a.featured && b.featured) return 1;
                    const ratingDiff = (b.rating || 0) - (a.rating || 0);
                    if (Math.abs(ratingDiff) > 0.01) return ratingDiff;
                    return (b.plays || 0) - (a.plays || 0);
                });
        }
    }
    
    /**
     * 更新网站统计信息
     */
    updateSiteStats() {
        // 安全检查
        if (!this.elements) {
            console.warn('Elements not initialized, skipping updateSiteStats');
            return;
        }

        const stats = window.gameDataManager.getStats();

        if (this.elements.totalGames) {
            this.animateNumber(this.elements.totalGames, stats.totalGames);
        }

        if (this.elements.totalCategories) {
            this.animateNumber(this.elements.totalCategories, stats.totalCategories);
        }

        if (this.elements.totalPlays) {
            this.animateNumber(this.elements.totalPlays, stats.totalPlays);
        }
    }
    
    /**
     * 数字动画效果
     */
    animateNumber(element, targetNumber) {
        const startNumber = 0;
        const duration = 2000; // 2秒动画
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            
            // 缓动函数（ease-out）
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentNumber = Math.floor(startNumber + (targetNumber - startNumber) * easeOut);
            
            element.textContent = this.formatNumber(currentNumber);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    /**
     * 处理分类筛选
     */
    handleCategoryFilter(category) {
        this.currentCategory = category;
        this.loadedGames = 0;
        
        // 更新分类按钮状态
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        
        // 更新页面标题
        if (this.elements.gamesSectionTitle) {
            const categoryName = category === 'all' ? 'All Games' : 
                window.gameDataManager.getCategoryById(parseInt(category))?.name || 'Games';
            this.elements.gamesSectionTitle.textContent = categoryName;
        }
        
        // 重新加载游戏
        this.loadMoreGames();
    }
    
    /**
     * 处理排序变化
     */
    handleSortChange(sortValue) {
        this.currentSort = sortValue;
        this.loadedGames = 0;
        this.loadMoreGames();
    }
    
    /**
     * 处理视图切换
     */
    handleViewChange(viewType) {
        this.currentView = viewType;
        
        // 更新视图按钮状态
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewType);
        });
        
        // 更新网格样式
        if (this.elements.gamesGrid) {
            this.elements.gamesGrid.className = `games-grid ${viewType}-view`;
        }
    }
    
    /**
     * 切换搜索框显示状态
     */
    toggleSearch() {
        if (this.elements.searchContainer) {
            const isVisible = this.elements.searchContainer.classList.contains('active');
            if (isVisible) {
                this.closeSearch();
            } else {
                this.openSearch();
            }
        }
    }
    
    /**
     * 打开搜索框
     */
    openSearch() {
        if (this.elements.searchContainer) {
            this.elements.searchContainer.classList.add('active');
            if (this.elements.searchInput) {
                setTimeout(() => this.elements.searchInput.focus(), 100);
            }
        }
    }
    
    /**
     * 关闭搜索框
     */
    closeSearch() {
        if (this.elements.searchContainer) {
            this.elements.searchContainer.classList.remove('active');
            if (this.elements.searchInput) {
                this.elements.searchInput.blur();
            }
            if (this.elements.searchSuggestions) {
                this.elements.searchSuggestions.innerHTML = '';
            }
        }
    }
    
    /**
     * 处理搜索输入
     */
    handleSearch(query) {
        this.searchQuery = query.trim();
        
        if (this.searchQuery.length >= 2) {
            this.showSearchSuggestions();
            this.loadedGames = 0;
            this.loadMoreGames();
        } else if (this.searchQuery.length === 0) {
            this.hideSearchSuggestions();
            this.loadedGames = 0;
            this.loadMoreGames();
        }
    }

    /**
     * 执行搜索（点击按钮或按回车）
     */
    performSearch() {
        if (!this.elements || !this.elements.searchInput) return;
        const q = (this.elements.searchInput.value || '').trim();
        if (!q) return;
        this.searchQuery = q;
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('q', q);
            window.history.replaceState({}, '', url.toString());
        } catch {}
        this.loadedGames = 0;
        this.hideSearchSuggestions();
        this.loadMoreGames();
    }
    
    /**
     * 显示搜索建议
     */
    showSearchSuggestions() {
        const suggestions = window.gameDataManager.searchGames(this.searchQuery, { limit: 5 });
        
        if (this.elements.searchSuggestions && suggestions.length > 0) {
            this.elements.searchSuggestions.innerHTML = suggestions.map(game => `
                <div class="suggestion-item" data-game-id="${game.game_id}">
                    <img src="${game.image}" alt="${game.name}" class="suggestion-image" width="64" height="48">
                    <div class="suggestion-info">
                        <div class="suggestion-name">${game.name}</div>
                        <div class="suggestion-category">${window.gameDataManager.getCategoryName(game.category)}</div>
                    </div>
                </div>
            `).join('');
        }
    }
    
    /**
     * 隐藏搜索建议
     */
    hideSearchSuggestions() {
        if (this.elements.searchSuggestions) {
            this.elements.searchSuggestions.innerHTML = '';
        }
    }
    
    /**
     * 切换导航菜单（移动端）
     */
    toggleNavigation() {
        if (this.elements.navMenu) {
            this.elements.navMenu.classList.toggle('active');
        }
        
        if (this.elements.navToggle) {
            this.elements.navToggle.classList.toggle('active');
        }
    }
    
    /**
     * 切换收藏页面显示
     */
    toggleFavorites() {
        // Implement favorites panel toggle
        console.log('Toggling favorites view');
    }
    
    /**
     * 切换游戏收藏状态
     */
    toggleGameFavorite(gameId) {
        if (window.gameManager) {
            window.gameManager.toggleFavorite(gameId);
            this.updateFavoritesCount();
            
            // 更新游戏卡片的收藏状态
            const favoriteBtn = document.querySelector(`[data-game-id="${gameId}"] .favorite-btn`);
            if (favoriteBtn) {
                const isFavorite = window.gameManager.isFavorite(gameId);
                favoriteBtn.classList.toggle('active', isFavorite);
                favoriteBtn.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
            }
        }
    }
    
    /**
     * 更新收藏数量显示
     */
    updateFavoritesCount() {
        // 安全检查
        if (!this.elements || !this.elements.favoritesCount || !window.gameManager) {
            console.warn('Elements or gameManager not available, skipping updateFavoritesCount');
            return;
        }

        const count = window.gameManager.getFavorites().length;
        this.elements.favoritesCount.textContent = count;
        this.elements.favoritesCount.style.display = count > 0 ? 'block' : 'none';
    }
    
    /**
     * 打开游戏模态框
     */
    openGameModal(gameId) {
        console.log('Opening game modal for ID:', gameId);

        if (!window.gameDataManager) {
            console.error('gameDataManager not found');
            this.showErrorMessage('Game system not initialized. Please refresh and try again...');
            return;
        }

        if (!window.gameDataManager.loaded) {
            console.error('Game data not loaded yet');
            this.showErrorMessage('Game data is loading. Please try again shortly...');
            return;
        }

        const game = window.gameDataManager.getGameById(gameId);
        if (!game) {
            console.error('Game not found:', gameId);
            this.showErrorMessage('Game not found. Please refresh and try again...');
            return;
        }

        console.log('Game found:', game.name, 'URL:', game.file);

        // 重新获取元素，以防初始化时未找到
        const gameModal = document.getElementById('game-modal');
        const modalGameTitle = document.getElementById('modal-game-title');
        const gameIframe = document.getElementById('game-iframe');
        const modalDescription = document.getElementById('modal-description');
        const modalInstructions = document.getElementById('modal-instructions');
        const modalPlays = document.getElementById('modal-plays');
        const modalRating = document.getElementById('modal-rating');

        if (!gameModal) {
            console.error('Game modal element not found');
            this.showErrorMessage('Game UI failed to load. Please refresh and try again...');
            return;
        }

        if (!gameIframe) {
            console.error('Game iframe element not found');
            this.showErrorMessage('Game container failed to load. Please refresh and try again...');
            return;
        }

        // 设置游戏信息
        if (modalGameTitle) {
            modalGameTitle.textContent = game.name || game.game_name || 'Untitled Game';
        }

        // 设置游戏描述（清洗并安全渲染）
        if (modalDescription) {
            const rawDesc = game.description || game.game_description || 'A fun online game — give it a try!';
            modalDescription.innerHTML = this.sanitizeGameHtml(rawDesc);
        }

        // 设置游戏操作说明
        if (modalInstructions) {
            modalInstructions.textContent = game.instructions || game.game_instructions || 'Use your mouse or keyboard to play. See in-game instructions for details.';
        }

        // 设置游戏统计信息
        if (modalPlays) {
            const plays = game.plays || game.play_count || 0;
            modalPlays.textContent = `${this.formatNumber(plays)} plays`;
        }

        // 设置评分
        if (modalRating) {
            const rating = game.rating || game.game_rating || 4.0;
            modalRating.innerHTML = this.generateStars(rating);
        }

        if (!game.file || game.file.trim() === '') {
            console.error('Game has no URL');
            this.showErrorMessage('Sorry, this game is temporarily unavailable');
            return;
        }

        // 显示加载指示器
        this.showLoadingIndicator(gameIframe);

        // 设置游戏 URL
        gameIframe.src = game.file;

        // 设置加载超时
        const loadTimeout = setTimeout(() => {
            console.error('Game loading timeout');
            this.hideLoadingIndicator(gameIframe);
            this.showErrorMessage('Game load timed out. Please check your network and try again');
            gameIframe.src = '';
        }, 30000); // 30s timeout

        gameIframe.onload = () => {
            clearTimeout(loadTimeout);
            this.hideLoadingIndicator(gameIframe);
            console.log('Game iframe loaded successfully');
        };

        gameIframe.onerror = () => {
            clearTimeout(loadTimeout);
            console.error('Game iframe failed to load');
            this.hideLoadingIndicator(gameIframe);
            this.showErrorMessage('Game failed to load. It may be temporarily unavailable');
            setTimeout(() => this.closeGameModal(), 3000);
        };

        // 显示模态框
        gameModal.classList.add('active');
        document.body.style.overflow = 'hidden';

        console.log('✅ Game modal opened successfully');

        // 更新游戏播放统计
        if (window.gameManager) {
            window.gameManager.recordGamePlay(gameId);
        }
    }

    // 轻量 HTML 清洗：允许有限标签；外链转换为纯文本；修正常见缩写撇号
    sanitizeGameHtml(input) {
        const txtFix = (s) => {
            const fixes = [
                [/\b[Yy]ou re\b/g, (m) => m[0] + "'re".slice(1)],
                [/\b[Yy]ou ll\b/g, (m) => m[0] + "'ll".slice(1)],
                [/\b[Dd]on t\b/g, (m) => m[0] + "'t".slice(1)],
                [/\b[Ii]sn t\b/g, (m) => m[0] + "'t".slice(1)],
                [/\b[Cc]an t\b/g, (m) => m[0] + "'t".slice(1)],
                [/\b[Ww]on t\b/g, (m) => m[0] + "'t".slice(1)],
                [/\b[Dd]oesn t\b/g, (m) => m[0] + "'t".slice(1)],
                [/\b[Dd]idn t\b/g, (m) => m[0] + "'t".slice(1)],
                [/\b[Ii] m\b/g, (m) => m[0] + "'m".slice(1)],
                [/\b[Ii] ve\b/g, (m) => m[0] + "'ve".slice(1)],
                [/\b[Ww]e re\b/g, (m) => m[0] + "'re".slice(1)],
                [/\b[Ww]e ll\b/g, (m) => m[0] + "'ll".slice(1)],
                [/\b[Tt]hey re\b/g, (m) => m[0] + "'re".slice(1)],
                [/\b[Ii]t s\b/g, (m) => m[0] + "'s".slice(1)]
            ];
            let o = s;
            fixes.forEach(([re, rep]) => { o = o.replace(re, rep); });
            return o;
        };
        try {
            const allowed = new Set(['P','BR','STRONG','B','EM','UL','OL','LI','H3','H4','A']);
            const container = document.createElement('div');
            container.innerHTML = input || '';
            const walk = (node) => {
                const children = Array.from(node.childNodes);
                for (const child of children) {
                    if (child.nodeType === 1) { // element
                        const tag = child.tagName;
                        if (!allowed.has(tag)) {
                            // Replace disallowed element by its text content
                            const span = document.createTextNode(child.textContent || '');
                            node.replaceChild(span, child);
                            continue;
                        }
                        if (tag === 'A') {
                            const href = child.getAttribute('href') || '';
                            try {
                                const u = new URL(href, window.location.origin);
                                if (u.origin !== window.location.origin) {
                                    // Convert external link to plain text to avoid spammy outlinks
                                    const text = document.createTextNode(child.textContent || u.href);
                                    node.replaceChild(text, child);
                                    continue;
                                } else {
                                    child.setAttribute('rel','nofollow noopener');
                                }
                            } catch { // invalid URL
                                const text = document.createTextNode(child.textContent || '');
                                node.replaceChild(text, child);
                                continue;
                            }
                        }
                        walk(child);
                    } else if (child.nodeType === 3) { // text
                        child.textContent = txtFix(child.textContent);
                    }
                }
            };
            walk(container);

            // If no paragraph tags present, create basic paragraphs from line breaks
            if (!container.querySelector('p')) {
                const text = container.textContent || '';
                const parts = text.split(/\n{2,}|\r{2,}/).map(s => s.trim()).filter(Boolean);
                if (parts.length) {
                    const out = document.createElement('div');
                    parts.forEach(p => { const el = document.createElement('p'); el.textContent = txtFix(p); out.appendChild(el); });
                    return out.innerHTML;
                }
            }
            return container.innerHTML;
        } catch {
            const esc = (s) => s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
            return `<p>${esc(txtFix(String(input||'')))}</p>`;
        }
    }
    
    /**
     * 关闭游戏模态框
     */
    closeGameModal() {
        const gameModal = document.getElementById('game-modal');
        const gameIframe = document.getElementById('game-iframe');

        if (gameModal) {
            gameModal.classList.remove('active');
        }

        if (gameIframe) {
            gameIframe.src = '';
        }

        document.body.style.overflow = '';
        console.log('Game modal closed');
    }
    
    /**
     * 处理窗口大小变化
     */
    handleResize() {
        // 响应式处理逻辑
        if (window.innerWidth > 768 && this.elements.navMenu) {
            this.elements.navMenu.classList.remove('active');
            if (this.elements.navToggle) {
                this.elements.navToggle.classList.remove('active');
            }
        }
    }
}

// 创建全局应用实例
window.miniGamesHubApp = new MiniGamesHubApp();
// 为了兼容性，同时设置为 window.app
window.app = window.miniGamesHubApp;

// 添加全局游戏卡片点击处理器作为备用方案
window.handleGameCardClick = function(event) {
    console.log('Global click handler called:', event.target);

    const gameCard = event.target.closest('.game-card');
    if (gameCard) {
        console.log('Found game card:', gameCard);
        const gameId = gameCard.dataset.gameId;
        console.log('Game ID:', gameId);

        if (gameId) {
            console.log('Trying to open game modal...');

            // 尝试使用 miniGamesHubApp 实例
            if (window.miniGamesHubApp && typeof window.miniGamesHubApp.openGameModal === 'function') {
                try {
                    window.miniGamesHubApp.openGameModal(parseInt(gameId));
                    console.log('✅ Game modal opened successfully');
                } catch (error) {
                    console.error('❌ openGameModal call failed:', error);
                }
            } else {
                console.error('❌ miniGamesHubApp or openGameModal not found');
            }
        } else {
            console.error('❌ Game card missing game-id');
        }

        // 阻止事件冒泡
        event.stopPropagation();
        return false;
    }
};

// Extra listener to ensure clicks are captured
document.addEventListener('click', window.handleGameCardClick, true); // capture phase

// Debug info
console.log('MiniGamesHub App initialized:', window.miniGamesHubApp);
console.log('Waiting for game data to load...');
console.log('Global game card click handler added');

// 导出模块（如果在模块环境中）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MiniGamesHubApp;
}
