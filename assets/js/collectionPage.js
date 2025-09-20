/**
 * Collection Page Controller
 * Handles featured/new/popular collections and category listings.
 */

class CollectionPage {
    constructor() {
        this.mode = 'collection';
        this.collectionType = 'featured';
        this.categorySlug = null;
        this.currentCategory = null;
        this.gamesPerPage = 18;
        this.visibleGames = 0;
        this.allGames = [];
        this.sortedGames = [];

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.parseParams();
        this.cacheElements();
        this.registerEvents();
        this.waitForGameData();
    }

    parseParams() {
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        const params = new URLSearchParams(window.location.search);

        let collectionParam = (params.get('collection') || '').toLowerCase();
        let categoryParam = (params.get('category') || params.get('slug') || '').toLowerCase();

        if (pathSegments[0] === 'collections') {
            const second = pathSegments[1] ? decodeURIComponent(pathSegments[1].toLowerCase()) : '';
            if (second === 'category') {
                const third = pathSegments[2] ? decodeURIComponent(pathSegments[2].toLowerCase()) : '';
                if (third) {
                    categoryParam = third;
                }
            } else if (second) {
                collectionParam = second;
            }
        }

        if (categoryParam) {
            this.mode = 'category';
            this.categorySlug = categoryParam;
        } else {
            this.mode = 'collection';
            this.collectionType = ['popular', 'new', 'newest'].includes(collectionParam) ?
                (collectionParam === 'newest' ? 'new' : collectionParam) : 'featured';
        }
    }

    cacheElements() {
        this.elements = {
            loadingScreen: document.getElementById('loading-screen'),
            navMenu: document.getElementById('nav-menu'),
            navToggle: document.getElementById('nav-toggle'),
            searchToggle: document.getElementById('search-toggle'),
            searchContainer: document.getElementById('search-container'),
            searchInput: document.getElementById('search-input'),
            searchSuggestions: document.getElementById('search-suggestions'),
            categoriesDropdown: document.getElementById('categories-dropdown'),
            footerCategories: document.getElementById('footer-categories'),
            favoritesToggle: document.getElementById('favorites-toggle'),
            favoritesCount: document.getElementById('favorites-count'),
            collectionTitle: document.getElementById('collection-title'),
            collectionDescription: document.getElementById('collection-description'),
            collectionSubtitle: document.getElementById('collection-subtitle'),
            collectionBreadcrumb: document.getElementById('collection-breadcrumb'),
            collectionBreadcrumbRoot: document.getElementById('collection-breadcrumb-root'),
            collectionBreadcrumbSeparator: document.getElementById('collection-breadcrumb-separator'),
            collectionCount: document.getElementById('collection-count'),
            collectionGrid: document.getElementById('collection-grid'),
            collectionEmpty: document.getElementById('collection-empty'),
            loadMoreBtn: document.getElementById('collection-load-more'),
            sortSelect: document.getElementById('collection-sort')
        };
    }

    registerEvents() {
        if (this.elements.loadMoreBtn) {
            this.elements.loadMoreBtn.addEventListener('click', () => this.renderGames());
        }

        if (this.elements.sortSelect) {
            this.elements.sortSelect.addEventListener('change', (event) => {
                this.sortGames(event.target.value);
                this.renderGames(true);
            });
        }

    }

    waitForGameData() {
        this.showLoading();

        if (window.gameDataManager && window.gameDataManager.loaded) {
            this.onGameDataReady();
            return;
        }

        if (window.gameDataManager) {
            window.gameDataManager.on('loaded', () => this.onGameDataReady());
            window.gameDataManager.on('error', () => this.showError('Failed to load game data. Please refresh and try again.'));
        } else {
            this.showError('Game system initialization failed. Please refresh and try again.');
        }
    }

    onGameDataReady() {
        this.hideLoading();
        this.populateNavigation();
        this.updateFavoritesBadge();
        this.preparePageContent();
    }

    populateNavigation() {
        if (!window.gameDataManager) return;
        const categories = window.gameDataManager.getAllCategories();

        if (this.elements.categoriesDropdown) {
            this.elements.categoriesDropdown.innerHTML = categories.map(category => `
                <li>
                    <a href="/collections/category/${category.slug}" class="dropdown-link" data-local-href="/collection.html?category=${category.slug}">${category.name}</a>
                </li>
            `).join('');
        }

        if (this.elements.footerCategories) {
            this.elements.footerCategories.innerHTML = categories.map(category => `
                <li><a href="/collections/category/${category.slug}" data-local-href="/collection.html?category=${category.slug}">${category.name}</a></li>
            `).join('');
        }
    }

    preparePageContent() {
        if (!window.gameDataManager) return;

        if (this.mode === 'category') {
            const category = window.gameDataManager.getCategoryBySlug(this.categorySlug);
            if (!category) {
                this.showError('Category not found.');
                return;
            }
            this.currentCategory = category;
            this.allGames = window.gameDataManager.getGamesByCategory(category.slug);
            this.setCategoryContent(category);
        } else {
            this.allGames = this.getCollectionGames();
            this.setCollectionContent();
        }

        if (this.allGames.length === 0) {
            this.showEmptyState();
            return;
        }

        this.sortGames(this.elements.sortSelect ? this.elements.sortSelect.value : 'default');
        this.renderGames(true);
        this.setActiveNavigation();
    }

    getCollectionGames() {
        if (!window.gameDataManager) return [];
        switch (this.collectionType) {
            case 'popular':
                return window.gameDataManager.getPopularGames();
            case 'new':
                return window.gameDataManager.getNewestGames();
            case 'featured':
            default:
                return window.gameDataManager.getFeaturedGames(null, { ensureMin: 12 });
        }
    }

    sortGames(mode = 'default') {
        const list = [...this.allGames];

        switch (mode) {
            case 'popular':
                list.sort((a, b) => (b.plays || 0) - (a.plays || 0));
                break;
            case 'newest':
                list.sort((a, b) => {
                    const timeA = new Date(a.date_added || 0).getTime();
                    const timeB = new Date(b.date_added || 0).getTime();
                    return timeB - timeA;
                });
                break;
            case 'rating':
                list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'name':
                list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
            case 'default':
            default:
                if (this.mode === 'collection' && this.collectionType === 'featured') {
                    list.sort((a, b) => {
                        if (a.featured && !b.featured) return -1;
                        if (!a.featured && b.featured) return 1;
                        const ratingDiff = (b.rating || 0) - (a.rating || 0);
                        if (Math.abs(ratingDiff) > 0.01) return ratingDiff;
                        return (b.plays || 0) - (a.plays || 0);
                    });
                } else {
                    list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                }
                break;
        }

        this.sortedGames = list;
    }

    renderGames(reset = false) {
        if (!this.elements.collectionGrid) return;

        if (reset) {
            this.visibleGames = 0;
            this.elements.collectionGrid.innerHTML = '';
        }

        const nextGames = this.sortedGames.slice(this.visibleGames, this.visibleGames + this.gamesPerPage);

        if (nextGames.length === 0 && this.visibleGames === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();

        const cards = nextGames.map(game => this.createGameCard(game)).join('');
        this.elements.collectionGrid.insertAdjacentHTML('beforeend', cards);
        this.visibleGames += nextGames.length;

        if (this.elements.collectionCount) {
            this.elements.collectionCount.textContent = `${this.sortedGames.length} games`;
        }

        if (this.elements.loadMoreBtn) {
            const hasMore = this.visibleGames < this.sortedGames.length;
            this.elements.loadMoreBtn.style.display = hasMore ? 'inline-flex' : 'none';
        }

        if (window.gameManager) {
            window.gameManager.updateFavoritesUI();
        }

        this.updateStructuredData();
    }

    createGameCard(game) {
        if (window.miniGamesHubApp && typeof window.miniGamesHubApp.createGameCard === 'function') {
            return window.miniGamesHubApp.createGameCard(game);
        }

        const rating = game.rating || 0;
        const plays = game.plays || 0;
        const image = game.image || '/assets/images/game-placeholder.png';
        const isFeatured = Boolean(game.featured);
        const isFavorite = window.gameManager && window.gameManager.isFavorite(game.game_id);

        return `
            <div class="game-card" data-game-id="${game.game_id}">
                <div class="game-image">
                    <img src="${image}" alt="${game.name}">
                    ${isFeatured ? '<span class="game-badge">Featured</span>' : ''}
                    <button class="game-favorite favorite-btn ${isFavorite ? 'active' : ''}" data-game-id="${game.game_id}" aria-label="Add to favorites">
                        ♥
                    </button>
                </div>
                <div class="game-content">
                    <div class="game-header">
                        <h3 class="game-title">${game.name}</h3>
                        <div class="game-meta">
                            <span class="game-rating">★ ${rating.toFixed(1)}</span>
                            <span class="game-plays">${this.formatNumber(plays)} plays</span>
                        </div>
                    </div>
                    <p class="game-description">${(game.description || '').slice(0, 120)}...</p>
                    <div class="game-footer">
                        <span class="game-category">${this.getCategoryName(game.category)}</span>
                        <button class="play-now">Play Now</button>
                    </div>
                </div>
            </div>
        `;
    }

    setCollectionContent() {
        const configMap = {
            featured: {
                title: 'Featured HTML5 Games',
                description: 'Our hand-picked selection of the best mini games to play right now. Updated continuously with new favorites.',
                subtitle: 'Featured Picks'
            },
            popular: {
                title: 'Most Popular Games',
                description: 'Trending games that players love the most. Jump into the hits that are getting thousands of plays.',
                subtitle: 'Trending Now'
            },
            new: {
                title: 'Newly Added Games',
                description: 'Fresh HTML5 games added to MiniGamesHub. Be the first to try the latest adventures.',
                subtitle: 'New Arrivals'
            }
        };

        const config = configMap[this.collectionType] || configMap.featured;

        this.updateTextContent(config.title, config.description, config.subtitle);
        this.updateMetaTags(config.title, config.description);
        this.updateBreadcrumb(config.title);
    }

    setCategoryContent(category) {
        const title = `${category.name} Games`;
        const description = category.description || `Play the best ${category.name.toLowerCase()} games online for free.`;

        this.updateTextContent(title, description, `${category.name} Highlights`);
        this.updateMetaTags(title, description);
        this.updateBreadcrumb(category.name);
    }

    updateTextContent(title, description, subtitle) {
        if (this.elements.collectionTitle) {
            this.elements.collectionTitle.textContent = title;
        }
        if (this.elements.collectionDescription) {
            this.elements.collectionDescription.textContent = description;
        }
        if (this.elements.collectionSubtitle) {
            this.elements.collectionSubtitle.textContent = subtitle || 'Browse Collection';
        }
        if (this.elements.collectionCount) {
            this.elements.collectionCount.textContent = `${this.allGames.length} games`;
        }
        this.currentTitle = title;
        this.currentDescription = description;
        document.title = `${title} | MiniGamesHub.co`;
    }

    updateMetaTags(title, description) {
        let metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content', description);
        }

        let canonical = document.getElementById('canonical-link') || document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }

        const origin = window.location.origin;
        let canonicalPath = window.location.pathname + window.location.search;

        if (this.mode === 'collection') {
            canonicalPath = `/collections/${
                this.collectionType === 'featured'
                    ? 'featured'
                    : this.collectionType === 'new'
                        ? 'new'
                        : 'popular'
            }`;
        } else if (this.mode === 'category' && this.currentCategory) {
            canonicalPath = `/collections/category/${this.currentCategory.slug}`;
        }

        const canonicalUrl = `${origin}${canonicalPath}`;
        canonical.href = canonicalUrl;
        this.currentCanonicalUrl = canonicalUrl;

        const ogTitle = document.getElementById('og-title');
        if (ogTitle) {
            ogTitle.setAttribute('content', title);
        }
        const ogDescription = document.getElementById('og-description');
        if (ogDescription) {
            ogDescription.setAttribute('content', description);
        }
        const ogUrl = document.getElementById('og-url');
        if (ogUrl) {
            ogUrl.setAttribute('content', canonicalUrl);
        }
    }

    updateBreadcrumb(label) {
        if (this.elements.collectionBreadcrumb) {
            this.elements.collectionBreadcrumb.textContent = label;
        }
        const root = this.elements.collectionBreadcrumbRoot;
        const separator = this.elements.collectionBreadcrumbSeparator;

        if (root && separator) {
            if (this.mode === 'category') {
                root.style.display = '';
                separator.style.display = '';
                root.textContent = 'Collections';
                root.href = '/collections/featured';
            } else {
                root.style.display = 'none';
                separator.style.display = 'none';
            }
        }
    }

    setActiveNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => link.classList.remove('active'));

        if (this.mode === 'collection') {
            const targetPath = this.collectionType === 'featured'
                ? '/collection.html?collection=featured'
                : this.collectionType === 'new'
                    ? '/collection.html?collection=new'
                    : '/collection.html?collection=popular';
            const activeLink = Array.from(navLinks).find(link => link.getAttribute('href') === targetPath);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        } else if (this.mode === 'category') {
            const categoriesLink = document.querySelector('.nav-item.dropdown .nav-link');
            if (categoriesLink) {
                categoriesLink.classList.add('active');
            }
        }
    }

    showEmptyState() {
        if (this.elements.collectionGrid) {
            this.elements.collectionGrid.innerHTML = '';
        }
        if (this.elements.collectionEmpty) {
            this.elements.collectionEmpty.hidden = false;
        }
        if (this.elements.loadMoreBtn) {
            this.elements.loadMoreBtn.style.display = 'none';
        }
        if (this.elements.collectionCount) {
            this.elements.collectionCount.textContent = '0 games';
        }

        this.updateStructuredData();
    }

    hideEmptyState() {
        if (this.elements.collectionEmpty) {
            this.elements.collectionEmpty.hidden = true;
        }
    }

    showLoading() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.display = 'flex';
        }
    }

    hideLoading() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                if (this.elements.loadingScreen) {
                    this.elements.loadingScreen.style.display = 'none';
                    this.elements.loadingScreen.style.opacity = '1';
                }
            }, 300);
        }
    }

    showError(message) {
        this.hideLoading();
        if (this.elements.collectionGrid) {
            this.elements.collectionGrid.innerHTML = `
                <div class="error-message">
                    <h3>Oops!</h3>
                    <p>${message}</p>
                </div>
            `;
        }
        if (this.elements.collectionEmpty) {
            this.elements.collectionEmpty.hidden = true;
        }
    }

    updateFavoritesBadge() {
        if (window.gameManager) {
            window.gameManager.updateFavoritesUI();
        }
    }

    formatNumber(num) {
        if (!num || isNaN(num)) return '0';
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
        if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
        return num.toString();
    }

    getCategoryName(categoryId) {
        if (!window.gameDataManager) return 'Game';
        const category = window.gameDataManager.getCategoryById(categoryId);
        return category ? category.name : 'Game';
    }

    updateStructuredData() {
        const structuredEl = document.getElementById('collection-structured-data');
        if (!structuredEl) return;

        if (!this.sortedGames || this.sortedGames.length === 0) {
            structuredEl.textContent = '';
            return;
        }

        const origin = window.location.origin;
        const canonicalUrl = this.currentCanonicalUrl || `${origin}${window.location.pathname}`;
        const title = this.currentTitle || document.title.replace(' | MiniGamesHub.co', '');
        const description = this.currentDescription || 'Play curated HTML5 mini games on MiniGamesHub.';

        const listItems = this.sortedGames.slice(0, 12).map((game, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${origin}/games/${game.slug}`,
            name: game.name
        }));

        const pageSchema = {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: title,
            description,
            url: canonicalUrl,
            mainEntity: {
                '@type': 'ItemList',
                itemListElement: listItems
            }
        };

        if (this.mode === 'category' && this.currentCategory) {
            pageSchema.about = {
                '@type': 'Thing',
                name: this.currentCategory.name
            };
        }

        const breadcrumbItems = [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: `${origin}/`
            }
        ];

        if (this.mode === 'category' && this.currentCategory) {
            breadcrumbItems.push(
                {
                    '@type': 'ListItem',
                    position: 2,
                    name: 'Collections',
                    item: `${origin}/collections/featured`
                },
                {
                    '@type': 'ListItem',
                    position: 3,
                    name: this.currentCategory.name,
                    item: canonicalUrl
                }
            );
        } else {
            breadcrumbItems.push({
                '@type': 'ListItem',
                position: 2,
                name: title,
                item: canonicalUrl
            });
        }

        const breadcrumbSchema = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbItems
        };

        structuredEl.textContent = JSON.stringify([pageSchema, breadcrumbSchema]);
    }
}

window.collectionPage = new CollectionPage();

// Export for tests if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CollectionPage;
}
