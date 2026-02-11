/**
 * CaltransBizConnect Navigation Component (Refactored)
 * Dynamically renders sidebars and headers based on user roles.
 */

const Navigation = {
    // Role configurations
    config: {
        vendor: {
            title: 'Vendor Portal',
            items: [
                { label: 'Search Opportunities', href: 'search-opportunities.html', icon: '🏢' },
                { label: 'Saved Items', href: 'saved-opportunities.html', icon: '⭐' },
                { label: 'Messages', href: 'messages.html', icon: '✉️' },
                { label: 'My Profile', href: 'vendor-profile.html', icon: '👤' }
            ]
        },
        agency: {
            title: 'Agency Portal',
            items: [
                { label: 'Dashboard', href: 'dashboard-agency.html', icon: '🏠' },
                { label: 'Post Opportunity', href: 'post-opportunity.html', icon: '➕' },
                { label: 'Manage Postings', href: 'manage-opportunities.html', icon: '📂' },
                { label: 'Search Vendors', href: 'search-vendors.html', icon: '🔍' },
                { label: 'Messages', href: 'messages.html', icon: '📬' },
                { label: 'Analytics', href: 'agency-analytics.html', icon: '📈' },
                { label: 'Settings', href: 'agency-settings.html', icon: '⚙️' }
            ]
        },
        admin: {
            title: 'Admin Console',
            items: [
                { label: 'Dashboard', href: 'dashboard-admin.html', icon: '🏠' },
                { label: 'User Management', href: 'admin-users.html', icon: '👥' },
                { label: 'Opportunity Approval', href: 'manage-opportunities.html', icon: '✅' },
                { label: 'Messages', href: 'messages.html', icon: '📬' },
                { label: 'System Settings', href: 'agency-settings.html', icon: '⚙️' }
            ]
        },
        staff: {
            title: 'Staff Dashboard',
            items: [
                { label: 'Overview', href: 'dashboard-caltrans.html', icon: '🏠' },
                { label: 'Analytics', href: 'agency-analytics.html', icon: '📈' },
                { label: 'Support Services', href: 'support-services.html', icon: '🎧' },
                { label: 'Search Vendors', href: 'search-vendors.html', icon: '🔍' }
            ]
        }
    },

    _isMobile() {
        return window.innerWidth <= 1024;
    },

    init(role) {
        // Fallback to localStorage if no role provided
        if (!role) {
            const user = JSON.parse(localStorage.getItem('caltrans_user'));
            role = user ? user.type : 'vendor';
        }

        this.renderSidebar(role);
        this.renderHeader(role);
        this.setupMobileToggle();
    },

    renderSidebar(role) {
        const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
        if (!sidebar) return;

        const config = this.config[role] || this.config.vendor;
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';

        let html = `
            <div class="sidebar-brand">
                <button class="sidebar-close-btn" aria-label="Close menu">&times;</button>
            </div>
            <nav class="sidebar-nav" style="padding: 1rem 0; flex: 1; overflow-y: auto;">
                <div style="padding: 0 1.5rem 0.5rem; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">
                    ${config.title}
                </div>
        `;

        config.items.forEach(item => {
            const isActive = currentPath === item.href ? 'active' : '';
            html += `
                <a href="${item.href}" class="nav-item ${isActive}" style="
                    display: flex; 
                    align-items: center; 
                    gap: 0.75rem; 
                    padding: 0.875rem 1.5rem; 
                    color: var(--text-primary); 
                    text-decoration: none;
                    background: ${isActive ? 'var(--color-bg-tertiary)' : 'transparent'};
                    border-left: 4px solid ${isActive ? 'var(--color-primary)' : 'transparent'};
                ">
                    <span style="font-size: 1.25rem;">${item.icon}</span>
                    <span style="font-weight: 500;">${item.label}</span>
                </a>
            `;
        });

        html += `
            </nav>
            <div class="sidebar-footer">
                <a href="index.html" class="sidebar-footer-link">
                    <span style="font-size: 1.25rem;">🌐</span> Back to Public Site
                </a>
                <button onclick="if(typeof logout === 'function') { logout() } else { localStorage.removeItem('caltrans_user'); window.location.href='index.html'; }" 
                    class="sidebar-footer-link sidebar-signout-btn">
                    <span style="font-size: 1.25rem;">🚪</span> Sign Out
                </button>
            </div>
        `;

        sidebar.innerHTML = html;

        // On desktop, sidebar is always visible via CSS (no 'active' needed).
        // On mobile, sidebar starts hidden (no 'active' class).
        sidebar.className = 'sidebar';

        // Close button inside sidebar (mobile only)
        const closeBtn = sidebar.querySelector('.sidebar-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSidebar());
        }
    },

    renderHeader(role) {
        const header = document.getElementById('header-top') || document.querySelector('.header-top');
        if (!header) return;

        const user = JSON.parse(localStorage.getItem('caltrans_user')) || { name: 'Portal User' };
        const userName = user.business_name || user.organization_name || user.contact_name || user.name || 'User';

        header.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <button id="mobile-toggle" class="mobile-toggle-btn" aria-label="Open navigation menu">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="4" y1="12" x2="20" y2="12"></line>
                        <line x1="4" y1="6" x2="20" y2="6"></line>
                        <line x1="4" y1="18" x2="20" y2="18"></line>
                    </svg>
                </button>
                <div class="header-logo" style="display: flex; align-items: center;">
                    <a href="index.html" style="text-decoration: none; display: flex; align-items: center;">
                        <img src="assets/caltrans-logo.png" alt="Caltrans" style="height: 32px; width: auto; display: block;">
                        <span style="font-weight: 700; color: var(--color-primary); font-size: 1.1rem; letter-spacing: -0.01em; margin-left: 0.5rem; border-left: 1px solid var(--color-border); padding-left: 0.5rem;">BizConnect</span>
                    </a>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div class="header-user-info">
                    <div style="font-weight: 600; font-size: 0.9rem;">${userName}</div>
                    <div style="font-size: 0.75rem; color: var(--color-text-muted); text-transform: capitalize;">${role} Role</div>
                </div>
                <div class="header-avatar">
                    ${userName.charAt(0).toUpperCase()}
                </div>
                <button class="mobile-signout-btn" onclick="if(typeof logout === 'function') { logout() } else { localStorage.removeItem('caltrans_user'); window.location.href='index.html'; }" aria-label="Sign Out" title="Sign Out">
                    🚪
                </button>
            </div>
        `;
    },

    openSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scroll behind
    },

    closeSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    },

    setupMobileToggle() {
        const toggle = document.getElementById('mobile-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => this.openSidebar());
        }

        // Create overlay for closing sidebar when clicked outside
        if (!document.getElementById('sidebar-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'sidebar-overlay';
            overlay.className = 'sidebar-overlay';
            overlay.addEventListener('click', () => this.closeSidebar());
            document.body.appendChild(overlay);
        }
    }
};

// Global init trigger
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('caltrans_user'));
    if (user && user.type) {
        Navigation.init(user.type);
    }
});
