/**
 * Data Service - Resilient Fetching with Mock Fallbacks
 * Ported from Clean Slate Rebuild
 */
const DataService = {
    fetch: async (endpoint, options = {}) => {
        const url = `${window.APP_CONFIG ? window.APP_CONFIG.API_URL : '/api'}${endpoint}`;

        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`CaltransBizConnect: Fetch failed for ${endpoint}:`, error);

            const isGet = !options.method || options.method.toUpperCase() === 'GET';
            const useMock = (window.APP_CONFIG && window.APP_CONFIG.FEATURES) ? window.APP_CONFIG.FEATURES.USE_MOCK_FALLBACK : true;

            if (useMock && isGet) {
                console.info(`CaltransBizConnect: Returning mock fallback for ${endpoint}`);
                return DataService.getMockData(endpoint);
            }
            throw error;
        }
    },

    getMockData: (endpoint) => {
        const mocks = {
            '/opportunities': [
                { id: 1, title: 'Bridge Maintenance - District 4', category: 'Engineering', district: '4', status: 'open', postedDate: '2025-01-25' },
                { id: 2, title: 'I-5 Highway Landscaping', category: 'Maintenance', district: '3', status: 'open', postedDate: '2025-01-28' },
                { id: 3, title: 'Emergency Roadside Assistance', category: 'Safety', district: '7', status: 'open', postedDate: '2025-01-30' }
            ],
            '/applications/vendor/': [
                { id: 101, opportunity_title: 'Bridge Maintenance', status: 'pending', applied_date: '2025-01-20' },
                { id: 102, opportunity_title: 'Roadway Striping', status: 'awarded', applied_date: '2024-12-15' }
            ],
            '/admin/users': [
                { id: 1, name: 'BuildIT SBE', email: 'contact@buildit.com', role: 'vendor', status: 'active' },
                { id: 2, name: 'Sacramento Paving', email: 'office@sacpaving.com', role: 'vendor', status: 'active' },
                { id: 3, name: 'District 4 Office', email: 'd4@dot.ca.gov', role: 'agency', status: 'active' }
            ],
            '/vendors': [
                { id: 1, business_name: 'Vertex Construction', districts: ['04'], services: ['Highway Construction', 'Bridge Engineering'] },
                { id: 2, business_name: 'Bay Area Environmental', districts: ['04'], services: ['Environmental Impact Assessment'] }
            ]
        };

        // Simple pattern matching for mock data
        for (const key in mocks) {
            if (endpoint.startsWith(key)) return mocks[key];
        }

        return [];
    }
};

window.DataService = DataService;
