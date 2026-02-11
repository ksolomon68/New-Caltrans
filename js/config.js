/**
 * CaltransBizConnect Application Configuration
 */
const isProduction = window.location.hostname === 'caltransbizconnect.org' ||
    window.location.hostname === 'www.caltransbizconnect.org' ||
    (window.location.protocol === 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');

// Prefer relative path if on the same origin (works for both local and production if served by Node)
const baseApiUrl = isProduction ? 'https://caltransbizconnect.org/api' : '/api';

window.APP_CONFIG = {
    API_URL: baseApiUrl,
    ENVIRONMENT: isProduction ? 'production' : 'development',
    VERSION: '2.0.9',
    FEATURES: {
        USE_MOCK_FALLBACK: false
    }
};
