# Platform Upgrade - Maintenance Mode Instructions

This guide explains how to manage the Maintenance Mode for the Caltrans Biz Connect platform.

## Overview
A high-end, premium maintenance landing page has been integrated into the Node.js/Express application. When activated, all standard web traffic is routed to `maintenance.html`, while API requests gracefully return JSON 503 errors. 

## Enabling Maintenance Mode
To enable maintenance mode, set the `MAINTENANCE_MODE` environment variable to `true`.

### Local Environment (`.env`)
```env
MAINTENANCE_MODE=true
```

### Production Environment (`.env.production` or Hostinger)
Ensure that your live `.env.production` file has the variable set, or set it directly in your hosting provider's environment variables panel:
```env
MAINTENANCE_MODE=true
```
*Note: You may need to restart the Node.js server for changes to the `.env` file to take effect.*

## Disabling Maintenance Mode
To turn off maintenance mode and return to normal operation, either remove the environment variable or set it to `false`:
```env
MAINTENANCE_MODE=false
```

## Developer / Admin Bypass
Developers and administrators can bypass the maintenance page to review the live site during an upgrade. 

### Method 1: URL Parameter
Append `?admin=true` to the end of any site URL:
`https://caltransbizconnect.org/?admin=true`

This will set a hidden cookie (`admin_bypass=true`) securely on your browser. Once set, you can navigate the entire site normally without needing the URL parameter again for 24 hours.

### Method 2: IP Whitelist
By default, requests coming from `localhost` natively bypass the maintenance blocker. You can add additional IP addresses to the `isAllowedIP` array inside `server/index.js` under the maintenance middleware if you wish to whitelist office IP addresses.

## Project Folder Structure

The implementation added/modified the following items:

```text
caltransbizconnect/
├── .env                       # (Environment variables)
├── .env.production            # (Live environment variables)
├── server/
│   └── index.js               # [MODIFIED] Added the maintenance middleware router
├── maintenance.html           # [NEW] The high-end upgrade landing page
├── css/
│   └── maintenance.css        # [NEW] Specific styles for the landing page
└── js/
    └── maintenance-animations.js # [NEW] Handles the entrance animations and email notifications
```
