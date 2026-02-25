# G-Shelf Project - Complete Tech Stack

## Frontend Technologies

### Core Framework & Libraries
- **React** (v19.1.1) - UI library for building user interfaces
- **React DOM** (v19.1.1) - React rendering for web browsers
- **React Router DOM** (v7.9.3) - Client-side routing and navigation

### Build Tools & Development
- **Vite** (v7.1.12 - rolldown-vite) - Fast build tool and development server
- **@vitejs/plugin-react** (v5.0.3) - Vite plugin for React support
- **ESLint** (v9.36.0) - JavaScript/React code linting
- **@eslint/js** (v9.36.0) - ESLint JavaScript configuration
- **eslint-plugin-react-hooks** (v5.2.0) - React Hooks linting rules
- **eslint-plugin-react-refresh** (v0.4.20) - React Fast Refresh linting
- **globals** (v16.4.0) - Global variables for ESLint

### Type Definitions
- **@types/react** (v19.1.13) - TypeScript definitions for React
- **@types/react-dom** (v19.1.9) - TypeScript definitions for React DOM

## Backend Technologies

### Core Framework
- **Express** (v5.1.0) - Web application framework for Node.js
- **Node.js** - JavaScript runtime environment

### Database
- **MongoDB** - NoSQL document database
- **Mongoose** (v8.18.3) - MongoDB object modeling for Node.js

### Authentication & Security
- **bcrypt** (v6.0.0) - Password hashing library
- **jsonwebtoken** (v9.0.2) - JSON Web Token implementation
- **express-session** (v1.18.2) - Session middleware for Express

### Middleware & Utilities
- **cors** (v2.8.5) - Cross-Origin Resource Sharing middleware
- **dotenv** (v17.2.3) - Environment variable management

## APIs & External Services

### Geocoding & Location Services
- **OpenStreetMap Nominatim API** - Reverse and forward geocoding
- **Browser Geolocation API** - User location detection

## Styling & UI

### CSS
- **Custom CSS** - Scoped stylesheets for components
  - `Homepage.css` - Homepage styling
  - `Profile.css` - Profile pages styling
  - `Card.css` - Card component styling
  - `Checkout.css` - Checkout page styling
  - `LocationModal.css` - Location modal styling

### Design Features
- **CSS Grid & Flexbox** - Layout systems
- **CSS Animations** - Transitions and animations
- **Backdrop Filters** - Glassmorphism effects
- **Gradient Backgrounds** - Animated gradient overlays
- **Responsive Design** - Mobile-first approach with media queries

## Project Structure

### Frontend Architecture
- **Component-Based** - React functional components with hooks
- **Context API** - Authentication state management (AuthContext)
- **Service Layer** - API service abstraction (`services/api.js`)
- **Protected Routes** - Route protection component

### Backend Architecture
- **RESTful API** - Express.js routes
- **MVC Pattern** - Models, Routes, Controllers separation
- **Middleware** - Authentication, CORS, session management

## Data Models

### MongoDB Schemas
- **User Model** - User accounts with roles (customer, seller, NGO, admin)
- **Product Model** - Products with location, pricing, and serviceability
- **Cart Model** - Shopping cart items
- **Order Model** - Order history and tracking
- **UserProfile Model** - Extended user profile information

### Geospatial Features
- **2dsphere Indexes** - MongoDB geospatial indexing for location queries
- **Haversine Distance** - Distance calculation between coordinates

## Development Tools

### Scripts
- `npm run dev` - Start development server (Vite)
- `npm run build` - Build for production
- `npm run server` - Start backend server
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build
- `npm run test-db` - Test MongoDB connection
- `npm run test-auth` - Test authentication
- `npm run clear-db` - Clear database

## Key Features & Technologies Used

### Location-Based Services
- Browser Geolocation API
- Reverse Geocoding (Nominatim)
- Forward Geocoding (Nominatim)
- Distance calculation (Haversine formula)
- MongoDB geospatial queries ($geoWithin, $near)

### Authentication & Authorization
- JWT (JSON Web Tokens)
- bcrypt password hashing
- Session management
- Role-based access control (RBAC)

### Dynamic Pricing
- Automatic discount calculation based on expiry dates
- Price updater utility
- Discount types (percentage, fixed amount)

### File Handling
- Base64 image encoding
- File upload handling
- Image preview functionality

## Environment Variables

Required environment variables (see `env.example`):
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `SESSION_SECRET` - Secret for session management
- `CORS_ORIGIN` - Allowed CORS origins
- `NODE_ENV` - Environment (development/production)

## Browser APIs Used

- **Geolocation API** - Get user's current location
- **FileReader API** - Read and encode image files
- **LocalStorage API** - Store authentication tokens
- **Fetch API** - HTTP requests

## Package Manager

- **npm** - Node Package Manager

## Version Control

- **Git** - Version control system (implied by project structure)

---

## Summary

This is a **full-stack MERN-like application** (MongoDB, Express, React, Node.js) with:
- Modern React 19 with hooks and context
- Express.js REST API backend
- MongoDB with Mongoose ODM
- JWT-based authentication
- Location-based services with geospatial queries
- Responsive CSS design with modern UI patterns
- Vite for fast development and building

The project implements a food marketplace platform with features for customers, sellers, NGOs, and administrators, including location-based product filtering, dynamic pricing, and donation management.
