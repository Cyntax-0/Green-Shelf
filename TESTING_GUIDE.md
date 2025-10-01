# GreenShelf Project Testing Guide

## 🚨 Current Status: Node.js Not Installed

**Issue**: Node.js and npm are not installed on your system, which prevents running the project.

**Solution**: Install Node.js first (see installation instructions below).

## 🔍 Potential Issues Identified

### 1. **Critical Dependencies Missing**
- Node.js and npm are not installed
- MongoDB is not installed/running

### 2. **Environment Configuration**
- `.env` file needs to be created
- MongoDB connection string needs to be configured

### 3. **Port Conflicts**
- Backend runs on port 5001
- Frontend runs on port 3000
- MongoDB runs on port 27017

## 🛠️ Step-by-Step Testing Process

### Step 1: Install Prerequisites

1. **Install Node.js**:
   ```bash
   # Download from https://nodejs.org/
   # Install LTS version
   # Verify installation:
   node --version
   npm --version
   ```

2. **Install MongoDB**:
   ```bash
   # Download from https://www.mongodb.com/try/download/community
   # Install and start MongoDB service
   ```

### Step 2: Set Up Environment

1. **Create .env file**:
   ```bash
   # In gshelf directory
   echo MONGO_URI=mongodb://localhost:27017/gshelf > .env
   echo PORT=5001 >> .env
   echo SESSION_SECRET=your-super-secret-session-key-here >> .env
   echo FRONTEND_URL=http://localhost:3000 >> .env
   echo NODE_ENV=development >> .env
   ```

### Step 3: Install Dependencies

```bash
cd gshelf
npm install
```

### Step 4: Test Backend Server

```bash
# Terminal 1
npm run server
```

**Expected Output**:
```
✅ MongoDB connected successfully
📊 Database: gshelf
🚀 Server running on http://localhost:5001
🔍 Health check: http://localhost:5001/api/health
```

**Potential Errors**:
- `MongoDB connection failed` - MongoDB not running
- `Port 5001 already in use` - Port conflict
- `Module not found` - Dependencies not installed

### Step 5: Test Frontend

```bash
# Terminal 2
npm run dev
```

**Expected Output**:
```
  VITE v7.1.12  ready in 1234 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

**Potential Errors**:
- `Port 3000 already in use` - Port conflict
- `Module not found` - Dependencies not installed
- `Build failed` - Code syntax errors

## 🧪 Testing Scenarios

### 1. **Authentication Flow**
- [ ] Access homepage without login
- [ ] Try to access `/customer` directly (should redirect)
- [ ] Sign up new user
- [ ] Login with credentials
- [ ] Access profile pages after login
- [ ] Logout functionality

### 2. **Theme System**
- [ ] Toggle between light/dark mode
- [ ] Theme persistence across page reloads
- [ ] Theme toggle visibility

### 3. **Product Features**
- [ ] Product cards display correctly
- [ ] Search functionality works
- [ ] Filter by category works
- [ ] Add to cart functionality
- [ ] Cart restrictions (one store at a time)

### 4. **Responsive Design**
- [ ] Mobile view (320px - 768px)
- [ ] Tablet view (768px - 1024px)
- [ ] Desktop view (1024px+)

## 🐛 Common Error Solutions

### Error: "Module not found"
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Error: "MongoDB connection failed"
```bash
# Solution: Start MongoDB service
# Windows: Start MongoDB service from Services
# Or run: mongod
```

### Error: "Port already in use"
```bash
# Solution: Change port in .env file
PORT=5002  # For backend
# Or kill process using the port
netstat -ano | findstr :5001
taskkill /PID <PID> /F
```

### Error: "CORS error"
```bash
# Solution: Check FRONTEND_URL in .env
FRONTEND_URL=http://localhost:3000
```

## 📊 Health Check Endpoints

### Backend Health Check
```bash
curl http://localhost:5001/api/health
```

**Expected Response**:
```json
{
  "status": "Server is running",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "mongodb": "Connected",
  "version": "2.0.0"
}
```

### Frontend Health Check
- Visit: http://localhost:3000
- Should see GreenShelf homepage
- Theme toggle should be visible

## 🔧 Debugging Commands

### Check Node.js Installation
```bash
node --version
npm --version
```

### Check MongoDB Status
```bash
# Windows
net start MongoDB
# Or check services.msc
```

### Check Port Usage
```bash
netstat -ano | findstr :5001
netstat -ano | findstr :3000
netstat -ano | findstr :27017
```

### Check Dependencies
```bash
npm list
npm audit
```

## 📝 Test Checklist

- [ ] Node.js installed and working
- [ ] MongoDB installed and running
- [ ] Dependencies installed successfully
- [ ] Backend server starts without errors
- [ ] Frontend development server starts
- [ ] Homepage loads correctly
- [ ] Authentication system works
- [ ] Protected routes redirect properly
- [ ] Theme toggle functions
- [ ] Responsive design works
- [ ] No console errors in browser
- [ ] No server errors in terminal

## 🚀 Quick Start Commands

```bash
# 1. Install Node.js from https://nodejs.org/
# 2. Install MongoDB from https://www.mongodb.com/

# 3. Set up project
cd gshelf
echo MONGO_URI=mongodb://localhost:27017/gshelf > .env
echo PORT=5001 >> .env
echo SESSION_SECRET=your-secret-key >> .env
echo FRONTEND_URL=http://localhost:3000 >> .env

# 4. Install dependencies
npm install

# 5. Start backend (Terminal 1)
npm run server

# 6. Start frontend (Terminal 2)
npm run dev

# 7. Test the application
# Visit: http://localhost:3000
```

## 📞 Support

If you encounter issues:
1. Check this testing guide
2. Verify all prerequisites are installed
3. Check console for error messages
4. Ensure all ports are available
5. Verify MongoDB is running
