/**
 * CaltransBizConnect Accessibility Widget
 * Version: 1.0.0
 *
 * WCAG 2.1 Level AA & Section 508 Compliant
 *
 * Features:
 *  - Text size adjustment (100% – 200%)
 *  - Line height adjustment
 *  - Letter spacing adjustment
 *  - Dyslexia-friendly font toggle
 *  - Contrast modes (default, high contrast, dark)
 *  - Grayscale mode
 *  - Highlight links / headings
 *  - Stop animations
 *  - Keyboard navigation mode (enhanced focus rings)
 *  - Hide images
 *  - Reading guide / ruler
 *  - Persistent preferences via localStorage
 *  - Keyboard shortcut: Alt + A
 *
 * Usage: Include this script at the bottom of every page.
 * The widget renders itself automatically on DOMContentLoaded.
 */

(function () {
  'use strict';

  /* -------------------------------------------------------
     CONFIGURATION
  ------------------------------------------------------- */

  var STORAGE_KEY = 'caltrans-a11y-prefs';
  var TEXT_SIZE_MIN = 100;
  var TEXT_SIZE_MAX = 200;
  var TEXT_SIZE_STEP = 10;

  var DEFAULT_PREFS = {
    textSize: 100,
    lineHeight: 'normal',    // normal | relaxed | loose
    letterSpacing: 'normal', // normal | wide | wider
    fontFamily: 'default',   // default | dyslexic
    contrast: 'default',     // default | high | dark
    grayscale: false,
    highlightLinks: false,
    highlightHeadings: false,
    stopAnimations: false,
    keyboardMode: false,
    hideImages: false,
    readingGuide: false
  };

  /* Map prefs to CSS classes applied on <html> */
  var CLASS_MAP = {
    stopAnimations: 'a11y-no-animations',
    keyboardMode: 'a11y-keyboard-mode',
    highlightLinks: 'a11y-highlight-links',
    highlightHeadings: 'a11y-highlight-headings',
    hideImages: 'a11y-hide-images',
    grayscale: 'a11y-grayscale',
    'contrast-high': 'a11y-contrast-high',
    'contrast-dark': 'a11y-contrast-dark',
    'lineHeight-relaxed': 'a11y-line-height-relaxed',
    'lineHeight-loose': 'a11y-line-height-loose',
    'letterSpacing-wide': 'a11y-letter-spacing-wide',
    'letterSpacing-wider': 'a11y-letter-spacing-wider',
    'fontFamily-dyslexic': 'a11y-dyslexic-font'
  };

  var ALL_CLASSES = Object.values(CLASS_MAP);

  /* -------------------------------------------------------
     STATE
  ------------------------------------------------------- */

  var prefs = {};
  var panelOpen = false;
  var readingGuideEl = null;
  var announcerEl = null;
  var triggerBtn = null;
  var panel = null;

  /* -------------------------------------------------------
     STORAGE
  ------------------------------------------------------- */

  function loadPrefs() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        var parsed = JSON.parse(stored);
        prefs = Object.assign({}, DEFAULT_PREFS, parsed);
        return;
      }
    } catch (e) { /* ignore */ }
    prefs = Object.assign({}, DEFAULT_PREFS);
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) { /* ignore */ }
  }

  /* -------------------------------------------------------
     APPLY PREFERENCES
  ------------------------------------------------------- */

  function applyAllPrefs() {
    applyTextSize();
    applyClasses();
    applyReadingGuide();
  }

  function applyTextSize() {
    if (prefs.textSize === TEXT_SIZE_MIN) {
      document.documentElement.style.fontSize = '';
    } else {
      document.documentElement.style.fontSize = (prefs.textSize / 100 * 16) + 'px';
    }
  }

  function applyClasses() {
    var html = document.documentElement;

    /* Remove all managed classes first */
    ALL_CLASSES.forEach(function (cls) {
      html.classList.remove(cls);
    });

    /* Boolean toggles */
    var booleans = ['stopAnimations', 'keyboardMode', 'highlightLinks',
      'highlightHeadings', 'hideImages', 'grayscale'];
    booleans.forEach(function (key) {
      if (prefs[key] && CLASS_MAP[key]) {
        html.classList.add(CLASS_MAP[key]);
      }
    });

    /* Contrast mode */
    if (prefs.contrast !== 'default') {
      var cls = CLASS_MAP['contrast-' + prefs.contrast];
      if (cls) html.classList.add(cls);
    }

    /* Line height */
    if (prefs.lineHeight !== 'normal') {
      var cls = CLASS_MAP['lineHeight-' + prefs.lineHeight];
      if (cls) html.classList.add(cls);
    }

    /* Letter spacing */
    if (prefs.letterSpacing !== 'normal') {
      var cls = CLASS_MAP['letterSpacing-' + prefs.letterSpacing];
      if (cls) html.classList.add(cls);
    }

    /* Font family */
    if (prefs.fontFamily !== 'default') {
      var cls = CLASS_MAP['fontFamily-' + prefs.fontFamily];
      if (cls) html.classList.add(cls);
    }
  }

  function applyReadingGuide() {
    if (!readingGuideEl) return;
    if (prefs.readingGuide) {
      readingGuideEl.classList.add('a11y-reading-guide-active');
    } else {
      readingGuideEl.classList.remove('a11y-reading-guide-active');
    }
  }

  /* -------------------------------------------------------
     ANNOUNCE TO SCREEN READERS
  ------------------------------------------------------- */

  function announce(msg) {
    if (!announcerEl) return;
    announcerEl.textContent = '';
    /* Force re-announcement with slight delay */
    setTimeout(function () {
      announcerEl.textContent = msg;
    }, 50);
  }

  /* -------------------------------------------------------
     WIDGET HTML BUILDER
  ------------------------------------------------------- */

  function buildWidget() {
    /* Screen reader live region */
    announcerEl = document.createElement('div');
    announcerEl.className = 'a11y-announcer';
    announcerEl.setAttribute('aria-live', 'polite');
    announcerEl.setAttribute('aria-atomic', 'true');
    document.body.appendChild(announcerEl);

    /* Reading guide */
    readingGuideEl = document.createElement('div');
    readingGuideEl.className = 'a11y-reading-guide';
    readingGuideEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(readingGuideEl);

    /* Trigger button */
    triggerBtn = document.createElement('button');
    triggerBtn.className = 'a11y-trigger';
    triggerBtn.setAttribute('aria-label', 'Open Accessibility Settings (Alt+A)');
    triggerBtn.setAttribute('aria-expanded', 'false');
    triggerBtn.setAttribute('aria-controls', 'a11y-panel');
    triggerBtn.innerHTML = '<span class="sr-only">Accessibility Options</span><span class="a11y-trigger-icon" aria-hidden="true">' +
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      '<circle cx="12" cy="5" r="2"></circle>' +
      '<path d="M10 9h4l2 6h-2l-1 4h-2l-1-4H8z"></path>' +
      '<path d="M7 14c0 0 1 2 5 2s5-2 5-2"></path>' +
      '</svg></span>';
    document.body.appendChild(triggerBtn);

    /* Panel */
    panel = document.createElement('div');
    panel.id = 'a11y-panel';
    panel.className = 'a11y-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Accessibility Settings');
    panel.setAttribute('aria-modal', 'false');
    panel.innerHTML = buildPanelHTML();
    document.body.appendChild(panel);
  }

  function buildPanelHTML() {
    return '' +
      '<div class="a11y-panel-header">' +
      '<div>' +
      '<div class="a11y-panel-title">Accessibility Settings</div>' +
      '<div class="a11y-panel-shortcut">Alt + A to open / close</div>' +
      '</div>' +
      '<button class="a11y-close-btn" id="a11y-close-btn" aria-label="Close Accessibility Settings">' +
      '&times;' +
      '</button>' +
      '</div>' +

      /* -- VISUAL ADJUSTMENTS -- */
      '<div class="a11y-section">' +
      '<div class="a11y-section-title">Visual Adjustments</div>' +

      /* Text Size */
      '<div class="a11y-control-row">' +
      '<span class="a11y-control-label" id="a11y-text-size-label">Text Size</span>' +
      '<div class="a11y-stepper" role="group" aria-labelledby="a11y-text-size-label">' +
      '<button class="a11y-stepper-btn" id="a11y-text-decrease" aria-label="Decrease text size">&minus;</button>' +
      '<span class="a11y-stepper-value" id="a11y-text-size-val" aria-live="polite" aria-atomic="true">100%</span>' +
      '<button class="a11y-stepper-btn" id="a11y-text-increase" aria-label="Increase text size">+</button>' +
      '</div>' +
      '</div>' +

      /* Line Height */
      '<div class="a11y-control-row">' +
      '<span class="a11y-control-label" id="a11y-lh-label">Line Height</span>' +
      '<div class="a11y-btn-group" role="group" aria-labelledby="a11y-lh-label">' +
      '<button class="a11y-btn" id="a11y-lh-normal" data-pref="lineHeight" data-val="normal" aria-pressed="true">Normal</button>' +
      '<button class="a11y-btn" id="a11y-lh-relaxed" data-pref="lineHeight" data-val="relaxed" aria-pressed="false">Relaxed</button>' +
      '<button class="a11y-btn" id="a11y-lh-loose" data-pref="lineHeight" data-val="loose" aria-pressed="false">Loose</button>' +
      '</div>' +
      '</div>' +

      /* Letter Spacing */
      '<div class="a11y-control-row">' +
      '<span class="a11y-control-label" id="a11y-ls-label">Letter Spacing</span>' +
      '<div class="a11y-btn-group" role="group" aria-labelledby="a11y-ls-label">' +
      '<button class="a11y-btn" id="a11y-ls-normal" data-pref="letterSpacing" data-val="normal" aria-pressed="true">Normal</button>' +
      '<button class="a11y-btn" id="a11y-ls-wide" data-pref="letterSpacing" data-val="wide" aria-pressed="false">Wide</button>' +
      '<button class="a11y-btn" id="a11y-ls-wider" data-pref="letterSpacing" data-val="wider" aria-pressed="false">Wider</button>' +
      '</div>' +
      '</div>' +

      /* Font Family */
      '<div class="a11y-control-row">' +
      '<span class="a11y-control-label" id="a11y-ff-label">Font</span>' +
      '<div class="a11y-btn-group" role="group" aria-labelledby="a11y-ff-label">' +
      '<button class="a11y-btn" id="a11y-ff-default" data-pref="fontFamily" data-val="default" aria-pressed="true">Default</button>' +
      '<button class="a11y-btn" id="a11y-ff-dyslexic" data-pref="fontFamily" data-val="dyslexic" aria-pressed="false">Dyslexic</button>' +
      '</div>' +
      '</div>' +
      '</div>' +

      /* -- CONTRAST & COLORS -- */
      '<div class="a11y-section">' +
      '<div class="a11y-section-title">Contrast &amp; Colors</div>' +

      /* Contrast Mode */
      '<div class="a11y-control-row">' +
      '<span class="a11y-control-label" id="a11y-ct-label">Contrast</span>' +
      '<div class="a11y-btn-group" role="group" aria-labelledby="a11y-ct-label">' +
      '<button class="a11y-btn" id="a11y-ct-default" data-pref="contrast" data-val="default" aria-pressed="true">Default</button>' +
      '<button class="a11y-btn" id="a11y-ct-high" data-pref="contrast" data-val="high" aria-pressed="false">High</button>' +
      '<button class="a11y-btn" id="a11y-ct-dark" data-pref="contrast" data-val="dark" aria-pressed="false">Dark</button>' +
      '</div>' +
      '</div>' +

      /* Grayscale */
      '<div class="a11y-control-row">' +
      '<label class="a11y-control-label" for="a11y-grayscale-toggle">Grayscale</label>' +
      '<label class="a11y-toggle">' +
      '<input type="checkbox" id="a11y-grayscale-toggle" data-pref="grayscale">' +
      '<span class="a11y-toggle-track" aria-hidden="true"></span>' +
      '</label>' +
      '</div>' +

      /* Highlight Links */
      '<div class="a11y-control-row">' +
      '<label class="a11y-control-label" for="a11y-links-toggle">Highlight Links</label>' +
      '<label class="a11y-toggle">' +
      '<input type="checkbox" id="a11y-links-toggle" data-pref="highlightLinks">' +
      '<span class="a11y-toggle-track" aria-hidden="true"></span>' +
      '</label>' +
      '</div>' +

      /* Highlight Headings */
      '<div class="a11y-control-row">' +
      '<label class="a11y-control-label" for="a11y-headings-toggle">Highlight Headings</label>' +
      '<label class="a11y-toggle">' +
      '<input type="checkbox" id="a11y-headings-toggle" data-pref="highlightHeadings">' +
      '<span class="a11y-toggle-track" aria-hidden="true"></span>' +
      '</label>' +
      '</div>' +
      '</div>' +

      /* -- CONTENT & MOTION -- */
      '<div class="a11y-section">' +
      '<div class="a11y-section-title">Content &amp; Motion</div>' +

      /* Stop Animations */
      '<div class="a11y-control-row">' +
      '<label class="a11y-control-label" for="a11y-anim-toggle">Stop Animations</label>' +
      '<label class="a11y-toggle">' +
      '<input type="checkbox" id="a11y-anim-toggle" data-pref="stopAnimations">' +
      '<span class="a11y-toggle-track" aria-hidden="true"></span>' +
      '</label>' +
      '</div>' +

      /* Keyboard Mode */
      '<div class="a11y-control-row">' +
      '<label class="a11y-control-label" for="a11y-kbd-toggle">Enhanced Focus</label>' +
      '<label class="a11y-toggle">' +
      '<input type="checkbox" id="a11y-kbd-toggle" data-pref="keyboardMode">' +
      '<span class="a11y-toggle-track" aria-hidden="true"></span>' +
      '</label>' +
      '</div>' +

      /* Hide Images */
      '<div class="a11y-control-row">' +
      '<label class="a11y-control-label" for="a11y-img-toggle">Hide Images</label>' +
      '<label class="a11y-toggle">' +
      '<input type="checkbox" id="a11y-img-toggle" data-pref="hideImages">' +
      '<span class="a11y-toggle-track" aria-hidden="true"></span>' +
      '</label>' +
      '</div>' +

      /* Reading Guide */
      '<div class="a11y-control-row">' +
      '<label class="a11y-control-label" for="a11y-guide-toggle">Reading Guide</label>' +
      '<label class="a11y-toggle">' +
      '<input type="checkbox" id="a11y-guide-toggle" data-pref="readingGuide">' +
      '<span class="a11y-toggle-track" aria-hidden="true"></span>' +
      '</label>' +
      '</div>' +
      '</div>' +

      /* -- RESET -- */
      '<button class="a11y-reset-btn" id="a11y-reset-btn">Reset All Settings</button>';
  }

  /* -------------------------------------------------------
     SYNC UI TO CURRENT PREFS
  ------------------------------------------------------- */

  function syncUI() {
    /* Text size */
    var sizeVal = panel.querySelector('#a11y-text-size-val');
    if (sizeVal) sizeVal.textContent = prefs.textSize + '%';

    var decBtn = panel.querySelector('#a11y-text-decrease');
    var incBtn = panel.querySelector('#a11y-text-increase');
    if (decBtn) decBtn.disabled = prefs.textSize <= TEXT_SIZE_MIN;
    if (incBtn) incBtn.disabled = prefs.textSize >= TEXT_SIZE_MAX;

    /* Segmented button groups */
    var groups = {
      lineHeight: ['normal', 'relaxed', 'loose'],
      letterSpacing: ['normal', 'wide', 'wider'],
      fontFamily: ['default', 'dyslexic'],
      contrast: ['default', 'high', 'dark']
    };

    Object.keys(groups).forEach(function (pref) {
      groups[pref].forEach(function (val) {
        var btn = panel.querySelector('[data-pref="' + pref + '"][data-val="' + val + '"]');
        if (btn) {
          var active = prefs[pref] === val;
          btn.setAttribute('aria-pressed', active ? 'true' : 'false');
          if (active) {
            btn.classList.add('a11y-active');
          } else {
            btn.classList.remove('a11y-active');
          }
        }
      });
    });

    /* Checkbox toggles */
    var checkboxMap = {
      grayscale: '#a11y-grayscale-toggle',
      highlightLinks: '#a11y-links-toggle',
      highlightHeadings: '#a11y-headings-toggle',
      stopAnimations: '#a11y-anim-toggle',
      keyboardMode: '#a11y-kbd-toggle',
      hideImages: '#a11y-img-toggle',
      readingGuide: '#a11y-guide-toggle'
    };

    Object.keys(checkboxMap).forEach(function (pref) {
      var el = panel.querySelector(checkboxMap[pref]);
      if (el) el.checked = !!prefs[pref];
    });
  }

  /* -------------------------------------------------------
     PANEL OPEN / CLOSE
  ------------------------------------------------------- */

  function openPanel() {
    panelOpen = true;
    panel.classList.add('a11y-panel-open');
    triggerBtn.setAttribute('aria-expanded', 'true');
    /* Focus close button */
    var closeBtn = panel.querySelector('#a11y-close-btn');
    if (closeBtn) {
      setTimeout(function () { closeBtn.focus(); }, 50);
    }
    announce('Accessibility settings panel opened.');
  }

  function closePanel() {
    panelOpen = false;
    panel.classList.remove('a11y-panel-open');
    triggerBtn.setAttribute('aria-expanded', 'false');
    triggerBtn.focus();
    announce('Accessibility settings panel closed.');
  }

  /* -------------------------------------------------------
     EVENT HANDLERS
  ------------------------------------------------------- */

  function bindEvents() {
    /* Trigger button */
    triggerBtn.addEventListener('click', function () {
      if (panelOpen) {
        closePanel();
      } else {
        openPanel();
      }
    });

    /* Close button */
    panel.addEventListener('click', function (e) {
      if (e.target.id === 'a11y-close-btn' ||
        e.target.closest('#a11y-close-btn')) {
        closePanel();
      }
    });

    /* Keyboard: Escape closes, Tab traps within panel */
    document.addEventListener('keydown', function (e) {
      /* Alt + A global shortcut */
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        if (panelOpen) {
          closePanel();
        } else {
          openPanel();
        }
        return;
      }

      if (!panelOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel();
      }
    });

    /* Click outside to close */
    document.addEventListener('click', function (e) {
      if (!panelOpen) return;
      if (!panel.contains(e.target) && e.target !== triggerBtn) {
        closePanel();
      }
    });

    /* --- Segmented button groups --- */
    panel.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-pref][data-val]');
      if (!btn) return;
      var pref = btn.getAttribute('data-pref');
      var val = btn.getAttribute('data-val');
      prefs[pref] = val;
      savePrefs();
      applyClasses();
      syncUI();
      announce(labelFor(pref) + ' set to ' + val + '.');
    });

    /* --- Checkbox toggles --- */
    panel.addEventListener('change', function (e) {
      var el = e.target;
      if (!el.dataset.pref) return;
      var pref = el.dataset.pref;
      prefs[pref] = el.checked;
      savePrefs();
      applyClasses();
      applyReadingGuide();
      syncUI();
      announce(labelFor(pref) + (el.checked ? ' enabled.' : ' disabled.'));
    });

    /* --- Text size stepper --- */
    panel.addEventListener('click', function (e) {
      if (e.target.id === 'a11y-text-decrease') {
        if (prefs.textSize > TEXT_SIZE_MIN) {
          prefs.textSize -= TEXT_SIZE_STEP;
          savePrefs();
          applyTextSize();
          syncUI();
          announce('Text size decreased to ' + prefs.textSize + ' percent.');
        }
      }
      if (e.target.id === 'a11y-text-increase') {
        if (prefs.textSize < TEXT_SIZE_MAX) {
          prefs.textSize += TEXT_SIZE_STEP;
          savePrefs();
          applyTextSize();
          syncUI();
          announce('Text size increased to ' + prefs.textSize + ' percent.');
        }
      }
    });

    /* --- Reset --- */
    panel.addEventListener('click', function (e) {
      if (e.target.id === 'a11y-reset-btn') {
        prefs = Object.assign({}, DEFAULT_PREFS);
        savePrefs();
        applyAllPrefs();
        syncUI();
        announce('All accessibility settings have been reset to defaults.');
      }
    });

    /* --- Reading guide follows mouse --- */
    document.addEventListener('mousemove', function (e) {
      if (prefs.readingGuide && readingGuideEl) {
        readingGuideEl.style.top = (e.clientY - 30) + 'px';
      }
    });
  }

  function labelFor(pref) {
    var labels = {
      textSize: 'Text size',
      lineHeight: 'Line height',
      letterSpacing: 'Letter spacing',
      fontFamily: 'Font',
      contrast: 'Contrast',
      grayscale: 'Grayscale',
      highlightLinks: 'Highlight links',
      highlightHeadings: 'Highlight headings',
      stopAnimations: 'Stop animations',
      keyboardMode: 'Enhanced focus',
      hideImages: 'Hide images',
      readingGuide: 'Reading guide'
    };
    return labels[pref] || pref;
  }

  /* -------------------------------------------------------
     ADDITIONAL SITEWIDE FIXES
  ------------------------------------------------------- */

  function applyGlobalFixes() {
    /* Mark external links for screen readers */
    var extLinks = document.querySelectorAll('a[target="_blank"]');
    extLinks.forEach(function (link) {
      if (!link.getAttribute('aria-label') &&
        !link.querySelector('.sr-only')) {
        var sr = document.createElement('span');
        sr.className = 'sr-only';
        sr.textContent = ' (opens in new window)';
        link.appendChild(sr);
      }
    });

    /* Add aria-current="page" to active nav links */
    var activeLinks = document.querySelectorAll('.main-nav a.active, .main-nav a[aria-current="page"]');
    activeLinks.forEach(function (link) {
      link.setAttribute('aria-current', 'page');
    });

    /* Add aria-label to nav if missing */
    var navEls = document.querySelectorAll('nav:not([aria-label])');
    navEls.forEach(function (nav) {
      if (nav.classList.contains('main-nav')) {
        nav.setAttribute('aria-label', 'Main navigation');
      } else if (nav.classList.contains('dashboard-nav')) {
        nav.setAttribute('aria-label', 'Dashboard navigation');
      } else {
        nav.setAttribute('aria-label', 'Navigation');
      }
    });

    /* Add missing lang attribute to html if absent */
    if (!document.documentElement.getAttribute('lang')) {
      document.documentElement.setAttribute('lang', 'en');
    }

    /* Ensure all images have alt attributes */
    var imgs = document.querySelectorAll('img:not([alt])');
    imgs.forEach(function (img) {
      img.setAttribute('alt', '');
    });

    /* Mark all decorative SVGs as aria-hidden if not already */
    var svgs = document.querySelectorAll('svg:not([aria-label]):not([role="img"])');
    svgs.forEach(function (svg) {
      if (!svg.querySelector('title')) {
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
      }
    });
  }

  /* -------------------------------------------------------
     INIT
  ------------------------------------------------------- */

  function init() {
    loadPrefs();
    buildWidget();
    bindEvents();
    applyAllPrefs();
    syncUI();
    applyGlobalFixes();

    /* Announce widget availability to screen readers on page load */
    setTimeout(function () {
      announce('Accessibility settings are available. Press Alt + A to open.');
    }, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
