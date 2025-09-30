import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());

// CORS - simplified version
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

// Session middleware
app.use(session({
    name: "sessionId",
    secret: process.env.SESSION_SECRET || "fallback-secret-key-123",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// MongoDB connection with better error handling
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/gshelf", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ MongoDB connected successfully");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        console.log("💡 Make sure MongoDB is running on your system");
        process.exit(1);
    }
};

connectDB();

// User Schema
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "Customer" },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);

// Routes
app.post("/api/signup", async (req, res) => {
    try {
        console.log("📝 Signup attempt for:", req.body.email);
        const { email, password, role } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "Email and password are required" 
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ 
                success: false, 
                message: "This email is already registered!" 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ 
            email, 
            password: hashedPassword, 
            role: role || "Customer" 
        });
        
        await user.save();
        
        req.session.user = { 
            id: user._id, 
            email: user.email, 
            role: user.role 
        };
        
        console.log("✅ User registered:", email);
        res.json({ 
            success: true, 
            message: "Signup successful", 
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error("❌ Signup error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Server error during signup" 
        });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        console.log("🔐 Login attempt for:", req.body.email);
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "Email and password are required" 
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            console.log("❌ User not found:", email);
            return res.status(401).json({ 
                success: false, 
                message: "Invalid email or password" 
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log("❌ Invalid password for:", email);
            return res.status(401).json({ 
                success: false, 
                message: "Invalid email or password" 
            });
        }

        req.session.user = { 
            id: user._id, 
            email: user.email, 
            role: user.role 
        };

        console.log("✅ Login successful:", email);
        res.json({ 
            success: true, 
            message: "Login successful", 
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error("❌ Login error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Server error during login" 
        });
    }
});

app.get("/api/check-session", (req, res) => {
    if (req.session.user) {
        res.json({ 
            loggedIn: true, 
            user: req.session.user 
        });
    } else {
        res.json({ 
            loggedIn: false 
        });
    }
});

app.post("/api/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("❌ Logout error:", err);
            return res.status(500).json({ success: false });
        }
        res.clearCookie("sessionId");
        res.json({ success: true });
    });
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({ 
        status: "Server is running", 
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
    });
});

// Test route
app.get("/api/test", (req, res) => {
    res.json({ message: "Server is working!" });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🧪 Test route: http://localhost:${PORT}/api/test`);
});