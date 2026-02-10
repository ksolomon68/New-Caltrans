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
            <div class="sidebar-logo" style="padding: 1.5rem; text-align: center; border-bottom: 1px solid var(--color-border);">
                <a href="index.html" style="text-decoration: none; display: block;">
                    <img src="assets/caltrans-logo.png" alt="Caltrans" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">
                </a>
            </div>
            <nav class="sidebar-nav" style="padding: 1rem 0;">
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
            <div class="sidebar-footer" style="position: absolute; bottom: 0; width: 100%; padding: 1.5rem; border-top: 1px solid var(--color-border);">
                <button onclick="if(typeof logout === 'function') { logout() } else { localStorage.removeItem('caltrans_user'); window.location.href='index.html'; }" 
                    class="btn-style-none" style="width: 100%; color: var(--text-primary); border: none !important; box-shadow: none !important; text-align: left; padding: 1rem 1.5rem; background: transparent !important; cursor: pointer; display: flex; align-items: center; gap: 0.75rem; font-weight: 500;">
                    <span style="font-size: 1.25rem;">📬</span> Sign Out
                </button>
            </div>
        `;

        sidebar.innerHTML = html;
        sidebar.className = 'sidebar active'; // Ensure visible on desktop
    },

    renderHeader(role) {
        const header = document.getElementById('header-top') || document.querySelector('.header-top');
        if (!header) return;

        const user = JSON.parse(localStorage.getItem('caltrans_user')) || { name: 'Portal User' };
        const userName = user.business_name || user.organization_name || user.contact_name || user.name || 'User';

        header.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <button id="mobile-toggle" aria-label="Toggle Navigation">☰</button>
                <div style="font-weight: 700; color: var(--color-primary); font-size: 1.25rem;">CALTRANS <span style="font-weight: 400; color: var(--color-text-muted);">| BizConnect</span></div>
            </div>
            <div style="display: flex; align-items: center; gap: 1.5rem;">
                <div style="text-align: right; display: none; @media (min-width: 768px) { display: block; }">
                    <div style="font-weight: 600; font-size: 0.9rem;">${userName}</div>
                    <div style="font-size: 0.75rem; color: var(--color-text-muted); text-transform: capitalize;">${role} Role</div>
                </div>
                <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--color-bg-secondary); display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--color-primary); border: 2px solid var(--color-secondary);">
                    ${userName.charAt(0).toUpperCase()}
                </div>
            </div>
        `;
    },

    setupMobileToggle() {
        const toggle = document.getElementById('mobile-toggle');
        const sidebar = document.querySelector('.sidebar');
        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
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
