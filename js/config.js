/**
 * CaltransBizConnect Application Configuration
 */
const isProduction = window.location.hostname === 'caltransbizconnect.org' ||
    window.location.hostname === 'www.caltransbizconnect.org' ||
    window.location.protocol === 'https:';

window.APP_CONFIG = {
    API_URL: isProduction ? 'https://caltransbizconnect.org/api' : 'http://localhost:3000/api',
    ENVIRONMENT: isProduction ? 'production' : 'development',
    VERSION: '2.0.5',
    FEATURES: {
        USE_MOCK_FALLBACK: false // Disabled for better debugging of actual auth issues
    }
};
