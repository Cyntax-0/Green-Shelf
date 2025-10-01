# GreenShelf - Sustainable Food Marketplace

A modern React-based e-commerce platform for sustainable food products with dynamic styling and MongoDB integration.

## 🌟 Features

### Frontend Features
- **Dynamic Theme System**: Light/Dark mode toggle with CSS variables
- **Modern UI/UX**: Glassmorphism effects, smooth animations, and responsive design
- **Interactive Components**: Animated product cards, hover effects, and micro-interactions
- **Responsive Design**: Mobile-first approach with breakpoints for all devices
- **User Authentication**: Login/Signup with role-based access (Customer, Seller, NGO)

### Backend Features
- **MongoDB Integration**: Comprehensive database models and relationships
- **RESTful API**: Complete CRUD operations for all entities
- **Session Management**: Secure user authentication and session handling
- **Data Validation**: Input validation and error handling
- **Scalable Architecture**: Modular code structure with separate routes and models

### Database Models
- **Users**: Customer, Seller, and NGO profiles with preferences
- **Products**: Food items with dynamic pricing based on expiry
- **Orders**: Complete order management system
- **Cart**: Shopping cart functionality with store restrictions

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gshelf
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   MONGO_URI=mongodb://localhost:27017/gshelf
   PORT=5001
   SESSION_SECRET=your-secret-key
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   - Local: `mongod`
   - Atlas: Use your connection string in `.env`

5. **Start the application**
   ```bash
   # Terminal 1 - Backend
   npm run server
   
   # Terminal 2 - Frontend
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001
   - Health Check: http://localhost:5001/api/health

## 📁 Project Structure

```
gshelf/
├── src/
│   ├── components/
│   │   ├── App.jsx
│   │   ├── GreenShelfHomepage.jsx
│   │   ├── LoginCard.jsx
│   │   ├── ThemeToggle.jsx
│   │   └── ProfilePages/
│   ├── styles/
│   │   ├── GreenShelfHomepage.css
│   │   ├── LoginCard.css
│   │   ├── ProfilePages.css
│   │   └── ThemeToggle.css
│   └── main.jsx
├── models/
│   ├── User.js
│   ├── Product.js
│   ├── Order.js
│   └── Cart.js
├── routes/
│   └── api.js
├── server.js
├── package.json
└── README.md
```

## 🎨 Styling System

### CSS Variables
The project uses CSS custom properties for consistent theming:

```css
:root {
    --primary-color: #2ecc71;
    --secondary-color: #3498db;
    --accent-color: #e74c3c;
    --light-bg: #f8f9fa;
    --text-primary: #2c3e50;
    --border-radius: 8px;
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Dark Theme
```css
[data-theme="dark"] {
    --light-bg: #34495e;
    --text-primary: #ecf0f1;
    --border-color: #4a5568;
}
```

### Responsive Breakpoints
- Mobile: < 480px
- Tablet: 480px - 768px
- Desktop: > 768px

## 🔧 API Endpoints

### Authentication
- `POST /api/signup` - User registration
- `POST /api/login` - User login
- `GET /api/check-session` - Check authentication status
- `POST /api/logout` - User logout

### Products
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Seller only)

### Cart
- `GET /api/cart` - Get user cart
- `POST /api/cart/add` - Add item to cart
- `DELETE /api/cart/clear` - Clear cart

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user orders

## 🗄️ Database Schema

### User Model
```javascript
{
    email: String (unique),
    password: String (hashed),
    firstName: String,
    lastName: String,
    role: ['Customer', 'Seller', 'NGO'],
    profile: {
        phone: String,
        address: Object,
        avatar: String,
        bio: String
    },
    preferences: {
        notifications: Object,
        theme: ['light', 'dark', 'auto']
    }
}
```

### Product Model
```javascript
{
    name: String,
    description: String,
    category: ['Fruit', 'Vegetable', 'Dairy', 'Grain', 'Meat', 'Bakery', 'Other'],
    price: Number (calculated),
    originalPrice: Number,
    discount: Number (auto-calculated based on expiry),
    images: Array,
    expiryDate: Date,
    quantity: Number,
    seller: ObjectId (ref: User),
    store: Object,
    status: ['active', 'inactive', 'sold_out', 'expired']
}
```

## 🎯 Key Features Explained

### Dynamic Pricing
Products automatically get discounted based on expiry date:
- 1 day to expiry: 50% off
- 2 days to expiry: 30% off
- 3-5 days to expiry: 20% off
- 6-7 days to expiry: 10% off

### Store Restrictions
Users can only add products from one store at a time to their cart, ensuring consistent delivery.

### Theme System
- Automatic theme detection based on system preferences
- Manual theme toggle with persistence
- Smooth transitions between themes
- CSS variables for easy customization

### Responsive Design
- Mobile-first approach
- Flexible grid layouts
- Touch-friendly interactions
- Optimized for all screen sizes

## 🛠️ Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Adding New Features
1. Create component in `src/components/`
2. Add styles in `src/styles/`
3. Create API routes in `routes/api.js`
4. Add database models in `models/`
5. Update documentation

## 🚀 Deployment

### Frontend (Vercel/Netlify)
1. Build the project: `npm run build`
2. Deploy the `dist` folder
3. Set environment variables

### Backend (Heroku/Railway)
1. Set environment variables
2. Deploy with MongoDB Atlas
3. Update CORS settings

### Environment Variables
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/gshelf
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
SESSION_SECRET=your-production-secret
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@greenshelf.com or create an issue on GitHub.

---

**GreenShelf** - Making sustainable food accessible to everyone! 🌱