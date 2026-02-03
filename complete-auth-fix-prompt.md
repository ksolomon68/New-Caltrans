# CRITICAL: Login and Registration System Failure - Complete Diagnostic and Fix

## Error Summary
**Primary Issue**: Users cannot log in or register new accounts
**Error Message**: "Server misconfiguration: API returned a static page instead of JSON. (Status: 500)"
**Root Cause**: Database connection issues and API endpoint failures

## STEP 1: Diagnose the Live Site

### Check Live Site Health
1. Navigate to the live website URL
2. Attempt to register a new account - document exact error
3. Attempt to log in with existing credentials - document exact error
4. Open browser Developer Tools (F12) and check:
   - **Console tab**: Look for JavaScript errors
   - **Network tab**: Monitor API calls during login/registration
   - Record the exact endpoint being called (e.g., `/api/auth/login`, `/api/auth/register`)
   - Check the response status code and response body
   - Verify request headers and payload

### API Endpoint Analysis
Check these specific endpoints on the live site:
- `POST /api/auth/register` or `/api/register`
- `POST /api/auth/login` or `/api/login`
- `POST /api/auth/logout` or `/api/logout`
- Any related authentication endpoints

**For each endpoint, verify**:
- Is it returning JSON or HTML?
- What is the exact status code? (500, 404, 502, etc.)
- What is the response body content?
- Are there any CORS errors?

## STEP 2: Server-Side Diagnostics

### Check Server Logs
```bash
# View most recent server logs
tail -f /var/log/your-app/error.log
# or
pm2 logs
# or
journalctl -u your-app-service -f
```

Look for:
- Database connection errors
- Uncaught exceptions
- Stack traces related to auth endpoints
- Port binding issues
- Environment variable problems

### Database Connection Verification

**Check if database is running**:
```bash
# For MongoDB
mongosh --eval "db.adminCommand('ping')"
# or
sudo systemctl status mongod

# For PostgreSQL
sudo systemctl status postgresql
# or
psql -U your_username -d your_database -c "SELECT 1;"

# For MySQL
sudo systemctl status mysql
# or
mysql -u your_username -p -e "SELECT 1;"
```

**Verify database credentials**:
```bash
# Check environment variables
printenv | grep DB
printenv | grep DATABASE
printenv | grep MONGO
printenv | grep POSTGRES
printenv | grep MYSQL
```

**Test database connection from Node.js**:
Create a test script `test-db.js`:
```javascript
// For MongoDB
const mongoose = require('mongoose');
const dbUri = process.env.DATABASE_URL || 'your-connection-string';

mongoose.connect(dbUri)
  .then(() => {
    console.log('✅ Database connected successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  });

// For PostgreSQL/MySQL with Sequelize
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL);

sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connected successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  });
```

Run: `node test-db.js`

## STEP 3: Fix Authentication API Endpoints

### Common Issues and Fixes

#### Issue 1: API Returning HTML Instead of JSON (Status 500)

**Cause**: Server error is being caught by error handler that returns HTML error page

**Fix**: Update authentication route error handlers

**Location**: `/routes/auth.js` or `/routes/api/auth.js`

```javascript
// BEFORE (Bad - returns HTML on error)
app.post('/api/auth/login', async (req, res) => {
  try {
    // login logic
  } catch (error) {
    res.status(500).send('Error'); // Returns HTML
  }
});

// AFTER (Good - returns JSON)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    // Create token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      success: true, 
      token, 
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
```

#### Issue 2: Global Error Handler Returning HTML

**Fix**: Update global error handler in main app file

**Location**: `/app.js` or `/server.js` or `/index.js`

```javascript
// Add this BEFORE any other error handlers
app.use('/api/*', (err, req, res, next) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Ensure this is AFTER all routes
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  
  // Check if request expects JSON
  if (req.path.startsWith('/api/') || req.accepts('json')) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  }
  
  // Otherwise return HTML error page
  res.status(err.status || 500).render('error', { error: err });
});
```

#### Issue 3: Database Connection Not Established Before Routes

**Fix**: Ensure database connects before server starts

**Location**: `/server.js` or `/index.js`

```javascript
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL || process.env.MONGODB_URI;

// Connect to database FIRST
mongoose.connect(DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Database connected successfully');
  
  // Start server ONLY after database connection
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
})
.catch(err => {
  console.error('❌ Database connection failed:', err);
  process.exit(1);
});
```

#### Issue 4: Missing or Invalid Environment Variables

**Fix**: Verify and update `.env` file

**Location**: `/.env`

```env
# Database
DATABASE_URL=mongodb://localhost:27017/your_database_name
# or
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/dbname

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Server
NODE_ENV=production
PORT=3000

# Session (if using express-session)
SESSION_SECRET=your-session-secret-key
```

**Create script to validate environment variables**:

**Location**: `/scripts/check-env.js`

```javascript
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'PORT'
];

console.log('Checking environment variables...\n');

let hasErrors = false;

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing: ${varName}`);
    hasErrors = true;
  } else {
    console.log(`✅ Found: ${varName}`);
  }
});

if (hasErrors) {
  console.error('\n❌ Environment configuration is incomplete');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are set');
  process.exit(0);
}
```

Run: `node scripts/check-env.js`

## STEP 4: Fix Registration Endpoint

**Location**: `/routes/auth.js` or `/controllers/authController.js`

```javascript
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields' 
      });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid email address' 
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'vendor' // default role
    });
    
    // Create token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({ 
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific database errors
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
```

## STEP 5: Fix Frontend API Calls

**Location**: Frontend JavaScript files handling login/registration

```javascript
// REGISTER
async function register(name, email, password, role) {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, password, role })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }
    
    // Store token
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Redirect based on role
    if (data.user.role === 'agency') {
      window.location.href = '/agency-dashboard.html';
    } else {
      window.location.href = '/vendor-dashboard.html';
    }
    
    return data;
    
  } catch (error) {
    console.error('Registration error:', error);
    alert(error.message);
    throw error;
  }
}

// LOGIN
async function login(email, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    
    // Store token
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Redirect based on role
    if (data.user.role === 'agency') {
      window.location.href = '/agency-dashboard.html';
    } else {
      window.location.href = '/vendor-dashboard.html';
    }
    
    return data;
    
  } catch (error) {
    console.error('Login error:', error);
    alert(error.message);
    throw error;
  }
}
```

## STEP 6: Database Schema Verification

**Ensure User model/schema is properly defined**

**Location**: `/models/User.js`

```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['vendor', 'agency', 'admin'],
    default: 'vendor'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
```

## STEP 7: Restart and Test

### Restart the Application

```bash
# If using PM2
pm2 restart all
pm2 logs

# If using systemd
sudo systemctl restart your-app
sudo systemctl status your-app

# If running directly with node
# Kill the process and restart
pkill -f "node server.js"
node server.js

# Or with nodemon
npm run dev
```

### Test Systematically

1. **Test Database Connection**:
   ```bash
   node test-db.js
   ```

2. **Test Registration**:
   - Open browser
   - Navigate to registration page
   - Open DevTools > Network tab
   - Fill in registration form
   - Submit and observe:
     - Request payload
     - Response status
     - Response body (should be JSON)

3. **Test Login**:
   - Navigate to login page
   - Use credentials from registration
   - Submit and observe network traffic

4. **Verify Token Storage**:
   - Open DevTools > Application > Local Storage
   - Check if token is stored

5. **Verify Redirect**:
   - Confirm redirect to appropriate dashboard

## STEP 8: Additional Debugging Tools

### Enable Verbose Logging

**Location**: `/middleware/logger.js` (create if doesn't exist)

```javascript
module.exports = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  // Log response
  const originalSend = res.send;
  res.send = function(data) {
    console.log('Response:', data);
    originalSend.apply(res, arguments);
  };
  
  next();
};
```

Add to app.js:
```javascript
const logger = require('./middleware/logger');
app.use('/api/*', logger);
```

### Health Check Endpoint

**Location**: `/routes/health.js`

```javascript
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'OK',
    database: 'disconnected'
  };
  
  try {
    // Check database
    if (mongoose.connection.readyState === 1) {
      health.database = 'connected';
    }
    
    res.status(200).json(health);
  } catch (error) {
    health.status = 'ERROR';
    health.error = error.message;
    res.status(503).json(health);
  }
});

module.exports = router;
```

Visit: `https://your-site.com/health`

## STEP 9: Common Antipatterns to Fix

### ❌ WRONG: Mixed response types
```javascript
app.post('/api/login', (req, res) => {
  if (error) {
    res.render('error'); // Returns HTML
  }
  res.json({ success: true }); // Returns JSON
});
```

### ✅ CORRECT: Consistent JSON responses
```javascript
app.post('/api/login', (req, res) => {
  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
  res.json({ success: true });
});
```

### ❌ WRONG: Unhandled promise rejections
```javascript
app.post('/api/login', async (req, res) => {
  const user = await User.findOne({ email }); // Can crash
});
```

### ✅ CORRECT: Proper error handling
```javascript
app.post('/api/login', async (req, res) => {
  try {
    const user = await User.findOne({ email });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

## STEP 10: Verification Checklist

After implementing fixes, verify:

- [ ] Database is running and accessible
- [ ] Environment variables are properly set
- [ ] `/health` endpoint returns 200 with database status
- [ ] `/api/auth/register` returns JSON (not HTML)
- [ ] `/api/auth/login` returns JSON (not HTML)
- [ ] Registration creates user in database
- [ ] Login validates credentials correctly
- [ ] JWT token is generated and returned
- [ ] Frontend stores token in localStorage
- [ ] User is redirected to correct dashboard
- [ ] No 500 errors in server logs
- [ ] No console errors in browser
- [ ] Network tab shows proper JSON responses

## Emergency Database Recovery

If database is completely broken:

```bash
# Backup current database
mongodump --db your_database --out ./backup

# Drop and recreate database (CAREFUL!)
mongo
> use your_database
> db.dropDatabase()

# Restart app to recreate collections
pm2 restart all

# If using migrations
npm run migrate
```

## Contact Points for Further Debugging

If issues persist, check:
1. Server logs: `/var/log/`
2. Application logs: Check PM2 or systemd logs
3. Database logs: MongoDB/PostgreSQL/MySQL logs
4. Network configuration: Firewall, ports, proxy settings
5. SSL/TLS certificates if using HTTPS

## Implementation Priority

1. ✅ Fix API endpoints to return JSON (Steps 3 & 4)
2. ✅ Fix database connection (Step 2)
3. ✅ Update frontend API calls (Step 5)
4. ✅ Add error handlers (Step 3)
5. ✅ Add logging (Step 8)
6. ✅ Test thoroughly (Step 7)

Complete these steps methodically and the authentication system should be restored.
