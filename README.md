# 🌱 GreenShelf - Sustainable Marketplace

A full-stack e-commerce platform connecting customers, sellers, and NGOs for sustainable shopping and food waste reduction.

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MongoDB Atlas Account** (Free) - [Sign up here](https://www.mongodb.com/atlas)

### 1. Clone and Instal
```bash
# Clone the repository
git clone <your-repo-url>
cd G-shelf

# Install dependencies
npm install
```

### 2. Set Up MongoDB Atlas
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account and cluster
3. Create a database user
4. Whitelist your IP address (or use 0.0.0.0/0 for development)
5. Get your connection string

### 3. Configure Environment
Create a `.env` file in the project root:
```env
# Database Configuration
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/gshelf?retryWrites=true&w=majority

# Server Configuration
PORT=5001
NODE_ENV=development

# Frontend Configuration
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h
```

### 4. Test Database Connection
```bash
npm run test-db
```

### 5. Run the Application

**Option A: Run Both Servers (Recommended)**
```bash
# Terminal 1: Start Backend Server
npm run server

# Terminal 2: Start Frontend Server
npm run dev
```

**Option B: Run Individual Servers**
```bash
# Backend only
npm run server

# Frontend only
npm run dev
```

## 🌐 Access Your Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5001
- **API Documentation**: http://localhost:5001/

## 📁 Project Structure

```
G-shelf/
├── src/                    # Frontend (React + Vite)
│   ├── App.jsx             # Main app component
│   ├── GreenShelfHomepage.jsx
│   ├── CustomerProfile.jsx
│   ├── SellerProfile.jsx
│   ├── NGOProfile.jsx
│   ├── LoginCard.jsx
│   ├── ProtectedRoute.jsx
│   ├── contexts/
│   │   └── AuthContext.jsx
│   └── styles/
├── models/                 # Database Models
│   ├── User.js            # User authentication & profiles
│   ├── Product.js         # Product management
│   ├── Cart.js            # Shopping cart
│   └── Order.js           # Order processing
├── routes/                 # API Routes
│   ├── auth.js            # Authentication endpoints
│   ├── products.js        # Product CRUD operations
│   ├── cart.js            # Shopping cart operations
│   ├── orders.js          # Order management
│   └── api.js             # Main API router
├── server.js              # Main backend server
├── test-mongodb-connection.js  # Database connection test
├── .env                   # Environment configuration
├── package.json          # Dependencies & scripts
└── README.md             # This file
```

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start frontend development server
npm run server           # Start backend server with MongoDB Atlas
npm run start           # Alias for npm run server

# Testing
npm run test-db         # Test MongoDB Atlas connection

# Production
npm run build           # Build frontend for production
npm run preview         # Preview production build

# Code Quality
npm run lint            # Run ESLint
```

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Products
- `GET /api/products` - Get all products (with filtering)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (seller only)
- `PUT /api/products/:id` - Update product (seller only)
- `DELETE /api/products/:id` - Delete product (seller only)

### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update` - Update item quantity
- `DELETE /api/cart/remove` - Remove item from cart
- `DELETE /api/cart/clear` - Clear entire cart

### Orders
- `POST /api/orders/create` - Create order from cart
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get single order
- `PUT /api/orders/:id/status` - Update order status

### Utility
- `GET /api/health` - Health check
- `GET /api/test` - Test endpoint

## 👥 User Roles

### Customer
- Browse and search products
- Add items to cart
- Place orders
- Track order history
- Donate items to NGOs

### Seller
- Create and manage product listings
- Set dynamic pricing based on expiry
- Track sales and donations
- Manage inventory

### NGO
- Request donations from sellers
- Manage received donations
- Track inventory
- Distribute items to beneficiaries

## 🌟 Key Features

### ✅ Authentication & Security
- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Protected routes

### ✅ Product Management
- Full CRUD operations
- Advanced search and filtering
- Category management
- Inventory tracking
- Dynamic pricing based on expiry

### ✅ Shopping Experience
- Add/remove items from cart
- Quantity management
- Real-time updates
- Persistent storage

### ✅ Order Processing
- Order creation from cart
- Status tracking
- Payment integration ready
- Shipping management

### ✅ Sustainability Focus
- Eco-friendly product tagging
- Food waste reduction
- NGO donation system
- Sustainable shopping practices

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB Atlas connection string | Yes |
| `PORT` | Server port (default: 5001) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `CORS_ORIGIN` | Allowed frontend origins | No |
| `SESSION_SECRET` | Session encryption key | Yes |
| `JWT_SECRET` | JWT token secret | Yes |

## 🚨 Troubleshooting

### Database Connection Issues
```bash
# Test your MongoDB Atlas connection
npm run test-db

# Common issues:
# 1. Check your .env file has correct MONGO_URI
# 2. Verify MongoDB Atlas cluster is running
# 3. Ensure your IP address is whitelisted
# 4. Check your database user credentials
```

### Port Conflicts
```bash
# Check if ports are in use
netstat -ano | findstr :5001
netstat -ano | findstr :5173

# Kill process using port (Windows)
taskkill /PID <PID> /F
```

### Dependencies Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy dist/ folder
```

### Backend (Heroku/Railway)
```bash
# Set environment variables in your hosting platform
# Deploy the entire project
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:
1. Check this README
2. Verify all prerequisites are installed
3. Check console for error messages
4. Ensure MongoDB Atlas is properly configured
5. Verify all environment variables are set

---

**Happy coding! 🌱**
