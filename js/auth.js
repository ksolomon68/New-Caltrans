/**
 * Authentication Module
 * Handles login, registration, and session management (client-side demo)
 */

console.log('CaltransBizConnect: Auth module initialized.');

// Helper to check if localStorage is available
function isStorageAvailable() {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        console.error('CaltransBizConnect: Local storage is not available. Persistence features will be disabled.', e);
        return false;
    }
}

// Simulated user database (in production, this would be server-side)
const users = {
    vendors: [],
    agencies: []
};

const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : '/api';

// Check if user is logged in
function isLoggedIn() {
    return localStorage.getItem('caltrans_user') !== null;
}

// Get current user
function getCurrentUser() {
    const userJson = localStorage.getItem('caltrans_user');
    return userJson ? JSON.parse(userJson) : null;
}

// Helper to safely parse JSON or handle common non-JSON server errors
async function safeParseJson(response) {
    const contentType = response.headers.get("content-type");
    try {
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return await response.json();
        } else {
            const text = await response.text();
            console.warn('Non-JSON response received:', text.substring(0, 1000));

            if (response.status === 404) {
                return { error: `Endpoint not found (404). Check API_URL: ${API_URL}` };
            }

            // Capture specific server errors or blank pages
            if (response.status === 503) {
                if (text.includes("Database Connection Error")) {
                    return { error: "Database Connection Error: The server could not connect to its data storage. This is likely a configuration issue on Hostinger." };
                }
                return { error: `Server API is currently unavailable (Status: 503). Server Response: ${text.substring(0, 200)}...` };
            }

            if (text.includes("It works!") || text.includes("<!DOCTYPE html>")) {
                return { error: `Server API is returning a static HTML page instead of JSON. (Status: ${response.status}). This often means the custom domain is not correctly routing to the Node.js application.` };
            }

            return { error: text.substring(0, 300) || 'Server returned an invalid response.' };
        }
    } catch (e) {
        console.error('Parsing error:', e);
        return { error: 'Failed to process server response.' };
    }
}

// Login function
async function login(email, password) {
    console.log('CaltransBizConnect: Attempting login for:', email);
    try {
        const finalUrl = `${API_URL}/auth/login`;
        console.log('CaltransBizConnect: Fetching URL:', finalUrl);

        const response = await fetch(finalUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await safeParseJson(response);

        if (!response.ok || data.success === false) {
            let errorMsg = data.message || data.error || `Server Error (${response.status})`;
            if (data.details) errorMsg += `: ${data.details}`;
            if (data.hint) errorMsg += `\n\nHint: ${data.hint}`;

            const error = new Error(errorMsg);
            if (data.debug) error.debug = data.debug;
            throw error;
        }

        const userData = data.user || data; // Handle both nested and flat for safety
        localStorage.setItem('caltrans_user', JSON.stringify(userData));
        console.log('CaltransBizConnect: User logged in:', userData.email);
        return userData;
    } catch (error) {
        console.error('CaltransBizConnect Login error detail:', error);

        // Handle specific network errors
        if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('NetworkError'))) {
            throw new Error(`Connection Error: Unable to reach the authentication server at ${finalUrl}. Please ensure the API server is running on port 3001.`);
        }

        if (window.location.protocol === 'https:' && API_URL.startsWith('http:')) {
            throw new Error('Security Error: Mixed content blocked. The dashboard is on HTTPS but trying to connect to an insecure HTTP API.');
        }

        throw error;
    }
}

// Logout function
window.logout = function () {
    localStorage.removeItem('caltrans_user');
    window.location.href = 'index.html';
}

// Register vendor
async function registerVendor(formData) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, type: 'vendor' })
        });

        const data = await safeParseJson(response);

        if (!response.ok || data.success === false) {
            throw new Error(data.message || data.error || 'Registration failed');
        }

        const user = data.user || data;
        localStorage.setItem('caltrans_user', JSON.stringify(user));
        console.log('CaltransBizConnect: Vendor registered:', user.businessName || user.email);
        return user;
    } catch (error) {
        // Mock fallback if API is unreachable
        if (error.message.includes('Failed to fetch') || error.message.includes('Server API is not responding')) {
            console.warn('API Unreachable. Triggering Mock Fallback.');
            const mockUser = {
                id: 'v-' + Date.now(),
                ...formData,
                type: 'vendor',
                password: null
            };
            localStorage.setItem('caltrans_user', JSON.stringify(mockUser));
            return mockUser;
        }
        throw error;
    }
}

// Register agency
async function registerAgency(formData) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, type: 'agency' })
        });

        const data = await safeParseJson(response);

        if (!response.ok || data.success === false) {
            throw new Error(data.message || data.error || 'Registration failed');
        }

        const user = data.user || data;
        localStorage.setItem('caltrans_user', JSON.stringify(user));
        console.log('CaltransBizConnect: Agency registered:', user.organizationName || user.email);
        return user;
    } catch (error) {
        // Mock fallback if API is unreachable
        if (error.message.includes('Failed to fetch') || error.message.includes('Server API is not responding')) {
            console.warn('API Unreachable. Triggering Mock Fallback.');
            const mockUser = {
                id: 'a-' + Date.now(),
                ...formData,
                type: 'agency',
                password: null
            };
            localStorage.setItem('caltrans_user', JSON.stringify(mockUser));
            return mockUser;
        }
        throw error;
    }
}

// Redirect based on user type
function redirectToDashboard(user) {
    if (user.type === 'admin') {
        window.location.href = 'dashboard-admin.html';
    } else if (user.type === 'vendor') {
        window.location.href = 'dashboard-vendor.html';
    } else if (user.type === 'agency') {
        window.location.href = 'dashboard-agency.html';
    }
}

// Login form handler
document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Validate
            if (!email || !password) {
                showErrorMessage('Please complete all required fields.', loginForm.parentElement);
                return;
            }

            if (!validateEmail(email)) {
                showErrorMessage('Please enter a valid email address.', loginForm.parentElement);
                return;
            }

            // Attempt login
            try {
                login(email, password)
                    .then(user => redirectToDashboard(user))
                    .catch(error => {
                        showErrorMessage(error.message, loginForm.parentElement);
                    });
            } catch (error) {
                showErrorMessage('Invalid email or password. Please try again.', loginForm.parentElement);
            }
        });
    }

    // Vendor registration form handler
    const vendorRegForm = document.getElementById('vendorRegistrationForm');

    if (vendorRegForm) {
        vendorRegForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const submitBtn = vendorRegForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Account...';

            // Gather Data (Matching HTML IDs)
            const formData = {
                businessName: document.getElementById('businessName').value,
                legalStructure: document.getElementById('legalStructure').value,
                ein: document.getElementById('ein').value,
                businessAddress: document.getElementById('businessAddress').value,
                city: document.getElementById('city').value,
                zipCode: document.getElementById('zipCode').value,
                businessPhone: document.getElementById('businessPhone').value,
                website: document.getElementById('businessWebsite').value,
                contactName: `${document.getElementById('firstName').value} ${document.getElementById('lastName').value}`,
                title: document.getElementById('title').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                password: document.getElementById('password').value,
                confirmPassword: document.getElementById('confirmPassword').value,
                isSBE: document.getElementById('isSBE').checked,
                certificationNumber: document.getElementById('sbeNumber') ? document.getElementById('sbeNumber').value : null
            };

            if (formData.password !== formData.confirmPassword) {
                showErrorMessage('Passwords do not match.', vendorRegForm.parentElement);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }

            registerVendor(formData)
                .then(user => {
                    alert('Account created successfully! Redirecting...');
                    window.location.href = 'dashboard-vendor.html';
                })
                .catch(error => {
                    showErrorMessage(error.message, vendorRegForm.parentElement);
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                });
        });
    }

    // Agency registration form handler
    const agencyRegForm = document.getElementById('agencyRegistrationForm');

    if (agencyRegForm) {
        agencyRegForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const submitBtn = agencyRegForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Account...';

            // Gather Data (Matching HTML IDs)
            const formData = {
                organizationType: document.getElementById('organizationType').value,
                organizationName: document.getElementById('organizationName').value,
                district: document.getElementById('district') ? document.getElementById('district').value : null,
                address: document.getElementById('address').value,
                city: document.getElementById('city').value,
                zipCode: document.getElementById('zipCode').value,
                businessPhone: document.getElementById('phone').value,
                contactName: `${document.getElementById('firstName').value} ${document.getElementById('lastName').value}`,
                title: document.getElementById('title').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('contactPhone').value,
                password: document.getElementById('password').value,
                confirmPassword: document.getElementById('confirmPassword').value
            };

            if (formData.password !== formData.confirmPassword) {
                showErrorMessage('Passwords do not match.', agencyRegForm.parentElement);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }

            registerAgency(formData)
                .then(user => {
                    alert('Account created successfully! Redirecting...');
                    window.location.href = 'dashboard-agency.html';
                })
                .catch(error => {
                    showErrorMessage(error.message, agencyRegForm.parentElement);
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                });
        });
    }
});

// Protect dashboard pages
function protectPage(requiredType) {
    const user = getCurrentUser();

    if (!user) {
        window.location.href = 'login.html';
        return null;
    }

    if (requiredType && user.type !== requiredType) {
        window.location.href = 'login.html';
        return null;
    }

    return user;
}

// Sync navigation header based on auth state
function syncNavHeader() {
    const user = getCurrentUser();
    const navUl = document.querySelector('.main-nav ul');
    if (!navUl) return;

    const loginBtn = navUl.querySelector('a[href="login.html"]');
    if (user && loginBtn) {
        const li = loginBtn.parentElement;
        let dashboardUrl = 'dashboard-vendor.html';
        if (user.type === 'agency') dashboardUrl = 'dashboard-agency.html';
        if (user.type === 'admin') dashboardUrl = 'dashboard-admin.html';

        li.innerHTML = `<a href="${dashboardUrl}" class="btn btn-primary btn-small">Dashboard</a>`;
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function () {
    syncNavHeader();

    // If on login page and already logged in, redirect
    if (window.location.pathname.endsWith('login.html') && isLoggedIn()) {
        console.log('CaltransBizConnect: Already logged in, redirecting to dashboard.');
        redirectToDashboard(getCurrentUser());
    }

    if (!isStorageAvailable()) {
        const warning = document.createElement('div');
        warning.className = 'alert alert-error';
        warning.style.margin = '20px';
        warning.innerHTML = '<strong>Warning:</strong> Local storage is disabled in your browser. Your login and profile changes will not be saved. Please enable site data / cookies to use this prototype.';
        document.body.prepend(warning);
    }
});
// Export module globally
window.Auth = {
    isLoggedIn,
    getUser: getCurrentUser,
    login,
    logout: window.logout,
    registerVendor,
    registerAgency,
    redirectToDashboard,
    protectPage,
    syncNavHeader
};
