/**
 * Admin CMS JavaScript — CaltransBizConnect
 *
 * Provides the full single-page admin interface for:
 *  • Editing page content (sections, fields, images)
 *  • Managing the media library (upload, select, delete)
 *  • Editing global settings (navigation, footer, external links)
 *  • Building new pages from component templates
 *  • Style-guide enforcement (font, font-size, alt-text)
 *
 * Authentication: uses JWT bearer token issued by /api/cms/login.
 * Credentials are stored in sessionStorage (cleared on tab close).
 *
 * @module admin-cms
 */

'use strict';

// ── Config ─────────────────────────────────────────────────────────────────
const API = (window.APP_CONFIG && window.APP_CONFIG.API_URL) || '/api';

/** @type {{ email: string } | null} */
let currentAdmin = null;

/** @type {object|null} currently loaded page data */
let activePage = null;
/** @type {string|null} slug of the active page */
let activeSlug = null;
/** @type {object|null} global settings data */
let globalData  = null;
/** @type {object|null} component schema */
let schemaData  = null;
/** @type {string|null} id of currently edited section */
let activeSection = null;

// ── Bootstrap ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const saved = sessionStorage.getItem('cms_admin');
    if (saved) {
        currentAdmin = JSON.parse(saved);
        showShell();
    } else {
        showLoginScreen();
    }
});

// ── Login ──────────────────────────────────────────────────────────────────
function showLoginScreen() {
    document.getElementById('cms-app').innerHTML = `
    <div class="cms-login-screen" role="main">
      <div class="cms-login-card">
        <img src="images/caltrans-logo.png" alt="CaltransBizConnect Logo">
        <h1>CMS Admin</h1>
        <p>Sign in with your admin account to manage site content.</p>
        <div id="login-error" class="cms-alert cms-alert-error cms-hidden" role="alert"></div>
        <form id="cms-login-form" novalidate>
          <div class="cms-form-group" style="text-align:left">
            <label class="cms-label cms-label-required" for="login-email">Email</label>
            <input class="cms-input" type="email" id="login-email" autocomplete="username" required>
          </div>
          <div class="cms-form-group" style="text-align:left">
            <label class="cms-label cms-label-required" for="login-password">Password</label>
            <input class="cms-input" type="password" id="login-password" autocomplete="current-password" required>
          </div>
          <button type="submit" class="cms-btn cms-btn-primary cms-w100">
            <span id="login-spinner" class="cms-spinner cms-hidden" aria-hidden="true"></span>
            Sign In
          </button>
        </form>
      </div>
    </div>`;

    document.getElementById('cms-login-form').addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl  = document.getElementById('login-error');
    const spinner  = document.getElementById('login-spinner');

    errorEl.classList.add('cms-hidden');
    spinner.classList.remove('cms-hidden');

    try {
        const res = await fetch(`${API}/cms/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Login failed');

        currentAdmin = { email, token: data.token };
        sessionStorage.setItem('cms_admin', JSON.stringify(currentAdmin));
        showShell();
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('cms-hidden');
    } finally {
        spinner.classList.add('cms-hidden');
    }
}

// ── Shell ──────────────────────────────────────────────────────────────────
async function showShell() {
    document.getElementById('cms-app').innerHTML = `
    <div class="cms-shell">

      <!-- Header -->
      <header class="cms-header" role="banner">
        <a href="index.html" class="cms-header-brand" target="_blank" rel="noopener">
          <img src="images/caltrans-logo.png" alt="CaltransBizConnect">
          <span>CMS Admin</span>
        </a>
        <div class="cms-header-actions">
          <span class="cms-header-user" aria-label="Logged in as ${escHtml(currentAdmin.email)}">
            ${escHtml(currentAdmin.email)}
          </span>
          <button class="cms-btn cms-btn-sm" id="change-password-btn"
                  style="background:rgba(255,255,255,.15);color:#fff;border-color:transparent">
            Change Password
          </button>
          <button class="cms-btn cms-btn-sm" id="logout-btn"
                  style="background:rgba(255,255,255,.15);color:#fff;border-color:transparent">
            Log out
          </button>
        </div>
      </header>

      <!-- Sidebar -->
      <nav class="cms-sidebar cms-nav" id="cms-sidebar" aria-label="CMS navigation">
        <div class="cms-nav-section">
          <span class="cms-nav-label">Pages</span>
          <ul class="cms-page-list" id="page-nav-list" aria-label="Page list">
            <li><a href="#" data-tab="pages" class="active">
              <span aria-hidden="true">📄</span> All Pages
            </a></li>
          </ul>
        </div>
        <div class="cms-nav-section">
          <span class="cms-nav-label">Site</span>
          <ul class="cms-page-list">
            <li><a href="#" data-tab="faqs"><span aria-hidden="true">❓</span> FAQ Manager</a></li>
            <li><a href="#" data-tab="global"><span aria-hidden="true">⚙️</span> Global Settings</a></li>
            <li><a href="#" data-tab="media"><span aria-hidden="true">🖼️</span> Media Library</a></li>
            <li><a href="#" data-tab="builder"><span aria-hidden="true">🏗️</span> Page Builder</a></li>
          </ul>
        </div>
        <div class="cms-nav-section" style="padding:0 1rem;margin-top:1rem">
          <a href="index.html" target="_blank" rel="noopener"
             class="cms-btn cms-btn-secondary cms-btn-sm cms-w100"
             style="justify-content:center">
            ↗ View Live Site
          </a>
        </div>
      </nav>

      <!-- Main -->
      <main class="cms-main" id="cms-main" role="main">
        <div class="cms-loading-state">
          <div class="cms-spinner" aria-hidden="true"></div>
          Loading CMS…
        </div>
      </main>
    </div>

    <!-- Toast container -->
    <div id="cms-toast-container" role="status" aria-live="polite" aria-atomic="true"></div>
    `;

    // Wire up events
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('change-password-btn').addEventListener('click', showChangePasswordModal);

    document.querySelectorAll('[data-tab]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const tab = link.getAttribute('data-tab');
            setActiveNavLink(link);
            navigateTab(tab);
        });
    });

    // Load initial data
    await Promise.all([loadSchema(), loadGlobal()]);
    navigateTab('pages');
}

function setActiveNavLink(activeLink) {
    document.querySelectorAll('.cms-sidebar [data-tab]').forEach(l => l.classList.remove('active'));
    activeLink.classList.add('active');
}

function handleLogout() {
    sessionStorage.removeItem('cms_admin');
    currentAdmin = null;
    showLoginScreen();
}

function showChangePasswordModal() {
    const existing = document.getElementById('cms-change-pw-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'cms-change-pw-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:#fff;border-radius:8px;padding:2rem;width:360px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,.2);">
            <h2 style="margin:0 0 1.5rem;font-size:1.2rem;">Change CMS Password</h2>
            <div style="margin-bottom:1rem;">
                <label style="display:block;font-size:.85rem;font-weight:600;margin-bottom:.25rem;">Current Password</label>
                <input type="password" id="cp-current" class="cms-input" style="width:100%;box-sizing:border-box;" autocomplete="current-password">
            </div>
            <div style="margin-bottom:1rem;">
                <label style="display:block;font-size:.85rem;font-weight:600;margin-bottom:.25rem;">New Password</label>
                <input type="password" id="cp-new" class="cms-input" style="width:100%;box-sizing:border-box;" autocomplete="new-password">
            </div>
            <div style="margin-bottom:1.5rem;">
                <label style="display:block;font-size:.85rem;font-weight:600;margin-bottom:.25rem;">Confirm New Password</label>
                <input type="password" id="cp-confirm" class="cms-input" style="width:100%;box-sizing:border-box;" autocomplete="new-password">
            </div>
            <div id="cp-error" style="display:none;color:#c62828;font-size:.85rem;margin-bottom:1rem;"></div>
            <div style="display:flex;gap:.75rem;justify-content:flex-end;">
                <button id="cp-cancel" class="cms-btn" style="background:#f5f5f5;color:#333;border-color:#ddd;">Cancel</button>
                <button id="cp-submit" class="cms-btn cms-btn-primary">Update Password</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('cp-cancel').onclick = () => modal.remove();
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    document.getElementById('cp-submit').onclick = async () => {
        const current = document.getElementById('cp-current').value;
        const newPw = document.getElementById('cp-new').value;
        const confirm = document.getElementById('cp-confirm').value;
        const errorEl = document.getElementById('cp-error');
        errorEl.style.display = 'none';

        if (!current || !newPw || !confirm) {
            errorEl.textContent = 'All fields are required.'; errorEl.style.display = 'block'; return;
        }
        if (newPw.length < 8) {
            errorEl.textContent = 'New password must be at least 8 characters.'; errorEl.style.display = 'block'; return;
        }
        if (newPw !== confirm) {
            errorEl.textContent = 'New passwords do not match.'; errorEl.style.display = 'block'; return;
        }

        const btn = document.getElementById('cp-submit');
        btn.disabled = true; btn.textContent = 'Saving…';

        try {
            await apiFetch('POST', '/cms/change-password', { currentPassword: current, newPassword: newPw });
            modal.remove();
            showToast('Password updated successfully.', 'success');
        } catch (err) {
            errorEl.textContent = err.message; errorEl.style.display = 'block';
            btn.disabled = false; btn.textContent = 'Update Password';
        }
    };
}

// ── Tab Navigation ─────────────────────────────────────────────────────────
async function navigateTab(tab, extra) {
    const main = document.getElementById('cms-main');
    switch (tab) {
        case 'pages':   await renderPagesList(main);          break;
        case 'edit':    await renderPageEditor(main, extra);  break;
        case 'faqs':    await renderFAQManager(main);         break;
        case 'global':  await renderGlobalSettings(main);     break;
        case 'media':   await renderMediaLibrary(main);       break;
        case 'builder': await renderPageBuilder(main);        break;
    }
}

// ── Pages List ─────────────────────────────────────────────────────────────
async function renderPagesList(container) {
    container.innerHTML = `<div class="cms-loading-state"><div class="cms-spinner"></div> Loading pages…</div>`;
    try {
        const pages = await apiFetch('GET', '/cms/pages');
        container.innerHTML = `
        <div class="cms-flex-between cms-mb">
          <h2 style="margin:0;color:var(--cms-primary)">Pages</h2>
          <button class="cms-btn cms-btn-secondary" id="new-page-btn">+ New Page</button>
        </div>
        <div class="cms-panel">
          <div class="cms-panel-body">
            ${pages.length === 0
                ? `<p class="cms-text-muted">No pages found. Content JSON files should be in <code>content/pages/</code>.</p>`
                : `<ul class="cms-section-list" role="list">
                    ${pages.map(p => `
                      <li class="cms-section-item" role="listitem">
                        <span class="cms-section-item-title">${escHtml(p.title)}</span>
                        <span class="cms-badge ${p.isSystem ? 'cms-badge-system' : 'cms-badge-custom'}">
                          ${p.isSystem ? 'System' : 'Custom'}
                        </span>
                        <span class="cms-text-muted cms-text-sm">/${p.slug}</span>
                        <div class="cms-section-actions">
                          <button class="cms-btn cms-btn-primary cms-btn-sm"
                                  data-edit-slug="${escHtml(p.slug)}">Edit</button>
                          ${!p.isSystem
                            ? `<button class="cms-btn cms-btn-danger cms-btn-sm"
                                       data-delete-slug="${escHtml(p.slug)}">Delete</button>`
                            : ''}
                        </div>
                      </li>`).join('')}
                  </ul>`
            }
          </div>
        </div>`;

        container.querySelectorAll('[data-edit-slug]').forEach(btn => {
            btn.addEventListener('click', () => {
                const slug = btn.getAttribute('data-edit-slug');
                setActiveNavLink(document.querySelector('[data-tab="pages"]') || document.createElement('a'));
                navigateTab('edit', slug);
            });
        });

        container.querySelectorAll('[data-delete-slug]').forEach(btn => {
            btn.addEventListener('click', () => confirmDeletePage(btn.getAttribute('data-delete-slug')));
        });

        const newBtn = document.getElementById('new-page-btn');
        if (newBtn) newBtn.addEventListener('click', showNewPageModal);

    } catch (err) {
        container.innerHTML = `<div class="cms-alert cms-alert-error">Failed to load pages: ${escHtml(err.message)}</div>`;
    }
}

// ── Page Editor ────────────────────────────────────────────────────────────
async function renderPageEditor(container, slug) {
    container.innerHTML = `<div class="cms-loading-state"><div class="cms-spinner"></div> Loading page "${slug}"…</div>`;
    try {
        const page = await apiFetch('GET', `/cms/pages/${slug}`);
        activePage  = page;
        activeSlug  = slug;
        activeSection = null;

        container.innerHTML = `
        <div class="cms-flex-between cms-mb">
          <div class="cms-flex cms-gap">
            <button class="cms-btn cms-btn-outline cms-btn-sm" id="back-to-pages">← Back</button>
            <h2 style="margin:0;color:var(--cms-primary)">
              Edit: ${escHtml(page.meta?.title || slug)}
              <span class="cms-badge ${page.isSystem ? 'cms-badge-system' : 'cms-badge-custom'} cms-text-sm">
                ${page.isSystem ? 'System' : 'Custom'}
              </span>
            </h2>
          </div>
          <button class="cms-btn cms-btn-secondary" id="save-page-btn">💾 Save All Changes</button>
        </div>

        <!-- Meta & Header -->
        <div class="cms-panel">
          <div class="cms-panel-header">
            <h3 class="cms-panel-title">Page Meta & Header</h3>
          </div>
          <div class="cms-panel-body">
            <div class="cms-settings-grid">
              ${fieldInput('meta.title',       'Page Title (browser tab)',  page.meta?.title       || '', 'text', 160, true)}
              ${fieldInput('meta.description', 'Meta Description (SEO)',   page.meta?.description || '', 'textarea', 320)}
              ${fieldInput('header.logoImage', 'Logo Image Path',          page.header?.logoImage || '', 'text', 200)}
              ${mediaField('header.backgroundImage', 'Header Background Image',
                           page.header?.backgroundImage || '', '16:5', 'Recommended 1600×500px. Leave blank to use default.')}
            </div>
          </div>
        </div>

        <!-- Sections -->
        <div class="cms-panel">
          <div class="cms-panel-header">
            <h3 class="cms-panel-title">Content Sections</h3>
            <button class="cms-btn cms-btn-outline cms-btn-sm" id="add-section-btn">+ Add Section</button>
          </div>
          <div class="cms-panel-body">
            <ul class="cms-section-list" id="section-list" role="list">
              ${(page.sections || []).map(s => renderSectionItem(s)).join('')}
            </ul>
            ${(page.sections || []).length === 0
              ? '<p class="cms-text-muted">No sections yet. Click "Add Section" to start building.</p>'
              : ''}
          </div>
        </div>

        <!-- Field editor (populated on section click) -->
        <div class="cms-panel cms-hidden" id="field-editor-panel">
          <div class="cms-panel-header">
            <h3 class="cms-panel-title" id="field-editor-title">Edit Section</h3>
            <button class="cms-btn cms-btn-danger cms-btn-sm" id="delete-section-btn">Delete Section</button>
          </div>
          <div class="cms-panel-body" id="field-editor-body"></div>
        </div>
        `;

        document.getElementById('back-to-pages').addEventListener('click', () => navigateTab('pages'));
        document.getElementById('save-page-btn').addEventListener('click', savePageChanges);
        document.getElementById('add-section-btn').addEventListener('click', () => navigateTab('builder', slug));

        container.querySelectorAll('[data-section-edit]').forEach(btn => {
            btn.addEventListener('click', () => openSectionEditor(btn.getAttribute('data-section-edit')));
        });
        container.querySelectorAll('[data-section-move-up]').forEach(btn => {
            btn.addEventListener('click', () => moveSectionUp(btn.getAttribute('data-section-move-up')));
        });
        container.querySelectorAll('[data-section-move-down]').forEach(btn => {
            btn.addEventListener('click', () => moveSectionDown(btn.getAttribute('data-section-move-down')));
        });
        document.getElementById('delete-section-btn').addEventListener('click', () => {
            if (activeSection) deleteSection(activeSection);
        });

        // Char counters
        attachCharCounters(container);

        // Header background image picker
        const bgBtn = container.querySelector('[data-media-pick="header.backgroundImage"]');
        if (bgBtn) bgBtn.addEventListener('click', () => openMediaPicker('header.backgroundImage'));

    } catch (err) {
        container.innerHTML = `<div class="cms-alert cms-alert-error">Failed to load page: ${escHtml(err.message)}</div>`;
    }
}

function renderSectionItem(section) {
    const typeLabel = getSectionTypeLabel(section.type);
    const title     = section.fields?.heading || section.fields?.title || section.id;
    return `
    <li class="cms-section-item" id="si-${section.id}" role="listitem">
      <span class="cms-section-badge">${escHtml(typeLabel)}</span>
      <span class="cms-section-item-title">${escHtml(String(title))}</span>
      <div class="cms-section-actions">
        <button class="cms-btn cms-btn-sm cms-btn-outline" aria-label="Move up"
                data-section-move-up="${escHtml(section.id)}">↑</button>
        <button class="cms-btn cms-btn-sm cms-btn-outline" aria-label="Move down"
                data-section-move-down="${escHtml(section.id)}">↓</button>
        <button class="cms-btn cms-btn-primary cms-btn-sm"
                data-section-edit="${escHtml(section.id)}">Edit</button>
      </div>
    </li>`;
}

function openSectionEditor(sectionId) {
    activeSection = sectionId;
    const section = activePage.sections.find(s => s.id === sectionId);
    if (!section) return;

    const panel    = document.getElementById('field-editor-panel');
    const titleEl  = document.getElementById('field-editor-title');
    const bodyEl   = document.getElementById('field-editor-body');
    const schema   = schemaData?.componentTypes?.find(c => c.type === section.type);

    panel.classList.remove('cms-hidden');
    titleEl.textContent = `Edit: "${getSectionTypeLabel(section.type)}" — ${sectionId}`;

    // Highlight active section
    document.querySelectorAll('.cms-section-item').forEach(el => el.classList.remove('active'));
    const sItem = document.getElementById(`si-${sectionId}`);
    if (sItem) { sItem.classList.add('active'); sItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }

    bodyEl.innerHTML = buildFieldEditors(section, schema);

    // Wire media pickers
    bodyEl.querySelectorAll('[data-media-pick]').forEach(btn => {
        btn.addEventListener('click', () => openMediaPicker(btn.getAttribute('data-media-pick'), sectionId));
    });

    // Wire list editors (card-list, steps-list, tile-list, etc.)
    wireListEditors(bodyEl, section);

    attachCharCounters(bodyEl);
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Build form fields for a section based on its schema + current data.
 * @param {object} section
 * @param {object|null} schema
 * @returns {string} HTML string
 */
function buildFieldEditors(section, schema) {
    if (!schema) {
        return `<div class="cms-alert cms-alert-info">No schema found for type <strong>${section.type}</strong>.
          You can still edit via Global Settings or add a new schema entry in
          <code>content/schemas/component-types.json</code>.</div>`;
    }

    const fields = section.fields || {};
    let html = '<div class="cms-settings-grid">';

    schema.fields.forEach(f => {
        const val = getNestedVal(fields, f.key.split('.'));
        switch (f.inputType) {
            case 'text':
                html += fieldInput(`${section.id}.${f.key}`, f.label, val || '', 'text', f.maxLength, f.required, f.note);
                break;
            case 'textarea':
                html += fieldInput(`${section.id}.${f.key}`, f.label, val || '', 'textarea', f.maxLength, f.required, f.note);
                break;
            case 'url':
                html += fieldInput(`${section.id}.${f.key}`, f.label, val || '', 'url', null, f.required, f.note);
                break;
            case 'select':
                html += fieldSelect(`${section.id}.${f.key}`, f.label, val || '', f.options || [], f.required);
                break;
            case 'checkbox':
                html += fieldCheckbox(`${section.id}.${f.key}`, f.label, !!val);
                break;
            case 'media':
                html += mediaField(`${section.id}.${f.key}`, f.label, val || '', f.aspectRatio, f.note);
                break;
            case 'button':
                html += buttonGroupField(`${section.id}.${f.key}`, f.label, val || {});
                break;
            case 'card-list':
            case 'steps-list':
            case 'tile-list':
            case 'accordion-list':
            case 'cta-list':
            case 'string-list':
                html += listEditorField(`${section.id}.${f.key}`, f.label, val || [], f.inputType, schema);
                break;
            case 'pathway-card':
                html += pathwayCardField(`${section.id}.${f.key}`, f.label, val || {});
                break;
        }
    });

    html += '</div>';
    return html;
}

// ── Field HTML builders ────────────────────────────────────────────────────
function fieldInput(fieldKey, label, value, type = 'text', maxLength = null, required = false, hint = '') {
    const id   = `field-${fieldKey.replace(/\./g, '-')}`;
    const req  = required ? 'class="cms-label-required"' : '';
    const max  = maxLength ? `maxlength="${maxLength}"` : '';
    const isTA = type === 'textarea';
    const ctrl = isTA
        ? `<textarea class="cms-input cms-textarea" id="${id}" data-field="${escHtml(fieldKey)}" ${max}
             ${required ? 'required' : ''} rows="3">${escHtml(String(value))}</textarea>`
        : `<input class="cms-input" type="${type}" id="${id}" data-field="${escHtml(fieldKey)}"
             value="${escHtml(String(value))}" ${max} ${required ? 'required' : ''}>`;

    return `
    <div class="cms-form-group" style="grid-column: ${isTA ? '1/-1' : 'auto'}">
      <label class="cms-label ${req}" for="${id}">${escHtml(label)}</label>
      ${ctrl}
      ${hint ? `<p class="cms-input-hint">${escHtml(hint)}</p>` : ''}
      ${maxLength ? `<p class="cms-char-count" data-max="${maxLength}" data-for="${id}">0/${maxLength}</p>` : ''}
    </div>`;
}

function fieldSelect(fieldKey, label, value, options, required = false) {
    const id  = `field-${fieldKey.replace(/\./g, '-')}`;
    const req = required ? 'class="cms-label-required"' : '';
    const opts = options.map(o =>
        `<option value="${escHtml(o)}" ${o === value ? 'selected' : ''}>${escHtml(o)}</option>`
    ).join('');
    return `
    <div class="cms-form-group">
      <label class="cms-label ${req}" for="${id}">${escHtml(label)}</label>
      <select class="cms-input cms-select" id="${id}" data-field="${escHtml(fieldKey)}" ${required ? 'required' : ''}>
        ${opts}
      </select>
    </div>`;
}

function fieldCheckbox(fieldKey, label, checked) {
    const id = `field-${fieldKey.replace(/\./g, '-')}`;
    return `
    <div class="cms-form-group cms-flex cms-gap-sm" style="align-items:center">
      <input type="checkbox" id="${id}" data-field="${escHtml(fieldKey)}" ${checked ? 'checked' : ''}
             style="width:18px;height:18px;cursor:pointer">
      <label class="cms-label" for="${id}" style="margin:0">${escHtml(label)}</label>
    </div>`;
}

function mediaField(fieldKey, label, value, aspectRatio = '', hint = '') {
    const id      = `field-${fieldKey.replace(/\./g, '-')}`;
    const preview = value ? `<img src="${escHtml(value)}" alt="Preview"
        style="max-width:200px;max-height:120px;border-radius:4px;border:1px solid var(--cms-border);margin-top:.4rem">` : '';
    return `
    <div class="cms-form-group" style="grid-column:1/-1">
      <label class="cms-label" for="${id}">${escHtml(label)}${aspectRatio ? ` <span class="cms-text-muted cms-text-sm">(${aspectRatio})</span>` : ''}</label>
      <div class="cms-flex cms-gap-sm" style="align-items:center;flex-wrap:wrap">
        <input class="cms-input" type="text" id="${id}" data-field="${escHtml(fieldKey)}"
               value="${escHtml(value)}" placeholder="/uploads/cms-media/filename.jpg"
               style="flex:1;min-width:200px">
        <button type="button" class="cms-btn cms-btn-outline cms-btn-sm"
                data-media-pick="${escHtml(fieldKey)}">🖼️ Browse Media</button>
      </div>
      ${preview}
      ${hint ? `<p class="cms-input-hint">${escHtml(hint)}</p>` : ''}
      <p class="cms-input-hint">Alt text for images is managed in the Media Library.</p>
    </div>`;
}

function buttonGroupField(fieldKey, label, value) {
    const lv = value.label || '';
    const hv = value.href  || '';
    return `
    <div class="cms-form-group" style="grid-column:1/-1">
      <p class="cms-label">${escHtml(label)}</p>
      <div class="cms-flex cms-gap" style="flex-wrap:wrap">
        ${fieldInput(`${fieldKey}.label`, 'Button Label', lv, 'text', 60, false)}
        ${fieldInput(`${fieldKey}.href`,  'Button URL',   hv, 'url',  null, false)}
      </div>
    </div>`;
}

function pathwayCardField(fieldKey, label, value) {
    return `
    <div class="cms-form-group" style="grid-column:1/-1;border:1px solid var(--cms-border);
         border-radius:var(--cms-radius);padding:1rem">
      <p class="cms-label" style="font-size:var(--cms-font-size-lg)">${escHtml(label)}</p>
      ${fieldInput(`${fieldKey}.title`,       'Card Title',       value.title       || '', 'text',  80, true)}
      ${fieldInput(`${fieldKey}.description`, 'Description',      value.description || '', 'textarea', 200, true)}
      ${fieldInput(`${fieldKey}.href`,        'Link URL',         value.href        || '', 'url', null, true)}
      ${mediaField(`${fieldKey}.image`,       'Card Image',       value.image       || '', '4:3')}
      ${fieldInput(`${fieldKey}.imageAlt`,    'Image Alt Text',   value.imageAlt    || '', 'text', 200, true, 'Required for accessibility.')}
      ${fieldInput(`${fieldKey}.srText`,      'Screen-reader text',value.srText     || '', 'text', 100)}
    </div>`;
}

function listEditorField(fieldKey, label, items, listType, schema) {
    const id = `list-${fieldKey.replace(/\./g, '-')}`;
    const addLabel = { 'card-list': 'Add Card', 'steps-list': 'Add Step',
        'tile-list': 'Add Tile', 'accordion-list': 'Add Item',
        'cta-list': 'Add Column', 'string-list': 'Add Item' }[listType] || 'Add Item';

    const itemsHtml = (items || []).map((item, i) => renderListItem(fieldKey, item, i, listType, schema)).join('');

    return `
    <div class="cms-form-group" style="grid-column:1/-1">
      <p class="cms-label">${escHtml(label)}</p>
      <div class="cms-list-editor" id="${id}" data-list-field="${escHtml(fieldKey)}" data-list-type="${listType}">
        ${itemsHtml}
      </div>
      <button type="button" class="cms-btn cms-btn-outline cms-btn-sm cms-add-item-btn"
              data-add-to="${escHtml(fieldKey)}" data-list-type="${listType}">
        + ${escHtml(addLabel)}
      </button>
    </div>`;
}

function renderListItem(fieldKey, item, index, listType, schema) {
    const id = `li-${fieldKey.replace(/\./g, '-')}-${index}`;

    if (listType === 'string-list') {
        return `
        <div class="cms-list-item" id="${id}">
          <div class="cms-flex cms-gap">
            <input class="cms-input" type="text" value="${escHtml(String(item))}"
                   data-list-item-field="${escHtml(fieldKey)}" data-list-index="${index}" style="flex:1">
            <button type="button" class="cms-btn cms-btn-danger cms-btn-sm"
                    data-remove-list-item="${escHtml(fieldKey)}" data-remove-index="${index}">✕</button>
          </div>
        </div>`;
    }

    const preview = typeof item === 'object' ? (item.title || item.question || item.label || `Item ${index + 1}`) : String(item);
    const bodyHtml = typeof item === 'object'
        ? Object.entries(item).filter(([k]) => k !== 'id').map(([k, v]) => {
            const isLong = typeof v === 'string' && v.length > 80;
            return fieldInput(`${fieldKey}[${index}].${k}`, k, String(v || ''), isLong ? 'textarea' : 'text', 300);
          }).join('')
        : '';

    return `
    <div class="cms-list-item" id="${id}">
      <div class="cms-list-item-header" data-toggle="${id}-body">
        <span>▶ ${escHtml(String(preview))}</span>
        <button type="button" class="cms-btn cms-btn-danger cms-btn-sm"
                data-remove-list-item="${escHtml(fieldKey)}" data-remove-index="${index}">✕ Remove</button>
      </div>
      <div class="cms-list-item-body collapsed" id="${id}-body">
        ${bodyHtml}
      </div>
    </div>`;
}

function wireListEditors(container, section) {
    // Toggle collapse
    container.querySelectorAll('[data-toggle]').forEach(hdr => {
        hdr.addEventListener('click', e => {
            if (e.target.closest('button')) return;
            const body = document.getElementById(hdr.getAttribute('data-toggle'));
            if (body) body.classList.toggle('collapsed');
            hdr.querySelector('span').textContent = body.classList.contains('collapsed') ? '▶ ' + hdr.querySelector('span').textContent.slice(2) : '▼ ' + hdr.querySelector('span').textContent.slice(2);
        });
    });

    // Remove item
    container.querySelectorAll('[data-remove-list-item]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const fieldKey = btn.getAttribute('data-remove-list-item');
            const index    = parseInt(btn.getAttribute('data-remove-index'), 10);
            const parts    = parseFieldKey(fieldKey);
            let target     = getDeepRef(section.fields, parts);
            if (Array.isArray(target)) {
                target.splice(index, 1);
                openSectionEditor(section.id); // re-render
            }
        });
    });

    // Add item
    container.querySelectorAll('[data-add-to]').forEach(btn => {
        btn.addEventListener('click', () => {
            const fieldKey = btn.getAttribute('data-add-to');
            const listType = btn.getAttribute('data-list-type');
            const parts    = parseFieldKey(fieldKey);
            let arr        = getDeepRef(section.fields, parts);
            if (!Array.isArray(arr)) {
                setDeepRef(section.fields, parts, []);
                arr = getDeepRef(section.fields, parts);
            }
            arr.push(newListItem(listType));
            openSectionEditor(section.id); // re-render
        });
    });
}

function newListItem(listType) {
    switch (listType) {
        case 'card-list':     return { id: `card-${Date.now()}`, title: 'New Card',  body: '' };
        case 'steps-list':    return { label: 'New Step', detail: '' };
        case 'tile-list':     return { id: `tile-${Date.now()}`, title: 'New Tile', description: '', href: '', linkText: 'Learn More' };
        case 'accordion-list':return { question: 'New Question', answer: '' };
        case 'cta-list':      return { heading: '', text: '', buttonLabel: 'Learn More', buttonHref: '' };
        case 'string-list':   return '';
        default:              return {};
    }
}

// ── Section move / delete ──────────────────────────────────────────────────
function moveSectionUp(sectionId) {
    const idx = activePage.sections.findIndex(s => s.id === sectionId);
    if (idx > 0) {
        [activePage.sections[idx - 1], activePage.sections[idx]] = [activePage.sections[idx], activePage.sections[idx - 1]];
        renderPageEditor(document.getElementById('cms-main'), activeSlug);
    }
}

function moveSectionDown(sectionId) {
    const idx = activePage.sections.findIndex(s => s.id === sectionId);
    if (idx < activePage.sections.length - 1) {
        [activePage.sections[idx], activePage.sections[idx + 1]] = [activePage.sections[idx + 1], activePage.sections[idx]];
        renderPageEditor(document.getElementById('cms-main'), activeSlug);
    }
}

function deleteSection(sectionId) {
    if (!confirm(`Delete section "${sectionId}"? This cannot be undone.`)) return;
    activePage.sections = activePage.sections.filter(s => s.id !== sectionId);
    activeSection = null;
    renderPageEditor(document.getElementById('cms-main'), activeSlug);
}

// ── Save changes ───────────────────────────────────────────────────────────
async function savePageChanges() {
    const btn = document.getElementById('save-page-btn');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    // Collect field values from DOM inputs
    collectFieldValues();

    try {
        await apiFetch('PUT', `/cms/pages/${activeSlug}`, activePage);
        showToast('Page saved successfully.', 'success');
    } catch (err) {
        showToast(`Save failed: ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Save All Changes';
    }
}

/**
 * Walk all [data-field] inputs in the editor and write their values back
 * into activePage.
 */
function collectFieldValues() {
    const panel = document.getElementById('cms-main');

    panel.querySelectorAll('[data-field]').forEach(input => {
        const rawKey = input.getAttribute('data-field');
        const value  = input.type === 'checkbox' ? input.checked : input.value;
        setFieldValue(rawKey, value);
    });

    // List item inputs: data-list-item-field + data-list-index
    panel.querySelectorAll('[data-list-item-field]').forEach(input => {
        const fieldKey = input.getAttribute('data-list-item-field');
        const index    = parseInt(input.getAttribute('data-list-index'), 10);
        const parts    = parseFieldKey(fieldKey);
        let arr = getDeepRef(activePage, parts);
        if (!Array.isArray(arr)) return;
        arr[index] = input.value;
    });
}

/**
 * Write a dot-path field key like "hero.title" or "meta.description" into activePage.
 * Also handles list item paths like "section-id.cards[0].title".
 */
function setFieldValue(rawKey, value) {
    // top-level meta / header
    if (rawKey.startsWith('meta.')) {
        const sub = rawKey.slice(5);
        if (!activePage.meta) activePage.meta = {};
        activePage.meta[sub] = value;
        return;
    }
    if (rawKey.startsWith('header.')) {
        const sub = rawKey.slice(7);
        if (!activePage.header) activePage.header = {};
        activePage.header[sub] = value;
        return;
    }

    // section field: "sectionId.fieldKey" or "sectionId.sub.key"
    const dotIdx   = rawKey.indexOf('.');
    if (dotIdx === -1) return;
    const sectionId = rawKey.slice(0, dotIdx);
    const fieldPath = rawKey.slice(dotIdx + 1);

    const section = activePage.sections?.find(s => s.id === sectionId);
    if (!section) return;
    if (!section.fields) section.fields = {};

    // Handle array notation: "cards[2].title" → cards[2].title
    const parts = parseFieldKey(fieldPath);
    setDeepRef(section.fields, parts, value);
}

// ── Global Settings ────────────────────────────────────────────────────────
async function renderGlobalSettings(container) {
    container.innerHTML = `<div class="cms-loading-state"><div class="cms-spinner"></div></div>`;
    try {
        globalData = await apiFetch('GET', '/cms/global');

        container.innerHTML = `
        <div class="cms-flex-between cms-mb">
          <h2 style="margin:0;color:var(--cms-primary)">Global Settings</h2>
          <button class="cms-btn cms-btn-secondary" id="save-global-btn">💾 Save Settings</button>
        </div>

        <!-- Site Info -->
        <div class="cms-panel">
          <div class="cms-panel-header"><h3 class="cms-panel-title">Site Information</h3></div>
          <div class="cms-panel-body">
            <div class="cms-settings-grid">
              ${fieldInput('site.name',          'Site Name',        globalData.site?.name          || '', 'text',     80, true)}
              ${fieldInput('site.tagline',        'Tagline',          globalData.site?.tagline       || '', 'text',     120)}
              ${fieldInput('site.contactEmail',   'Contact Email',    globalData.site?.contactEmail  || '', 'text',     100)}
              ${fieldInput('site.copyrightText',  'Copyright Text',   globalData.site?.copyrightText || '', 'text',     200)}
              ${fieldInput('site.programName',    'Program Name (footer)', globalData.site?.programName|| '', 'textarea',300)}
            </div>
          </div>
        </div>

        <!-- External Portals -->
        <div class="cms-panel">
          <div class="cms-panel-header"><h3 class="cms-panel-title">External Portal URLs</h3></div>
          <div class="cms-panel-body">
            <div class="cms-alert cms-alert-info cms-mb">
              These URLs appear in footer links, resource pages, and district look-ahead dropdowns.
            </div>
            <div class="cms-settings-grid">
              ${Object.entries(globalData.externalPortals || {}).map(([k, v]) =>
                fieldInput(`externalPortals.${k}`, formatKey(k), v, 'url')).join('')}
            </div>
          </div>
        </div>

        <!-- Smartsheet Forms -->
        <div class="cms-panel">
          <div class="cms-panel-header"><h3 class="cms-panel-title">Smartsheet Form URLs</h3></div>
          <div class="cms-panel-body">
            <div class="cms-settings-grid">
              ${Object.entries(globalData.smartsheetForms || {}).map(([k, v]) =>
                fieldInput(`smartsheetForms.${k}`, formatKey(k), v, 'url')).join('')}
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <div class="cms-panel">
          <div class="cms-panel-header"><h3 class="cms-panel-title">Navigation Menu</h3></div>
          <div class="cms-panel-body">
            <div class="cms-alert cms-alert-info cms-mb">
              Toggle item visibility with the Active checkbox. Label changes take effect after save.
            </div>
            <div id="nav-items-list">
              ${(globalData.navigation?.items || []).map((item, i) => `
                <div style="display:flex;gap:.75rem;align-items:center;padding:.5rem 0;border-bottom:1px solid var(--cms-border-light)">
                  <input type="checkbox" id="nav-active-${i}" data-field="navigation.items[${i}].active"
                         ${item.active ? 'checked' : ''} style="width:18px;height:18px">
                  <label for="nav-active-${i}" class="cms-sr-only">Active</label>
                  <input class="cms-input" type="text" style="flex:1" value="${escHtml(item.label)}"
                         data-field="navigation.items[${i}].label" placeholder="Label">
                  <input class="cms-input" type="text" style="flex:1" value="${escHtml(item.href)}"
                         data-field="navigation.items[${i}].href" placeholder="href">
                </div>`).join('')}
            </div>
          </div>
        </div>

        <!-- District Look-Ahead -->
        <div class="cms-panel">
          <div class="cms-panel-header"><h3 class="cms-panel-title">District Look-Ahead Dropdown</h3></div>
          <div class="cms-panel-body">
            <div class="cms-alert cms-alert-info cms-mb">
              Edit district labels used in search filters and the agency settings dropdown.
            </div>
            <div id="district-list">
              ${(globalData.districtLookahead || []).map((d, i) => `
                <div style="display:flex;gap:.75rem;padding:.4rem 0;border-bottom:1px solid var(--cms-border-light)">
                  <input class="cms-input" type="text" style="flex:2" value="${escHtml(d.label)}"
                         data-field="districtLookahead[${i}].label" placeholder="District label">
                  <input class="cms-input" type="text" style="width:80px" value="${escHtml(d.value)}"
                         data-field="districtLookahead[${i}].value" placeholder="Value">
                </div>`).join('')}
            </div>
          </div>
        </div>
        `;

        document.getElementById('save-global-btn').addEventListener('click', saveGlobalSettings);
        attachCharCounters(container);

    } catch (err) {
        container.innerHTML = `<div class="cms-alert cms-alert-error">Failed to load global settings: ${escHtml(err.message)}</div>`;
    }
}

async function saveGlobalSettings() {
    const btn = document.getElementById('save-global-btn');
    btn.disabled = true; btn.textContent = 'Saving…';

    // Collect all [data-field] in the global panel
    const updates = {};
    document.querySelectorAll('[data-field]').forEach(input => {
        const key   = input.getAttribute('data-field');
        const value = input.type === 'checkbox' ? input.checked : input.value;
        setNestedValue(updates, key, value);
    });

    try {
        await apiFetch('PUT', '/cms/global', updates);
        globalData = await apiFetch('GET', '/cms/global');
        showToast('Global settings saved.', 'success');
    } catch (err) {
        showToast(`Save failed: ${err.message}`, 'error');
    } finally {
        btn.disabled = false; btn.textContent = '💾 Save Settings';
    }
}

// ── Media Library ──────────────────────────────────────────────────────────
async function renderMediaLibrary(container, onSelect) {
    container.innerHTML = `<div class="cms-loading-state"><div class="cms-spinner"></div> Loading media…</div>`;
    try {
        const media = await apiFetch('GET', '/cms/media');

        container.innerHTML = `
        <div class="cms-flex-between cms-mb">
          <h2 style="margin:0;color:var(--cms-primary)">Media Library</h2>
          <span class="cms-text-muted cms-text-sm">${media.length} image${media.length !== 1 ? 's' : ''}</span>
        </div>

        <!-- Upload zone -->
        <div class="cms-panel">
          <div class="cms-panel-header"><h3 class="cms-panel-title">Upload Image</h3></div>
          <div class="cms-panel-body">
            <div class="cms-alert cms-alert-warning cms-mb">
              ⚠️ Caltrans Accessibility Policy: Alt text is <strong>required</strong> for every uploaded image.
            </div>
            <label class="cms-upload-zone" id="upload-zone" for="media-file-input" tabindex="0"
                   role="button" aria-label="Upload image — click or drag & drop">
              <div class="cms-upload-zone-icon" aria-hidden="true">📁</div>
              <p><strong>Click to browse</strong> or drag & drop an image here</p>
              <p class="cms-text-sm cms-text-muted">JPEG, PNG, GIF, WebP, SVG — max 10 MB</p>
              <input type="file" id="media-file-input" accept="image/*" aria-hidden="true">
            </label>
            <div class="cms-settings-grid">
              ${fieldInput('upload-alt-text', 'Alt Text (required)', '', 'text', 200, true,
                'Describe the image for screen reader users. E.g. "Construction workers reviewing blueprints".')}
            </div>
            <button class="cms-btn cms-btn-primary" id="do-upload-btn">Upload Image</button>
            <div id="upload-progress" class="cms-hidden cms-mt">
              <div class="cms-spinner" aria-hidden="true"></div>
              <span>Uploading…</span>
            </div>
          </div>
        </div>

        <!-- Grid -->
        <div class="cms-panel">
          <div class="cms-panel-header"><h3 class="cms-panel-title">Uploaded Images</h3></div>
          <div class="cms-panel-body">
            ${media.length === 0
              ? '<p class="cms-text-muted">No images uploaded yet.</p>'
              : `<div class="cms-media-grid" id="media-grid">
                  ${media.map(f => `
                    <div class="cms-media-card" data-url="${escHtml(f.url)}" data-alt="${escHtml(f.altText)}"
                         role="button" tabindex="0" aria-label="Image: ${escHtml(f.altText || f.filename)}">
                      <img class="cms-media-thumb" src="${escHtml(f.url)}" alt="${escHtml(f.altText)}"
                           loading="lazy">
                      <div class="cms-media-info">
                        <p class="cms-media-filename">${escHtml(f.filename)}</p>
                        <p class="cms-media-alt">${escHtml(f.altText || 'No alt text')}</p>
                        <p class="cms-text-muted" style="margin:0">${formatBytes(f.size)}</p>
                        <button class="cms-btn cms-btn-danger cms-btn-sm cms-w100" style="margin-top:.4rem"
                                data-delete-media="${escHtml(f.filename)}">Delete</button>
                      </div>
                    </div>`).join('')}
                </div>`}
          </div>
        </div>
        `;

        // Drag & drop
        const zone = document.getElementById('upload-zone');
        zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) {
                document.getElementById('media-file-input').files = e.dataTransfer.files;
            }
        });

        document.getElementById('do-upload-btn').addEventListener('click', () => doUpload(onSelect));

        container.querySelectorAll('[data-delete-media]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                confirmDeleteMedia(btn.getAttribute('data-delete-media'), container, onSelect);
            });
        });

        if (onSelect) {
            container.querySelectorAll('.cms-media-card').forEach(card => {
                card.addEventListener('click', () => {
                    const url    = card.getAttribute('data-url');
                    const altTxt = card.getAttribute('data-alt');
                    onSelect(url, altTxt);
                });
                card.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const url = card.getAttribute('data-url');
                        const alt = card.getAttribute('data-alt');
                        onSelect(url, alt);
                    }
                });
            });
        }

    } catch (err) {
        container.innerHTML = `<div class="cms-alert cms-alert-error">Media library error: ${escHtml(err.message)}</div>`;
    }
}

async function doUpload(onSelect) {
    const fileInput = document.getElementById('media-file-input');
    const altInput  = document.querySelector('[data-field="upload-alt-text"]');
    const altText   = altInput ? altInput.value.trim() : '';
    const progress  = document.getElementById('upload-progress');

    if (!fileInput.files.length) { showToast('Please select a file.', 'error'); return; }
    if (!altText) { showToast('Alt text is required.', 'error'); altInput?.focus(); return; }

    const formData = new FormData();
    formData.append('image',   fileInput.files[0]);
    formData.append('altText', altText);

    progress.classList.remove('cms-hidden');

    try {
        const res = await fetch(`${API}/cms/media`, {
            method:  'POST',
            headers: { 'Authorization': `Bearer ${currentAdmin?.token || ''}` },
            body:    formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        showToast(`"${data.filename}" uploaded.`, 'success');
        if (onSelect) onSelect(data.url, data.altText);
        renderMediaLibrary(document.getElementById('cms-main'), onSelect);
    } catch (err) {
        showToast(`Upload failed: ${err.message}`, 'error');
    } finally {
        progress.classList.add('cms-hidden');
    }
}

async function confirmDeleteMedia(filename, container, onSelect) {
    if (!confirm(`Delete "${filename}"?\nThis cannot be undone and may break pages that reference this image.`)) return;
    try {
        await apiFetch('DELETE', `/cms/media/${encodeURIComponent(filename)}`);
        showToast(`"${filename}" deleted.`, 'success');
        renderMediaLibrary(container, onSelect);
    } catch (err) {
        showToast(`Delete failed: ${err.message}`, 'error');
    }
}

/** Open media picker modal from any "Browse Media" button */
function openMediaPicker(fieldKey, sectionId) {
    const backdrop = document.createElement('div');
    backdrop.className = 'cms-modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Media Library — select an image');
    backdrop.innerHTML = `
    <div class="cms-modal" style="max-width:800px">
      <div class="cms-modal-header">
        <h2 class="cms-modal-title">Select Image</h2>
        <button class="cms-btn cms-btn-outline cms-btn-sm" id="close-media-picker">✕ Close</button>
      </div>
      <div id="media-picker-body"></div>
    </div>`;

    document.body.appendChild(backdrop);
    document.getElementById('close-media-picker').addEventListener('click', () => backdrop.remove());
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });

    renderMediaLibrary(document.getElementById('media-picker-body'), (url) => {
        // Set the text input for this field
        const input = document.querySelector(`[data-field="${fieldKey}"]`);
        if (input) {
            input.value = url;
            // Also update in-memory activePage
            if (activePage && sectionId) {
                setFieldValue(`${sectionId}.${fieldKey.includes('.') ? fieldKey.split('.').slice(1).join('.') : fieldKey}`, url);
            } else if (activePage && fieldKey.startsWith('header.')) {
                if (!activePage.header) activePage.header = {};
                activePage.header[fieldKey.slice(7)] = url;
            }
        }
        backdrop.remove();
        showToast('Image selected. Remember to Save.', 'info');
    });
}

// ── Page Builder ────────────────────────────────────────────────────────────
async function renderPageBuilder(container, targetSlug) {
    if (!schemaData) { schemaData = await apiFetch('GET', '/cms/schema'); }

    const pages = await apiFetch('GET', '/cms/pages');

    container.innerHTML = `
    <div class="cms-flex-between cms-mb">
      <h2 style="margin:0;color:var(--cms-primary)">Page Builder</h2>
    </div>

    ${!targetSlug ? `
    <!-- Create new page -->
    <div class="cms-panel">
      <div class="cms-panel-header"><h3 class="cms-panel-title">Create a New Page</h3></div>
      <div class="cms-panel-body">
        <div class="cms-settings-grid">
          ${fieldInput('new-slug',  'Page Slug (URL)', '', 'text', 80, true, 'Lowercase letters, numbers, hyphens only. E.g. "training-events"')}
          ${fieldInput('new-title', 'Page Title',      '', 'text', 120, true)}
          ${fieldInput('new-desc',  'Meta Description','', 'textarea', 300)}
        </div>
        <button class="cms-btn cms-btn-primary cms-mt" id="create-page-btn">Create Page</button>
        <div id="create-error" class="cms-alert cms-alert-error cms-hidden cms-mt"></div>
      </div>
    </div>` : ''}

    <!-- Add section to existing page -->
    <div class="cms-panel">
      <div class="cms-panel-header">
        <h3 class="cms-panel-title">${targetSlug ? `Add Section to "${targetSlug}"` : 'Add Section to Existing Page'}</h3>
      </div>
      <div class="cms-panel-body">
        ${!targetSlug ? `
        <div class="cms-form-group">
          <label class="cms-label" for="target-page-select">Target Page</label>
          <select class="cms-input cms-select" id="target-page-select">
            ${pages.map(p => `<option value="${escHtml(p.slug)}">${escHtml(p.title)}</option>`).join('')}
          </select>
        </div>` : `<p class="cms-text-muted">Adding to: <strong>${escHtml(targetSlug)}</strong></p>`}
        <p class="cms-label">Choose a component type:</p>
        <div class="cms-component-grid">
          ${(schemaData?.componentTypes || []).map(ct => `
            <div class="cms-component-card" role="button" tabindex="0"
                 data-add-component="${escHtml(ct.type)}" aria-label="Add ${escHtml(ct.label)}">
              <p class="cms-component-type">${escHtml(ct.type)}</p>
              <p class="cms-component-desc">${escHtml(ct.label)}</p>
              <p class="cms-component-desc cms-text-muted">${escHtml(ct.description)}</p>
            </div>`).join('')}
        </div>
        <div id="builder-error" class="cms-alert cms-alert-error cms-hidden cms-mt"></div>
      </div>
    </div>
    `;

    if (!targetSlug) {
        document.getElementById('create-page-btn').addEventListener('click', () => createNewPage(container));
    }

    container.querySelectorAll('[data-add-component]').forEach(card => {
        const activate = () => {
            const type = card.getAttribute('data-add-component');
            const slug = targetSlug
                || document.getElementById('target-page-select')?.value;
            if (slug) addSectionToPage(slug, type, container);
        };
        card.addEventListener('click', activate);
        card.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
        });
    });
}

async function createNewPage(container) {
    const slugInput  = container.querySelector('[data-field="new-slug"]');
    const titleInput = container.querySelector('[data-field="new-title"]');
    const descInput  = container.querySelector('[data-field="new-desc"]');
    const errEl      = document.getElementById('create-error');

    const slug  = slugInput?.value.trim().toLowerCase();
    const title = titleInput?.value.trim();

    errEl.classList.add('cms-hidden');

    if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
        errEl.textContent = 'Invalid slug. Use lowercase letters, numbers, and hyphens only.';
        errEl.classList.remove('cms-hidden');
        return;
    }

    try {
        const data = await apiFetch('POST', '/cms/pages', {
            slug,
            meta: { title: title || slug, description: descInput?.value.trim() || '' }
        });
        showToast(`Page "${slug}" created.`, 'success');
        navigateTab('edit', data.data.slug);
    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('cms-hidden');
    }
}

async function addSectionToPage(slug, componentType, container) {
    const errEl = document.getElementById('builder-error');
    errEl.classList.add('cms-hidden');

    try {
        const page = await apiFetch('GET', `/cms/pages/${slug}`);
        const schema = schemaData?.componentTypes?.find(c => c.type === componentType);
        const newSection = {
            id:     `${componentType}-${Date.now()}`,
            type:   componentType,
            fields: buildDefaultFields(schema)
        };

        page.sections = [...(page.sections || []), newSection];
        await apiFetch('PUT', `/cms/pages/${slug}`, page);
        showToast(`Section "${componentType}" added to "${slug}".`, 'success');
        navigateTab('edit', slug);
    } catch (err) {
        errEl.textContent = `Failed: ${err.message}`;
        errEl.classList.remove('cms-hidden');
    }
}

function buildDefaultFields(schema) {
    if (!schema) return {};
    const fields = {};
    schema.fields.forEach(f => {
        switch (f.inputType) {
            case 'card-list': case 'steps-list': case 'tile-list':
            case 'accordion-list': case 'cta-list': case 'string-list':
                fields[f.key] = []; break;
            case 'checkbox': fields[f.key] = false; break;
            default:         fields[f.key] = '';
        }
    });
    return fields;
}

// ── New Page Modal ─────────────────────────────────────────────────────────
function showNewPageModal() {
    navigateTab('builder');
}

// ── Delete Page ────────────────────────────────────────────────────────────
async function confirmDeletePage(slug) {
    if (!confirm(`Delete page "${slug}"? This cannot be undone.`)) return;
    try {
        await apiFetch('DELETE', `/cms/pages/${slug}`);
        showToast(`Page "${slug}" deleted.`, 'success');
        renderPagesList(document.getElementById('cms-main'));
    } catch (err) {
        showToast(`Delete failed: ${err.message}`, 'error');
    }
}

// ── Loaders ────────────────────────────────────────────────────────────────
async function loadGlobal() {
    try { globalData = await apiFetch('GET', '/cms/global'); } catch { /* silent */ }
}

async function loadSchema() {
    try { schemaData = await apiFetch('GET', '/cms/schema'); } catch { /* silent */ }
}

// ── API helper ─────────────────────────────────────────────────────────────
/**
 * @param {'GET'|'POST'|'PUT'|'DELETE'} method
 * @param {string} path
 * @param {object} [body]
 * @returns {Promise<any>}
 */
// ── FAQ Manager ─────────────────────────────────────────────────────────────

/** State for the FAQ manager */
let faqData = [];          // all FAQs from server
let faqCategories = [];    // distinct category names
let faqFilterCat = 'all';  // current category filter
let faqSearch = '';        // current search query
let faqSortable = null;    // Sortable.js instance

async function renderFAQManager(container) {
    container.innerHTML = `
    <div class="cms-faq-module">
      <div class="cms-flex-between cms-mb">
        <h2 style="margin:0;color:var(--cms-primary)">❓ FAQ Manager</h2>
        <div class="cms-flex cms-gap-sm">
          <a href="#" id="faq-export-btn" class="cms-btn cms-btn-outline cms-btn-sm">⬇ Export JSON</a>
          <button class="cms-btn cms-btn-secondary" id="add-faq-btn">+ Add FAQ</button>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="cms-faq-toolbar">
        <div class="cms-flex cms-gap-sm" style="flex:1;flex-wrap:wrap">
          <select id="faq-cat-filter" class="cms-select" style="width:auto;min-width:160px">
            <option value="all">All Categories</option>
          </select>
          <input id="faq-search" class="cms-input" type="search"
                 placeholder="Search questions…" style="flex:1;min-width:180px"
                 value="">
        </div>
        <div class="cms-flex cms-gap-sm">
          <span class="cms-text-muted cms-text-sm" id="faq-count"></span>
        </div>
      </div>

      <!-- List -->
      <div class="cms-panel">
        <div class="cms-panel-body" style="padding:.5rem">
          <div id="faq-list">
            <div class="cms-loading-state"><div class="cms-spinner"></div> Loading FAQs…</div>
          </div>
        </div>
      </div>
    </div>`;

    document.getElementById('add-faq-btn').addEventListener('click', () => openFAQModal(null));
    document.getElementById('faq-cat-filter').addEventListener('change', e => {
        faqFilterCat = e.target.value;
        renderFAQList();
    });
    document.getElementById('faq-search').addEventListener('input', e => {
        faqSearch = e.target.value.toLowerCase().trim();
        renderFAQList();
    });
    document.getElementById('faq-export-btn').addEventListener('click', e => {
        e.preventDefault();
        window.open(`${API}/cms/faqs/export`, '_blank');
    });

    await loadFAQs();
}

async function loadFAQs() {
    try {
        [faqData, faqCategories] = await Promise.all([
            apiFetch('GET', '/cms/faqs'),
            apiFetch('GET', '/cms/faq-categories')
        ]);
        rebuildCategoryFilter();
        renderFAQList();
    } catch (err) {
        const list = document.getElementById('faq-list');
        if (list) list.innerHTML = `<div class="cms-alert cms-alert-error">Failed to load FAQs: ${escHtml(err.message)}</div>`;
    }
}

function rebuildCategoryFilter() {
    const sel = document.getElementById('faq-cat-filter');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="all">All Categories</option>';
    // Show all distinct categories from data (not just active ones)
    const allCats = [...new Set(faqData.map(f => f.category))].sort();
    allCats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        sel.appendChild(opt);
    });
    sel.value = allCats.includes(current) ? current : 'all';
}

function getFilteredFAQs() {
    return faqData
        .filter(f => faqFilterCat === 'all' || f.category === faqFilterCat)
        .filter(f => {
            if (!faqSearch) return true;
            return f.question.toLowerCase().includes(faqSearch) ||
                   stripHtmlFAQ(f.answer).toLowerCase().includes(faqSearch);
        })
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

function stripHtmlFAQ(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent || '';
}

function renderFAQList() {
    const list    = document.getElementById('faq-list');
    const countEl = document.getElementById('faq-count');
    if (!list) return;

    const items = getFilteredFAQs();
    if (countEl) countEl.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;

    if (items.length === 0) {
        list.innerHTML = `
        <div class="cms-faq-empty">
          <div style="font-size:2.5rem;margin-bottom:.5rem">❓</div>
          <p class="cms-text-muted">
            ${faqData.length === 0 ? 'No FAQs yet. Click "+ Add FAQ" to get started.' : 'No FAQs match your filters.'}
          </p>
        </div>`;
        if (faqSortable) { faqSortable.destroy(); faqSortable = null; }
        return;
    }

    list.innerHTML = items.map(faq => `
    <div class="cms-faq-item" data-id="${faq.id}" data-sort="${faq.sort_order}">
      <span class="cms-faq-handle" title="Drag to reorder" aria-hidden="true">⠿</span>
      <div class="cms-faq-body">
        <div class="cms-faq-meta">
          <span class="cms-faq-cat-badge">${escHtml(faq.category)}</span>
          <span class="cms-badge ${faq.status === 'active' ? 'cms-badge-active' : 'cms-badge-inactive'}">
            ${faq.status}
          </span>
        </div>
        <div class="cms-faq-question">${escHtml(faq.question)}</div>
        <div class="cms-faq-answer-preview">${truncateFAQ(stripHtmlFAQ(faq.answer), 120)}</div>
      </div>
      <div class="cms-faq-actions">
        <button class="cms-btn cms-btn-primary cms-btn-sm" data-faq-edit="${faq.id}">Edit</button>
        <button class="cms-btn cms-btn-danger cms-btn-sm" data-faq-delete="${faq.id}">Delete</button>
      </div>
    </div>`).join('');

    // Wire edit/delete buttons
    list.querySelectorAll('[data-faq-edit]').forEach(btn => {
        btn.addEventListener('click', () => {
            const faq = faqData.find(f => f.id === parseInt(btn.dataset.faqEdit, 10));
            if (faq) openFAQModal(faq);
        });
    });
    list.querySelectorAll('[data-faq-delete]').forEach(btn => {
        btn.addEventListener('click', () => deleteFAQ(parseInt(btn.dataset.faqDelete, 10)));
    });

    // Init/refresh Sortable
    if (faqSortable) { faqSortable.destroy(); faqSortable = null; }
    if (window.Sortable && (faqFilterCat !== 'all' || !faqSearch)) {
        faqSortable = window.Sortable.create(list, {
            animation: 150,
            handle: '.cms-faq-handle',
            ghostClass: 'cms-faq-ghost',
            onEnd: saveFAQOrder
        });
    }
}

function truncateFAQ(text, max) {
    return text.length > max ? text.slice(0, max) + '…' : text;
}

async function saveFAQOrder() {
    const items  = document.querySelectorAll('#faq-list .cms-faq-item');
    const updates = Array.from(items).map((el, i) => ({ id: parseInt(el.dataset.id, 10), sort_order: i }));
    try {
        await apiFetch('POST', '/cms/faqs/reorder', { updates });
        // Update local cache
        updates.forEach(u => {
            const f = faqData.find(x => x.id === u.id);
            if (f) f.sort_order = u.sort_order;
        });
        showToast('Order saved', 'success');
    } catch (err) {
        showToast('Failed to save order: ' + err.message, 'error');
    }
}

/** Open add/edit modal */
function openFAQModal(faq) {
    const isEdit  = !!faq;
    const catOpts = [...new Set([...faqCategories, ...faqData.map(f => f.category), 'General', 'Small Businesses', 'Agencies', 'Registration', 'Applications', 'Technical Support'])]
        .sort()
        .map(c => `<option value="${escHtml(c)}" ${faq && faq.category === c ? 'selected' : ''}>${escHtml(c)}</option>`)
        .join('');

    // Remove any existing modal
    document.querySelectorAll('.cms-modal-backdrop').forEach(el => el.remove());

    const backdrop = document.createElement('div');
    backdrop.className = 'cms-modal-backdrop';
    backdrop.innerHTML = `
    <div class="cms-modal" role="dialog" aria-modal="true"
         aria-labelledby="faq-modal-title" style="max-width:680px">
      <div class="cms-modal-header">
        <h2 class="cms-modal-title" id="faq-modal-title">${isEdit ? 'Edit FAQ' : 'Add FAQ'}</h2>
        <button class="cms-btn cms-btn-outline cms-btn-sm" id="faq-modal-close"
                aria-label="Close">✕</button>
      </div>

      <div class="cms-form-group">
        <label class="cms-label cms-label-required" for="faq-cat-input">Category</label>
        <div class="cms-flex cms-gap-sm">
          <select id="faq-cat-select" class="cms-select" style="flex:1">
            ${catOpts}
            <option value="__new__">+ New category…</option>
          </select>
          <input id="faq-cat-input" class="cms-input cms-hidden" placeholder="New category name"
                 style="flex:1" value="${faq ? escHtml(faq.category) : ''}">
        </div>
      </div>

      <div class="cms-form-group">
        <label class="cms-label cms-label-required" for="faq-question-input">Question</label>
        <textarea id="faq-question-input" class="cms-textarea" rows="2"
                  placeholder="Enter the FAQ question…">${faq ? escHtml(faq.question) : ''}</textarea>
      </div>

      <div class="cms-form-group">
        <label class="cms-label cms-label-required" for="faq-answer-input">Answer</label>
        <div class="cms-faq-editor-toolbar">
          <button type="button" class="cms-btn cms-btn-outline cms-btn-sm" data-fmt="bold"><b>B</b></button>
          <button type="button" class="cms-btn cms-btn-outline cms-btn-sm" data-fmt="italic"><i>I</i></button>
          <button type="button" class="cms-btn cms-btn-outline cms-btn-sm" data-fmt="ul">• List</button>
          <button type="button" class="cms-btn cms-btn-outline cms-btn-sm" data-fmt="link">🔗 Link</button>
        </div>
        <textarea id="faq-answer-input" class="cms-textarea" rows="8"
                  placeholder="Enter the FAQ answer (HTML supported)…">${faq ? escHtml(faq.answer) : ''}</textarea>
        <div class="cms-input-hint">Basic HTML supported: &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;a href=""&gt;, &lt;br&gt;</div>
      </div>

      <div class="cms-form-group">
        <label class="cms-label" for="faq-status-input">Status</label>
        <select id="faq-status-input" class="cms-select" style="width:auto">
          <option value="active"   ${!faq || faq.status === 'active'   ? 'selected' : ''}>Active</option>
          <option value="inactive" ${faq && faq.status === 'inactive'  ? 'selected' : ''}>Inactive (hidden)</option>
        </select>
      </div>

      <div class="cms-flex-between cms-mt">
        <button class="cms-btn cms-btn-outline" id="faq-modal-cancel">Cancel</button>
        <button class="cms-btn cms-btn-secondary" id="faq-modal-save">
          <span id="faq-save-spinner" class="cms-spinner cms-hidden" aria-hidden="true"></span>
          ${isEdit ? '💾 Update FAQ' : '✔ Create FAQ'}
        </button>
      </div>
    </div>`;

    document.body.appendChild(backdrop);

    // Focus first field
    setTimeout(() => {
        const q = document.getElementById('faq-question-input');
        if (q) q.focus();
    }, 50);

    // Close handlers
    const closeFn = () => backdrop.remove();
    document.getElementById('faq-modal-close').addEventListener('click', closeFn);
    document.getElementById('faq-modal-cancel').addEventListener('click', closeFn);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeFn(); });

    // Category select → show/hide new input
    const catSel = document.getElementById('faq-cat-select');
    const catInp = document.getElementById('faq-cat-input');
    if (faq) {
        // If editing, pre-select the existing category
        const existsInList = Array.from(catSel.options).some(o => o.value === faq.category);
        if (!existsInList) {
            catSel.value = '__new__';
            catInp.classList.remove('cms-hidden');
        } else {
            catSel.value = faq.category;
        }
    }
    catSel.addEventListener('change', () => {
        const isNew = catSel.value === '__new__';
        catInp.classList.toggle('cms-hidden', !isNew);
        if (isNew) catInp.focus();
    });

    // Mini formatting toolbar
    backdrop.querySelectorAll('[data-fmt]').forEach(btn => {
        btn.addEventListener('click', () => {
            const ta = document.getElementById('faq-answer-input');
            const start = ta.selectionStart;
            const end   = ta.selectionEnd;
            const sel   = ta.value.slice(start, end);
            let insert  = '';
            switch (btn.dataset.fmt) {
                case 'bold':   insert = `<strong>${sel || 'bold text'}</strong>`; break;
                case 'italic': insert = `<em>${sel || 'italic text'}</em>`; break;
                case 'ul':     insert = `<ul>\n  <li>${sel || 'Item 1'}</li>\n  <li>Item 2</li>\n</ul>`; break;
                case 'link': {
                    const href = prompt('Enter URL:', 'https://');
                    if (!href) return;
                    insert = `<a href="${escHtml(href)}">${sel || 'link text'}</a>`;
                    break;
                }
            }
            ta.value = ta.value.slice(0, start) + insert + ta.value.slice(end);
            ta.focus();
        });
    });

    // Save
    document.getElementById('faq-modal-save').addEventListener('click', () => saveFAQ(faq?.id || null));
}

async function saveFAQ(faqId) {
    const catSel    = document.getElementById('faq-cat-select');
    const catInp    = document.getElementById('faq-cat-input');
    const question  = (document.getElementById('faq-question-input').value || '').trim();
    const answer    = (document.getElementById('faq-answer-input').value  || '').trim();
    const status    = document.getElementById('faq-status-input').value;
    const category  = catSel.value === '__new__'
        ? (catInp.value || '').trim()
        : catSel.value;

    if (!category) { showToast('Please enter a category name', 'error'); catInp.focus(); return; }
    if (!question) { showToast('Question is required', 'error'); document.getElementById('faq-question-input').focus(); return; }
    if (!answer)   { showToast('Answer is required', 'error');   document.getElementById('faq-answer-input').focus(); return; }

    const spinner = document.getElementById('faq-save-spinner');
    const saveBtn = document.getElementById('faq-modal-save');
    if (spinner) spinner.classList.remove('cms-hidden');
    if (saveBtn) saveBtn.disabled = true;

    try {
        if (faqId) {
            await apiFetch('PUT', `/cms/faqs/${faqId}`, { category, question, answer, status });
            showToast('FAQ updated', 'success');
        } else {
            await apiFetch('POST', '/cms/faqs', { category, question, answer, status });
            showToast('FAQ created', 'success');
        }
        document.querySelectorAll('.cms-modal-backdrop').forEach(el => el.remove());
        await loadFAQs();
    } catch (err) {
        showToast('Save failed: ' + err.message, 'error');
        if (spinner) spinner.classList.add('cms-hidden');
        if (saveBtn) saveBtn.disabled = false;
    }
}

async function deleteFAQ(faqId) {
    const faq = faqData.find(f => f.id === faqId);
    if (!faq) return;

    // Confirm dialog
    document.querySelectorAll('.cms-modal-backdrop').forEach(el => el.remove());
    const backdrop = document.createElement('div');
    backdrop.className = 'cms-modal-backdrop';
    backdrop.innerHTML = `
    <div class="cms-modal" role="dialog" aria-modal="true" style="max-width:440px;text-align:center">
      <div class="cms-modal-header" style="justify-content:center">
        <h2 class="cms-modal-title">Delete FAQ?</h2>
      </div>
      <p class="cms-text-muted" style="margin:.5rem 0 1.25rem">
        "<strong>${escHtml(truncateFAQ(faq.question, 80))}</strong>"
        <br>This cannot be undone.
      </p>
      <div class="cms-flex" style="gap:.75rem;justify-content:center">
        <button class="cms-btn cms-btn-outline" id="del-cancel">Cancel</button>
        <button class="cms-btn cms-btn-danger" id="del-confirm">🗑 Delete</button>
      </div>
    </div>`;
    document.body.appendChild(backdrop);

    document.getElementById('del-cancel').addEventListener('click', () => backdrop.remove());
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });

    document.getElementById('del-confirm').addEventListener('click', async () => {
        try {
            await apiFetch('DELETE', `/cms/faqs/${faqId}`);
            backdrop.remove();
            showToast('FAQ deleted', 'success');
            await loadFAQs();
        } catch (err) {
            showToast('Delete failed: ' + err.message, 'error');
        }
    });
}

// ── API ─────────────────────────────────────────────────────────────────────
async function apiFetch(method, path, body) {
    const opts = {
        method,
        headers: {
            'Authorization': `Bearer ${currentAdmin?.token || ''}`,
            ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    };
    const res = await fetch(`${API}${path}`, opts);
    let data;
    try {
        data = await res.json();
    } catch (e) {
        throw new Error(`Server returned HTTP ${res.status} (non-JSON response)`);
    }
    if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
    return data;
}

// ── Toast notifications ────────────────────────────────────────────────────
/**
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('cms-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `cms-toast cms-toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.addEventListener('click', () => toast.remove());

    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, 4000);
}

// ── Char counter ───────────────────────────────────────────────────────────
function attachCharCounters(scope) {
    scope.querySelectorAll('[data-max]').forEach(counter => {
        const id    = counter.getAttribute('data-for');
        const max   = parseInt(counter.getAttribute('data-max'), 10);
        const input = document.getElementById(id);
        if (!input) return;

        const update = () => {
            const len = input.value.length;
            counter.textContent = `${len}/${max}`;
            counter.classList.toggle('over', len > max);
        };
        input.addEventListener('input', update);
        update();
    });
}

// ── Utilities ──────────────────────────────────────────────────────────────
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatBytes(bytes) {
    if (bytes < 1024)       return `${bytes} B`;
    if (bytes < 1024*1024)  return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/(1024*1024)).toFixed(1)} MB`;
}

function formatKey(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

function getSectionTypeLabel(type) {
    return schemaData?.componentTypes?.find(c => c.type === type)?.label || type;
}

function getNestedVal(obj, keys) {
    let cur = obj;
    for (const k of keys) {
        if (cur == null) return null;
        cur = cur[k];
    }
    return cur ?? null;
}

/**
 * Parse a field key that may contain array notation.
 * "cards[2].title"  → ["cards", 2, "title"]
 * "meta.description" → ["meta", "description"]
 */
function parseFieldKey(fieldKey) {
    const parts = [];
    fieldKey.split('.').forEach(seg => {
        const m = seg.match(/^(.+)\[(\d+)\]$/);
        if (m) { parts.push(m[1]); parts.push(parseInt(m[2], 10)); }
        else   { parts.push(seg); }
    });
    return parts;
}

function getDeepRef(obj, parts) {
    let cur = obj;
    for (let i = 0; i < parts.length; i++) {
        if (cur == null) return undefined;
        cur = cur[parts[i]];
    }
    return cur;
}

function setDeepRef(obj, parts, value) {
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const key  = parts[i];
        const next = parts[i + 1];
        if (cur[key] == null) cur[key] = typeof next === 'number' ? [] : {};
        cur = cur[key];
    }
    cur[parts[parts.length - 1]] = value;
}

/**
 * Used for global settings collection — handles nested dot/bracket paths
 * @param {object} target
 * @param {string} rawKey  e.g. "navigation.items[0].active"
 * @param {*} value
 */
function setNestedValue(target, rawKey, value) {
    const parts = parseFieldKey(rawKey);
    setDeepRef(target, parts, value);
}
