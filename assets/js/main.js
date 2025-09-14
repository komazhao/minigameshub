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
        this.initializeElements();
        this.setupEventListeners();
        this.showLoadingScreen();
        
        // 等待游戏数据加载
        if (window.gameDataManager) {
            if (window.gameDataManager.loaded) {
                this.onDataLoaded();
            } else {
                window.gameDataManager.on('loaded', () => this.onDataLoaded());
                window.gameDataManager.on('error', (error) => this.onDataLoadError(error));
            }
        } else {
            setTimeout(() => this.init(), 100); // 如果 gameDataManager 未准备好则重试
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
            if (e.target.closest('.game-card')) {
                const gameCard = e.target.closest('.game-card');
                const gameId = gameCard.dataset.gameId;
                if (gameId) {
                    this.openGameModal(parseInt(gameId));
                }
            }
            
            // 收藏按钮点击
            if (e.target.closest('.favorite-btn')) {
                e.stopPropagation();
                const favoriteBtn = e.target.closest('.favorite-btn');
                const gameId = favoriteBtn.dataset.gameId;
                if (gameId) {
                    this.toggleGameFavorite(parseInt(gameId));
                }
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
        this.hideLoadingScreen();
        this.populateCategories();
        this.populateFeaturedGames();
        this.populateGames();
        this.updateSiteStats();
        this.updateFavoritesCount();
        
        console.log('MiniGamesHub 应用程序初始化完成');
    }
    
    /**
     * 数据加载错误处理
     */
    onDataLoadError(error) {
        console.error('数据加载错误:', error);
        this.hideLoadingScreen();
        this.showErrorMessage('游戏数据加载失败，请刷新页面重试');
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
                <h2>加载错误</h2>
                <p>${message}</p>
                <button onclick="location.reload()" class="retry-btn">重试</button>
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
        const categories = window.gameDataManager.getAllCategories();
        
        // 填充导航栏下拉菜单
        if (this.elements.categoriesDropdown && categories.length > 0) {
            this.elements.categoriesDropdown.innerHTML = categories.map(category => `
                <li><a href="#" class="dropdown-link" data-category="${category.id}">${category.name}</a></li>
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
                <button class="category-btn active" data-category="all">所有游戏</button>
                ${categoryButtons}
            `;
        }
        
        // 填充页脚分类链接
        if (this.elements.footerCategories) {
            this.elements.footerCategories.innerHTML = categories.map(category => `
                <li><a href="#" data-category="${category.id}">${category.name}</a></li>
            `).join('');
        }
        
        // 填充分类网格
        if (this.elements.categoriesGrid) {
            this.elements.categoriesGrid.innerHTML = categories.map(category => `
                <div class="category-card" data-category="${category.id}">
                    <div class="category-icon">🎮</div>
                    <h3>${category.name}</h3>
                    <p>${category.description || ''}</p>
                    <div class="category-stats">
                        <span>${category.game_count || 0} 游戏</span>
                    </div>
                </div>
            `).join('');
        }
    }
    
    /**
     * 填充特色游戏
     */
    populateFeaturedGames() {
        const featuredGames = window.gameDataManager.getFeaturedGames(8);
        
        if (this.elements.featuredGames) {
            this.elements.featuredGames.innerHTML = featuredGames.map(game => 
                this.createGameCard(game)
            ).join('');
        }
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
                         loading="lazy">
                    <div class="game-overlay">
                        <button class="play-btn">▶ 开始游戏</button>
                    </div>
                    ${game.featured ? '<div class="featured-badge">特色</div>' : ''}
                </div>
                <div class="game-info">
                    <h3 class="game-title">${game.name}</h3>
                    <div class="game-meta">
                        <div class="game-rating">
                            ${this.createStarRating(game.rating || 0)}
                        </div>
                        <div class="game-stats">
                            <span class="plays">${this.formatNumber(game.plays || 0)} 次播放</span>
                        </div>
                    </div>
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                            data-game-id="${game.game_id}"
                            title="${isFavorite ? '取消收藏' : '添加到收藏'}">
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
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
    /**
     * 加载更多游戏
     */
    loadMoreGames() {
        let games;
        
        if (this.searchQuery) {
            games = window.gameDataManager.searchGames(this.searchQuery, {
                category: this.currentCategory === 'all' ? null : this.currentCategory,
                sortBy: this.currentSort,
                limit: this.gamesPerPage
            });
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
                    <h3>未找到游戏</h3>
                    <p>试试调整搜索条件或选择其他分类</p>
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
                category: this.currentCategory === 'all' ? null : this.currentCategory
            }).length;
        } else if (this.currentCategory === 'all') {
            return window.gameDataManager.getAllGames().length;
        } else {
            return window.gameDataManager.getGamesByCategory(parseInt(this.currentCategory)).length;
        }
    }
    
    /**
     * 更新网站统计信息
     */
    updateSiteStats() {
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
            const categoryName = category === 'all' ? '所有游戏' : 
                window.gameDataManager.getCategoryById(parseInt(category))?.name || '游戏';
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
     * 显示搜索建议
     */
    showSearchSuggestions() {
        const suggestions = window.gameDataManager.searchGames(this.searchQuery, { limit: 5 });
        
        if (this.elements.searchSuggestions && suggestions.length > 0) {
            this.elements.searchSuggestions.innerHTML = suggestions.map(game => `
                <div class="suggestion-item" data-game-id="${game.game_id}">
                    <img src="${game.image}" alt="${game.name}" class="suggestion-image">
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
        // 实现收藏页面显示逻辑
        console.log('切换收藏页面显示');
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
                favoriteBtn.title = isFavorite ? '取消收藏' : '添加到收藏';
            }
        }
    }
    
    /**
     * 更新收藏数量显示
     */
    updateFavoritesCount() {
        if (this.elements.favoritesCount && window.gameManager) {
            const count = window.gameManager.getFavorites().length;
            this.elements.favoritesCount.textContent = count;
            this.elements.favoritesCount.style.display = count > 0 ? 'block' : 'none';
        }
    }
    
    /**
     * 打开游戏模态框
     */
    openGameModal(gameId) {
        const game = window.gameDataManager.getGameById(gameId);
        if (!game) return;
        
        if (this.elements.gameModal && this.elements.modalGameTitle && this.elements.gameIframe) {
            this.elements.modalGameTitle.textContent = game.name;
            this.elements.gameIframe.src = game.file;
            this.elements.gameModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // 更新游戏播放统计
            if (window.gameManager) {
                window.gameManager.recordPlay(gameId);
            }
        }
    }
    
    /**
     * 关闭游戏模态框
     */
    closeGameModal() {
        if (this.elements.gameModal && this.elements.gameIframe) {
            this.elements.gameModal.style.display = 'none';
            this.elements.gameIframe.src = '';
            document.body.style.overflow = '';
        }
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

// 导出模块（如果在模块环境中）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MiniGamesHubApp;
}