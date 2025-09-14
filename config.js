/**
 * Configuration file for MiniGamesHub - Optimized for Cloudflare Pages
 * Contains all environment-specific settings
 */

// Supabase Configuration
// 获取方法: https://supabase.com/dashboard -> Your Project -> Settings -> API
const SUPABASE_CONFIG = {
    // Supabase 项目 URL - 格式: https://your-project-ref.supabase.co
    url: typeof process !== 'undefined' && process.env ? process.env.SUPABASE_URL : 'https://wcxdjyeiajswwvjudscl.supabase.co',
    
    // Supabase 公共 API 密钥 (anon key)
    // 这是客户端安全密钥，可以公开使用
    anonKey: typeof process !== 'undefined' && process.env ? process.env.SUPABASE_ANON_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjeGRqeWVpYWpzd3d2anVkc2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNjc2NTgsImV4cCI6MjA3Mjc0MzY1OH0.LlTC_KYcbsBi52c_LLdo-1WeHZYF0JThjqlxVoZNFZI',
    
    // 可选: Supabase 服务密钥 (仅用于服务端操作)
    // 请勿在客户端代码中使用此密钥
    serviceKey: typeof process !== 'undefined' && process.env ? process.env.SUPABASE_SERVICE_KEY : null
};

// 网站配置
const SITE_CONFIG = {
    // 网站基本信息
    siteName: 'MiniGamesHub',
    siteUrl: typeof process !== 'undefined' && process.env ? process.env.SITE_URL || 'https://minigameshub.co' : 'https://minigameshub.co',
    siteDomain: 'minigameshub.co',
    
    // SEO 配置
    defaultTitle: 'Best Free Online Mini Games Hub - Play Fun Games Online | MiniGamesHub.co',
    defaultDescription: 'Play thousands of free online mini games including action, puzzle, racing, sports, and arcade games. The ultimate gaming destination for fun browser games - no downloads required!',
    defaultKeywords: 'free online games, mini games, browser games, HTML5 games, puzzle games, action games, racing games, sports games',
    
    // 社交媒体
    social: {
        twitter: '@minigameshub',
        facebook: 'minigameshub',
        youtube: 'minigameshub'
    },
    
    // Google Analytics (可选)
    googleAnalyticsId: typeof process !== 'undefined' && process.env ? process.env.GA_MEASUREMENT_ID || null : null,
    
    // Google Search Console (可选)
    googleSiteVerification: typeof process !== 'undefined' && process.env ? process.env.GOOGLE_SITE_VERIFICATION || null : null
};

// Cloudflare Pages 特定配置
const CLOUDFLARE_CONFIG = {
    // Cloudflare Analytics (可选)
    analyticsToken: typeof process !== 'undefined' && process.env ? process.env.CF_ANALYTICS_TOKEN || null : null,
    
    // Cloudflare Images (如果使用)
    imagesAccountId: typeof process !== 'undefined' && process.env ? process.env.CF_IMAGES_ACCOUNT_ID || null : null,
    
    // Cloudflare KV (用于缓存)
    kvNamespace: typeof process !== 'undefined' && process.env ? process.env.CF_KV_NAMESPACE || null : null,
    
    // Cloudflare Workers (如果需要)
    workersEnabled: typeof process !== 'undefined' && process.env ? process.env.CF_WORKERS_ENABLED === 'true' : false,
    
    // Cloudflare 缓存设置
    cacheSettings: {
        staticAssets: 31536000, // 1年
        htmlPages: 3600,        // 1小时
        apiResponses: 300,      // 5分钟
        images: 2592000         // 30天
    }
};

// 数据库表配置（基于实际games.sql结构）
const DB_TABLES = {
    games: 'gm_games',               // 游戏表
    categories: 'gm_categories',     // 分类表
    users: 'gm_account',             // 用户表 (原gm_users已存在但gm_account是主要用户表)
    account: 'gm_account',           // 账户表
    ads: 'gm_ads',                   // 广告表
    blogs: 'gm_blogs',               // 博客表
    chatgpt: 'gm_chatgpt',           // ChatGPT配置表
    footer_description: 'gm_footer_description', // 页脚描述表
    links: 'gm_links',               // 链接表
    media: 'gm_media',               // 媒体表
    setting: 'gm_setting',           // 设置表
    sidebar: 'gm_sidebar',           // 侧边栏表
    sliders: 'gm_sliders',           // 轮播图表
    tags: 'gm_tags',                 // 标签表
    theme: 'gm_theme',               // 主题表
    users_alt: 'gm_users'            // 用户表(备用)
    // 注意：user_favorites, user_ratings, play_statistics 表在games.sql中不存在，已移除
};

// API 配置
const API_CONFIG = {
    // API 基础地址
    baseUrl: SITE_CONFIG.siteUrl + '/api',
    
    // 请求配置
    timeout: 10000, // 10 秒超时
    retryAttempts: 3,
    retryDelay: 1000, // 1 秒重试延迟
    
    // 缓存配置
    cacheExpiry: 5 * 60 * 1000, // 5 分钟缓存
    maxCacheSize: 100, // 最多缓存条目数
    
    // 分页配置
    defaultPageSize: 12,
    maxPageSize: 50
};

// 游戏配置
const GAME_CONFIG = {
    // 默认游戏尺寸
    defaultWidth: 800,
    defaultHeight: 600,
    
    // iframe 安全域名
    allowedDomains: [
        'html5.gamemonetize.com',
        'img.gamemonetize.com',
        'games.crazygames.com',
        'gamedistribution.com',
        'cdn.cloudflare.com'
    ],
    
    // 游戏加载配置
    loadTimeout: 30000, // 30 秒加载超时
    
    // 自动播放设置
    autoplay: false,
    
    // 全屏支持
    fullscreenEnabled: true
};

// PWA 配置
const PWA_CONFIG = {
    // Service Worker
    swFileName: 'sw.js',
    swScope: '/',
    
    // 缓存策略
    cacheStrategies: {
        static: 'CacheFirst',
        dynamic: 'NetworkFirst',
        images: 'CacheFirst',
        games: 'NetworkFirst'
    },
    
    // 离线页面
    offlinePage: '/offline.html',
    
    // 更新提示
    showUpdatePrompt: true
};

// 性能配置
const PERFORMANCE_CONFIG = {
    // 懒加载配置
    lazyLoading: true,
    lazyLoadThreshold: 100, // 100px 提前加载
    
    // 预加载配置
    preloadCriticalResources: true,
    
    // 压缩配置
    enableCompression: true,
    compressionLevel: 6,
    
    // 资源提示
    enableResourceHints: true,
    
    // Cloudflare 特定优化
    cloudflare: {
        minify: true,
        autoMinify: true,
        rocketLoader: false, // 根据需要启用
        mirage: true,
        polish: 'lossy'
    }
};

// 开发环境配置
const DEV_CONFIG = {
    // 调试模式
    debug: typeof process !== 'undefined' && process.env ? process.env.NODE_ENV !== 'production' : true,
    
    // 日志级别
    logLevel: typeof process !== 'undefined' && process.env ? process.env.LOG_LEVEL || 'info' : 'info',
    
    // 开发服务器
    devServer: {
        port: 8000,
        host: 'localhost',
        https: false
    },
    
    // 热重载
    hotReload: true,
    
    // 源码映射
    sourceMaps: true
};

// 安全配置
const SECURITY_CONFIG = {
    // HTTPS 强制
    forceHttps: true,
    
    // CSP 配置 (适配 Cloudflare)
    contentSecurityPolicy: {
        'default-src': ["'self'", "https:"],
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "blob:", "*.cloudflare.com"],
        'style-src': ["'self'", "'unsafe-inline'", "https:", "fonts.googleapis.com"],
        'font-src': ["'self'", "https:", "fonts.gstatic.com", "data:"],
        'img-src': ["'self'", "https:", "data:", "blob:"],
        'media-src': ["'self'", "https:", "blob:"],
        'frame-src': ["'self'", "https:"],
        'connect-src': ["'self'", "https:", "*.supabase.co", "*.cloudflare.com"],
        'worker-src': ["'self'", "blob:"]
    },
    
    // HSTS 配置
    hsts: {
        maxAge: 31536000, // 1 年
        includeSubDomains: true,
        preload: true
    }
};

// 国际化配置 (可选功能)
const I18N_CONFIG = {
    // 默认语言
    defaultLocale: 'en',
    
    // 支持的语言
    supportedLocales: ['en', 'zh-CN', 'zh-TW', 'es', 'fr', 'de', 'ja', 'ko'],
    
    // 自动检测
    detectLanguage: true,
    
    // 回退语言
    fallbackLocale: 'en'
};

// 配置对象集合
const CONFIG = {
    supabase: SUPABASE_CONFIG,
    site: SITE_CONFIG,
    cloudflare: CLOUDFLARE_CONFIG,
    database: DB_TABLES,
    api: API_CONFIG,
    game: GAME_CONFIG,
    pwa: PWA_CONFIG,
    performance: PERFORMANCE_CONFIG,
    development: DEV_CONFIG,
    security: SECURITY_CONFIG,
    i18n: I18N_CONFIG
};

// 配置验证函数
function validateConfig() {
    const errors = [];
    
    // 验证必需的 Supabase 配置
    if (!SUPABASE_CONFIG.url || SUPABASE_CONFIG.url === 'https://your-project-ref.supabase.co') {
        errors.push('Supabase URL is not configured. Please set SUPABASE_URL environment variable.');
    }
    
    if (!SUPABASE_CONFIG.anonKey || SUPABASE_CONFIG.anonKey === 'your-anon-key-here') {
        errors.push('Supabase anon key is not configured. Please set SUPABASE_ANON_KEY environment variable.');
    }
    
    // 验证网站 URL
    if (!SITE_CONFIG.siteUrl || SITE_CONFIG.siteUrl === 'https://minigameshub.co') {
        if (typeof window === 'undefined' && typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
            console.warn('Using default site URL. Please update SITE_URL environment variable in production.');
        }
    }
    
    if (errors.length > 0) {
        console.error('Configuration errors:', errors);
        if (typeof window === 'undefined' && typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
            // 在生产环境的服务端抛出配置错误
            throw new Error('Critical configuration errors detected: ' + errors.join(', '));
        }
    }
    
    return errors.length === 0;
}

// 获取配置的安全方法
function getConfig(section = null) {
    if (section) {
        return CONFIG[section] || null;
    }
    return CONFIG;
}

// 环境检测
function isProduction() {
    return typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production';
}

function isDevelopment() {
    return typeof process !== 'undefined' && process.env ? 
        process.env.NODE_ENV === 'development' || !process.env.NODE_ENV : 
        true;
}

// 运行环境检测
function isBrowser() {
    return typeof window !== 'undefined';
}

function isServer() {
    return typeof window === 'undefined';
}

function isCloudflarePages() {
    return typeof process !== 'undefined' && process.env && process.env.CF_PAGES === '1';
}

// 初始化配置
function initConfig() {
    // 验证配置
    const isValid = validateConfig();
    
    if (isDevelopment() && isBrowser()) {
        console.log('MiniGamesHub Configuration Loaded:', {
            environment: typeof process !== 'undefined' && process.env ? process.env.NODE_ENV || 'development' : 'development',
            platform: isCloudflarePages() ? 'Cloudflare Pages' : 'Other',
            supabaseUrl: SUPABASE_CONFIG.url,
            siteUrl: SITE_CONFIG.siteUrl,
            valid: isValid
        });
    }
    
    return CONFIG;
}

// 导出配置 (兼容多种环境)
if (typeof module !== 'undefined' && module.exports) {
    // Node.js 环境
    module.exports = {
        CONFIG,
        getConfig,
        validateConfig,
        initConfig,
        isProduction,
        isDevelopment,
        isBrowser,
        isServer,
        isCloudflarePages
    };
} else if (typeof window !== 'undefined') {
    // 浏览器环境
    window.MiniGamesHubConfig = {
        CONFIG,
        getConfig,
        validateConfig,
        initConfig,
        isProduction,
        isDevelopment,
        isBrowser,
        isServer,
        isCloudflarePages
    };
    
    // 自动初始化
    initConfig();
}

/* 
使用示例:

// 在浏览器中使用:
const config = window.MiniGamesHubConfig.getConfig();
const supabaseConfig = window.MiniGamesHubConfig.getConfig('supabase');

// 在 Node.js 中使用:
const { getConfig } = require('./config');
const config = getConfig();
const supabaseConfig = getConfig('supabase');

// 环境变量设置示例 (在 Cloudflare Pages 中设置):
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SITE_URL=https://minigameshub.co
NODE_ENV=production
GA_MEASUREMENT_ID=G-XXXXXXXXXX
GOOGLE_SITE_VERIFICATION=your-verification-code
CF_ANALYTICS_TOKEN=your-cloudflare-analytics-token
*/