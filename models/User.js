import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['customer', 'seller', 'ngo', 'admin'],
    default: 'customer'
  },
  profile: {
    firstName: String,
    lastName: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    avatar: String,
    bio: String,
    // NGO verification fields
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    registration: String,
    verificationDocumentUrl: String,
    verificationSubmittedAt: Date,
    rejectionReason: String,
    organizationName: String,
    // Admin history for tracking approvals/rejections
    adminHistory: [{
      action: { type: String, enum: ['approved', 'rejected'] },
      adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      adminEmail: String,
      reason: String,
      timestamp: { type: Date, default: Date.now }
    }]
  },
  location: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    },
    address: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  notifications: [
    {
      id: String,
      message: String,
      type: { type: String },
      read: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Geospatial index for location-based queries
userSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Determine whether the user profile is complete enough for actions
userSchema.methods.isProfileComplete = function() {
  const p = this.profile || {};

  let baseName = '';
  if (this.role === 'ngo') {
    baseName =
      (p.organizationName ||
        this.username ||
        this.email ||
        '').toString().trim();
  } else {
    baseName =
      (p.firstName ||
        this.username ||
        this.email ||
        '').toString().trim();
  }

  const hasName = Boolean(baseName);
  const hasPhone = Boolean((p.phone || '').toString().trim());
  const addr = p.address || {};
  const hasAnyAddress = Boolean(
    (addr.street || addr.city || addr.state || addr.zipCode || addr.country || '')
      .toString()
      .trim()
  );

  return hasName && hasPhone && hasAnyAddress;
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model('User', userSchema);

export default User;
