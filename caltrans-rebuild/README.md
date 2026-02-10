# CaltransBizConnect v2.1.0

**Clean rebuild optimized for Hostinger deployment**

## 🚀 Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Start server
npm start

# Server runs at http://localhost:3000
```

## 📦 Deployment to Hostinger

### Step 1: Upload Files

**Option A: Via Git (Recommended)**
```bash
# On your local machine
git init
git add .
git commit -m "Initial deployment v2.1.0"
git remote add origin https://github.com/ksolomon68/CaltransBizConnect.git
git push -u origin main

# On Hostinger (via SSH or cPanel Terminal)
cd ~/public_html
git clone https://github.com/ksolomon68/CaltransBizConnect.git .
```

**Option B: Via cPanel File Manager**
1. Zip the entire `caltrans-rebuild` folder
2. Upload via cPanel File Manager
3. Extract in `public_html` directory

### Step 2: Install Dependencies

Via cPanel Terminal or SSH:
```bash
cd ~/public_html
npm install
```

### Step 3: Configure Node.js App

1. Login to cPanel
2. Navigate to **"Setup Node.js App"**
3. Click **"CREATE APPLICATION"**
4. Configure:
   - **Node.js version**: 18.x or higher
   - **Application mode**: Production
   - **Application root**: `/home/username/public_html`
   - **Application URL**: `https://caltransbizconnect.org`
   - **Application startup file**: `index.js`
   - **Passenger log file**: Leave default
5. Click **"CREATE"**

### Step 4: Start Application

1. Click **"RESTART"** button in Node.js App interface
2. Wait 10-15 seconds for startup
3. Visit `https://caltransbizconnect.org`

### Step 5: Verify Deployment

1. Visit `https://caltransbizconnect.org/api/health`
2. Should see:
   ```json
   {
     "status": "ok",
     "version": "2.1.0",
     "database": { "status": "ok" }
   }
   ```

## 🔧 Configuration

### Environment Variables (Optional)

Create `.env` file in root (if needed):
```env
NODE_ENV=production
PORT=3000
```

### Database

- SQLite database (`data.db`) is created automatically on first run
- Located in root directory
- Includes automatic schema initialization

### Default Admin Account

After first run, seed an admin account:
```bash
npm run seed
```

Default credentials:
- **Email**: `admin@caltransbizconnect.org`
- **Password**: `Admin123!`

**⚠️ Change this password immediately after first login!**

## 📁 Directory Structure

```
caltrans-rebuild/
├── index.js              # Root entry point (Hostinger compatible)
├── package.json          # Dependencies and scripts
├── server/               # Backend code
│   ├── index.js          # Express server
│   ├── database.js       # SQLite management
│   └── routes/           # API routes
├── public/               # Static files (served by Express)
│   ├── *.html            # All HTML pages
│   ├── css/              # Stylesheets
│   ├── js/               # Client-side JavaScript
│   └── assets/           # Images, fonts, etc.
└── uploads/              # User-uploaded files
```

## 🔒 Security Features (v2.1.0)

✅ **Immediate Auth Protection**: All dashboards check authentication before loading  
✅ **Role-Based Access**: Admin, Vendor, Agency roles enforced  
✅ **Mobile Navigation**: Responsive hamburger menu  
✅ **Error Visibility**: Failed API calls show user-friendly errors  

## 🐛 Troubleshooting

### Server won't start
```bash
# Check Node.js version
node --version  # Should be 18.x or higher

# Check for port conflicts
lsof -i :3000  # If running locally

# View logs
cat ~/logs/caltransbizconnect_stderr.log
```

### Database errors
```bash
# Delete and recreate database
rm data.db
npm start  # Will recreate automatically
npm run seed  # Recreate admin user
```

### Static files not loading
- Verify all files are in `public/` directory
- Check file permissions: `chmod -R 755 public/`
- Clear browser cache: `Ctrl+Shift+R`

### 503 Service Unavailable
- Restart app via cPanel Node.js interface
- Check `Application startup file` is set to `index.js`
- Verify `npm install` completed successfully

## 📞 Support

For issues or questions:
- Check logs in cPanel
- Review `/api/health` endpoint
- Verify database exists: `ls -la data.db`

## 🎯 What's New in v2.1.0

- ✅ Fixed unauthorized dashboard access vulnerability
- ✅ Implemented mobile navigation with slide-out sidebar
- ✅ Added visible error indicators for failed API calls
- ✅ Verified profile saving backend functionality
- ✅ Clean rebuild with optimized file structure
- ✅ Hostinger-specific deployment optimizations

---

**Version**: 2.1.0  
**Last Updated**: 2026-02-03  
**License**: MIT
