import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import apiRoutes from "./routes/api.js";

dotenv.config();

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Session middleware
app.use(session({
    name: "sessionId",
    secret: process.env.SESSION_SECRET || "fallback-secret-key-123",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// MongoDB connection with better error handling
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/gshelf";
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ MongoDB connected successfully");
        console.log(`📊 Database: ${mongoose.connection.name}`);
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        console.log("💡 Make sure MongoDB is running on your system");
        console.log("💡 Or set MONGO_URI environment variable for remote connection");
        process.exit(1);
    }
};

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
    } catch (err) {
        console.error('Error during MongoDB disconnection:', err);
        process.exit(1);
    }
});

connectDB();

// API Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({ 
        status: "Server is running", 
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
        version: "2.0.0"
    });
});

// Test route
app.get("/api/test", (req, res) => {
    res.json({ 
        message: "GreenShelf API is working!",
        timestamp: new Date().toISOString(),
        version: "2.0.0"
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'API endpoint not found' 
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
    });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🧪 Test route: http://localhost:${PORT}/api/test`);
});