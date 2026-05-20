/**
 * Data Service - Resilient Fetching
 * Always fetches from the live API. No mock fallbacks — demo data is never shown.
 */
const DataService = {
    fetch: async (endpoint, options = {}) => {
        const url = `${window.APP_CONFIG ? window.APP_CONFIG.API_URL : '/api'}${endpoint}`;

        // Auto-attach JWT token if present
        const token = localStorage.getItem('caltrans_token');
        if (token) {
            options.headers = options.headers || {};
            if (!options.headers['Authorization']) {
                options.headers['Authorization'] = `Bearer ${token}`;
            }
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            let errMsg = `Server error (${response.status})`;
            try {
                const errData = await response.json();
                errMsg = errData.error || errData.message || errMsg;
            } catch (e) {}
            throw new Error(errMsg);
        }
        return await response.json();
    }
};

window.DataService = DataService;
