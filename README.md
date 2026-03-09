# CaltransBizConnect Platform

A mission-critical digital platform connecting Small Business Enterprises (SBEs) with contracting opportunities and Agencies/Prime Contractors with qualified partners.

## Overview

CaltransBizConnect serves as the central hub for the Small Business Enterprise Supportive Services Business Development Program (SBE/BDP). The platform streamlines the contracting process by providing:

- **For Vendors/SBEs**: Opportunity discovery, profile management, capability statement uploads, and application tracking
- **For Agencies**: Structured opportunity posting, vendor search, and submission management

## Key Features

### Dual User Flows
- **SBE (Vendor) Flow**: Home → For Vendors → Create Account → Dashboard → Profile Completion → Search Opportunities
- **Agency Flow**: Home → For Agencies → Create Account → Dashboard → Post Opportunity → Manage Postings

### Quality Standards
- All opportunity postings must meet strict validation requirements
- 2-day administrator review process before publication
- Automatic archival of expired opportunities
- No placeholder content permitted

### Accessibility
- Built to WCAG 2.1 AA standards
- Full keyboard operability
- High contrast ratios for all text
- Descriptive alt text for all images
- Responsive design for mobile and desktop

## Project Structure

```
Antig2/
├── index.html                  # Home page with dual pathway hero
├── for-vendors.html            # Vendor landing page
├── for-agencies.html           # Agency landing page
├── opportunities.html          # Opportunity listing with filters
├── login.html                  # Login page
├── dashboard-vendor.html       # Vendor dashboard
├── dashboard-agency.html       # Agency dashboard
├── capability-statement.html   # Capability statement upload
├── post-opportunity.html       # Opportunity posting form
├── contact.html                # Contact page
├── report-issue.html           # Issue reporting form
├── css/
│   ├── design-system.css       # Design tokens and component styles
│   └── main.css                # Layout and page-specific styles
├── js/
│   ├── main.js                 # Core JavaScript utilities
│   ├── auth.js                 # Authentication module
│   └── components/
│       ├── filter-bar.js       # Opportunity filtering
│       ├── file-upload.js      # File upload with validation
│       └── form-validation.js  # Form validation utilities
└── data/
    ├── districts.json          # Caltrans district data
    ├── work-categories.json    # Work category taxonomy
    └── sample-opportunities.json # Sample opportunity data
```

## Design Standards

### Typography
- **Fonts**: Arial or Calibri (sans serif)
- **Body Text**: 11pt to 14pt
- **Color**: Black text on no-color background

### Editorial Standards
- Use active voice and plain language
- Single space after periods
- Serial commas for lists of three or more items
- Use "must" (not shall), "authorize" (not approve)
- Use "contract specifications" (not standard specifications)
- Use "as-built" in lowercase

### Accessibility Requirements
- Alternative text for all images
- Keyboard-only navigation support
- High contrast for all text
- Color not used alone to convey meaning
- Clean, human-readable URLs

## Getting Started

### For Development
1. Open `index.html` in a modern web browser
2. The platform uses client-side JavaScript for demonstration purposes
3. No build process required for basic functionality

### For Production
- Implement server-side authentication
- Connect to database for user and opportunity management
- Set up file storage for capability statements and attachments
- Configure email notifications
- Implement administrator review workflow

## Key Pages

### Public Pages
- **Home** (`index.html`): Dual pathway selection
- **For Vendors** (`for-vendors.html`): SBE journey and requirements
- **For Agencies** (`for-agencies.html`): Posting process and standards
- **Opportunities** (`opportunities.html`): Filterable opportunity listing

### Vendor Dashboard
- Profile completeness indicator
- Action tiles for key tasks
- Capability statement upload
- Opportunity search and filtering

### Agency Dashboard
- Summary metrics
- Opportunity posting form with validation
- Posting management
- Vendor search

## Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contact
For questions or support:
- **Email**: SBEss@dot.ca.gov
- **Phone**: (916) 324-1700
- **Hours**: Monday - Friday, 8:00 AM - 5:00 PM PST

## License
© 2026 California Department of Transportation. All rights reserved.


-- Last deployed: 03/09/2026 18:39:40
