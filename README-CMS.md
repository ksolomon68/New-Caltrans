# CaltransBizConnect — CMS Guide

A file-based CMS built on the existing Node.js/Express stack. Content is stored as JSON in `content/`, served via `/api/cms/*`, and hydrated into each public page by `js/cms-renderer.js`. Non-technical admins manage everything through the visual admin UI at `/admin-cms.html`.

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Architecture Overview](#2-architecture-overview)
3. [Admin UI — How to Use](#3-admin-ui--how-to-use)
4. [Content JSON Structure](#4-content-json-structure)
5. [Adding a New Section to a Page](#5-adding-a-new-section-to-a-page)
6. [Adding a New Page](#6-adding-a-new-page)
7. [Managing Assets (Media Library)](#7-managing-assets-media-library)
8. [Global Settings](#8-global-settings)
9. [Wiring a New HTML Page into the CMS](#9-wiring-a-new-html-page-into-the-cms)
10. [Caltrans Style Guide Enforcement](#10-caltrans-style-guide-enforcement)
11. [API Reference](#11-api-reference)
12. [Component Type Reference](#12-component-type-reference)

---

## 1. Quick Start

```bash
# Start the server (serves both the site and the CMS API)
node server/index.js

# Open the CMS admin panel
http://localhost:3001/admin-cms.html

# Sign in with an admin account (email must contain "admin" or be ks@evobrand.net)
```

The server must be running for the CMS to function. Content JSON files are read and written directly by the Express server from the `content/` directory.

---

## 2. Architecture Overview

```
content/
├── global.json          ← Navigation, footer, external links, Smartsheet URLs, districts
├── pages/
│   ├── index.json       ← Home page content
│   ├── for-small businesses.json
│   ├── for-prime contractors.json
│   ├── resources.json
│   └── *.json           ← One file per CMS-managed page
└── schemas/
    └── component-types.json  ← Defines available section types and their fields

server/routes/cms.js     ← Express API: read/write content JSON + media
js/cms-renderer.js       ← Client: fetches content, hydrates data-cms-field elements
js/admin-cms.js          ← Admin SPA logic
css/admin-cms.css        ← Admin UI styles
admin-cms.html           ← Admin entry point
uploads/cms-media/       ← Uploaded images (served as static files)
```

**Data flow:**

```
Admin edits field → PUT /api/cms/pages/:slug → content/pages/:slug.json written
Public page loads → GET /api/cms/pages/:slug + GET /api/cms/global
                 → cms-renderer.js reads data-cms-field attributes → updates DOM
```

---

## 3. Admin UI — How to Use

### Login
Go to `/admin-cms.html`. Sign in with your Caltrans admin credentials (the same account used for the main admin dashboard).

### Pages Tab
- Lists all managed pages with their slug and system/custom badge.
- Click **Edit** to open the page editor.
- Click **+ New Page** to go to the Page Builder.

### Page Editor
1. **Page Meta & Header** — edit the browser title, SEO description, logo, and header background image.
2. **Content Sections** — each card is a section. Click **Edit** to open the field editor below.
3. **Field Editor** — edit all text, links, and images for the selected section.
4. Use **↑ / ↓** to reorder sections.
5. Click **💾 Save All Changes** when done. Changes are written immediately to disk.

### Global Settings Tab
- **Site Information** — site name, contact email, copyright text.
- **External Portal URLs** — CCOP, UCP, Caltrans.gov links used throughout the site.
- **Smartsheet Form URLs** — the four form links in the footer.
- **Navigation Menu** — toggle items on/off; edit labels and hrefs.
- **District Look-Ahead Dropdown** — edit district labels/values used in all filters.

### Media Library Tab
- Upload images (alt text required — Caltrans accessibility policy).
- Browse existing images; click **Delete** to remove one.
- When editing a field that takes an image URL, click **🖼️ Browse Media** to pick from the library.

### Page Builder Tab
- **Create a New Page** — set a slug (URL), title, and description. An empty JSON file is created.
- **Add Section to Existing Page** — choose a page and click a component type to append a new section.

---

## 4. Content JSON Structure

Every page file follows this schema:

```json
{
  "slug": "for-small businesses",
  "isSystem": true,
  "updatedAt": "2026-03-17T00:00:00.000Z",
  "meta": {
    "title": "For Small Businesses - CaltransBizConnect",
    "description": "SEO description here."
  },
  "header": {
    "backgroundImage": "/uploads/cms-media/hero-bg.jpg",
    "logoImage": "images/caltrans-logo.png",
    "logoAlt": "Caltrans"
  },
  "sections": [
    {
      "id": "hero",
      "type": "hero-inner",
      "fields": {
        "title": "For Small Businesses",
        "subtitle": "Connect with opportunities…"
      }
    }
  ]
}
```

**Key rules:**
- `isSystem: true` — prevents deletion from the admin UI. Only remove this manually for pages you want admins to be able to delete.
- `id` must be unique within the page's `sections` array.
- `type` must match a key in `content/schemas/component-types.json`.

---

## 5. Adding a New Section to a Page

### Via the Admin UI (recommended)
1. Open **Page Builder** tab.
2. Select the target page.
3. Click a component card (e.g. "Card Grid").
4. The section is appended; go to the page editor to fill in its fields.

### Manually (direct JSON edit)
Add an entry to the `sections` array in `content/pages/<slug>.json`:

```json
{
  "id": "my-new-section",
  "type": "text-block",
  "fields": {
    "heading": "About Our Program",
    "body": "The CaltransBizConnect platform provides…"
  }
}
```

Then add a `data-cms-field` attribute to the corresponding HTML element on the public page (see §9).

---

## 6. Adding a New Page

### Via the Admin UI
1. Open **Page Builder** → **Create a New Page**.
2. Enter a slug like `training-events`, a title, and description.
3. Click **Create Page** — the file `content/pages/training-events.json` is created.
4. Use **Add Section** to build out the page's content.
5. Create the corresponding HTML file (e.g. `training-events.html`) — see §9.

### Manually
1. Create `content/pages/training-events.json` using the structure from §4.
2. Create `training-events.html` — copy any existing page as a template.
3. Add `data-cms-page="training-events"` to `<body>`.
4. Add `data-cms-field` attributes to editable elements.
5. Add `<script src="js/cms-renderer.js"></script>` before `</body>`.

---

## 7. Managing Assets (Media Library)

### Upload
1. Open **Media Library** in the admin.
2. Click the upload zone or drag & drop an image.
3. **Alt text is required** before the upload button becomes functional.
4. Uploaded files are saved to `uploads/cms-media/` and served at `/uploads/cms-media/filename.jpg`.

### Use in a field
- In any image field in the page editor, click **🖼️ Browse Media**.
- The URL is automatically filled in. Click **Save** to persist.

### Aspect ratio guidance

| Component           | Recommended ratio | Approx. size  |
|---------------------|-------------------|---------------|
| Hero background     | 16:5              | 1600 × 500 px |
| Pathway card image  | 4:3               | 800 × 600 px  |
| Card grid image     | 4:3               | 400 × 300 px  |
| Inner page hero     | 16:4              | 1600 × 400 px |

---

## 8. Global Settings

`content/global.json` is the single source of truth for site-wide content.

| Key                        | What it controls                                               |
|----------------------------|----------------------------------------------------------------|
| `site.name`                | Site name in the admin header                                  |
| `site.contactEmail`        | Auto-updates all `mailto:` links in the footer                 |
| `site.copyrightText`       | Footer copyright line                                          |
| `site.programName`         | Footer second line                                             |
| `navigation.items[]`       | Main nav labels, hrefs, active flags                           |
| `footer.columns[]`         | Footer link columns (rendered by the CMS renderer)             |
| `externalPortals.*`        | CCOP, UCP, Caltrans.gov URLs — auto-updates `data-cms-portal` links |
| `smartsheetForms.*`        | Smartsheet form URLs — auto-updates `data-cms-smartsheet` links |
| `districtLookahead[]`      | District filter dropdown labels and values                     |

Changes to global settings take effect on next page load (or after `cms-renderer.js` runs).

---

## 9. Wiring a New HTML Page into the CMS

Follow these three steps for any HTML page you want the CMS to manage:

### Step 1 — Declare the page slug
```html
<body data-cms-page="my-page-slug">
```
The slug must match the filename in `content/pages/my-page-slug.json`.

### Step 2 — Mark editable elements
```html
<!-- Text fields -->
<h1 data-cms-field="hero.title">Default text</h1>
<p  data-cms-field="hero.subtitle">Default subtitle</p>

<!-- Images -->
<img src="images/default.jpg" alt="…"
     data-cms-field="hero-section.image" data-cms-type="src">

<!-- Iframe src -->
<iframe src="https://example.com"
        data-cms-field="events.iframeSrc" data-cms-type="iframe-src"></iframe>

<!-- Links (href) -->
<a href="default.html"
   data-cms-field="hero.primaryButton.href" data-cms-type="href">Label</a>

<!-- Global data -->
<p data-cms-global="site.programName">Fallback text</p>

<!-- Smartsheet link auto-update -->
<a href="https://app.smartsheet.com/…" data-cms-smartsheet="serviceRequest">…</a>

<!-- External portal auto-update -->
<a href="https://ccop.dot.ca.gov/"    data-cms-portal="ccop">…</a>
```

**`data-cms-type` values:**

| Value        | Effect                                         |
|--------------|------------------------------------------------|
| `text`       | Sets `textContent` (default, safe from XSS)    |
| `html`       | Sets `innerHTML` (use only for trusted content)|
| `src`        | Sets `src` attribute (images, iframes)         |
| `href`       | Sets `href` attribute (links)                  |
| `alt`        | Sets `alt` attribute (images)                  |
| `bg`         | Sets `style.backgroundImage: url('…')`         |
| `iframe-src` | Sets `src` on `<iframe>` elements              |

### Step 3 — Include the renderer last
```html
  <script src="js/accessibility-widget.js"></script>
  <script src="js/cms-renderer.js"></script>
</body>
```

The renderer runs after `DOMContentLoaded`, so it never blocks the initial render. Pages display their hardcoded HTML immediately, and CMS content replaces it within one render cycle.

---

## 10. Caltrans Style Guide Enforcement

The CMS enforces the Caltrans style guide in the following ways:

| Rule                         | Enforcement mechanism                                                        |
|------------------------------|------------------------------------------------------------------------------|
| **Fonts: Arial / Calibri**   | Admin UI uses these fonts; a warning appears if other fonts are detected     |
| **Body text 12–14pt**        | Admin CSS tokens set `--cms-font-size: 14px`; the renderer preserves site CSS|
| **Alt text required**        | Media uploads are rejected server-side if `altText` is missing               |
| **External link security**   | All external links use `target="_blank" rel="noopener noreferrer"` by default |
| **No system page deletion**  | Pages with `isSystem: true` cannot be deleted via the API                    |
| **Input length limits**      | All field inputs have `maxlength` and character counters; over-limit shown in red |
| **Image formats**            | Only JPEG, PNG, GIF, WebP, SVG accepted (server-side MIME check)             |
| **File size**                | Max 10 MB per image upload (enforced by Multer)                              |
| **Path traversal prevention**| Media delete endpoint validates filename against path traversal patterns     |

---

## 11. API Reference

All endpoints are under `/api/cms`.

### Global Settings

| Method | Path          | Auth  | Description             |
|--------|---------------|-------|-------------------------|
| GET    | `/global`     | None  | Get global.json         |
| PUT    | `/global`     | Admin | Deep-merge into global.json |

### Pages

| Method | Path             | Auth  | Description                        |
|--------|------------------|-------|------------------------------------|
| GET    | `/pages`         | None  | List all page slugs                |
| GET    | `/pages/:slug`   | None  | Get a page's content JSON          |
| PUT    | `/pages/:slug`   | Admin | Deep-merge into page JSON          |
| POST   | `/pages`         | Admin | Create new custom page             |
| DELETE | `/pages/:slug`   | Admin | Delete a non-system page           |

### Schema

| Method | Path      | Auth | Description                     |
|--------|-----------|------|---------------------------------|
| GET    | `/schema` | None | Get component-types.json schema |

### Media

| Method | Path                  | Auth  | Description                              |
|--------|-----------------------|-------|------------------------------------------|
| GET    | `/media`              | Admin | List uploaded images with metadata       |
| POST   | `/media`              | Admin | Upload image (`multipart/form-data`: `image` + `altText`) |
| DELETE | `/media/:filename`    | Admin | Delete image and its sidecar meta file   |

**Admin authentication:** Send the header `x-admin-email: your-admin@example.com` with all write requests.

---

## 12. Component Type Reference

Each `type` value maps to a schema entry in `content/schemas/component-types.json`.

| Type              | Label                  | Key fields                                        |
|-------------------|------------------------|---------------------------------------------------|
| `hero`            | Full Hero              | `title`, `subtitle`, `backgroundImage`            |
| `hero-inner`      | Inner Page Hero        | `title`, `subtitle`, `primaryButton`, `secondaryButton` |
| `text-block`      | Text Block             | `heading`, `body`                                 |
| `card-grid`       | Card Grid              | `heading`, `intro`, `cards[]`                     |
| `tiles`           | Action Tiles           | `heading`, `tiles[]`                              |
| `cta-banner`      | CTA Banner             | `heading`, `text`, `columns[]`                    |
| `accordion`       | Accordion / FAQ        | `heading`, `items[]`                              |
| `iframe-embed`    | Embedded iFrame        | `heading`, `iframeSrc`, `iframeTitle`             |
| `alert`           | Alert / Info Box       | `heading`, `alertType`, `alertLabel`, `items[]`   |
| `steps`           | Numbered Steps         | `heading`, `steps[]`                              |
| `pathway-cards`   | Dual Pathway Cards     | `smallBusinessCard`, `primeContractorCard`                        |

To add a new component type:
1. Add an entry to `content/schemas/component-types.json`.
2. Build a corresponding HTML structure in the target page.
3. Add `data-cms-field` attributes to the editable elements.

---

*CaltransBizConnect CMS — File-based, self-contained, no external CMS service required.*
