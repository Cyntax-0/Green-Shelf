import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Fruit', 'Vegetable', 'Dairy', 'Grain', 'Meat', 'Bakery', 'Other']
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    originalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    images: [{
        url: String,
        alt: String,
        isPrimary: { type: Boolean, default: false }
    }],
    expiryDate: {
        type: Date,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    unit: {
        type: String,
        required: true,
        enum: ['kg', 'lb', 'piece', 'pack', 'liter', 'gallon']
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    store: {
        name: {
            type: String,
            required: true
        },
        location: {
            address: String,
            city: String,
            state: String,
            zipCode: String,
            coordinates: {
                lat: Number,
                lng: Number
            }
        }
    },
    tags: [String],
    isOrganic: {
        type: Boolean,
        default: false
    },
    allergens: [String],
    nutritionInfo: {
        calories: Number,
        protein: Number,
        carbs: Number,
        fat: Number,
        fiber: Number
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'sold_out', 'expired'],
        default: 'active'
    },
    views: {
        type: Number,
        default: 0
    },
    likes: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
ProductSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    
    // Calculate discount based on expiry date
    const now = new Date();
    const expiry = new Date(this.expiryDate);
    const daysToExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    if (daysToExpiry <= 0) {
        this.status = 'expired';
        this.discount = 0;
    } else if (daysToExpiry === 1) {
        this.discount = 50;
    } else if (daysToExpiry <= 2) {
        this.discount = 30;
    } else if (daysToExpiry <= 5) {
        this.discount = 20;
    } else if (daysToExpiry <= 7) {
        this.discount = 10;
    }
    
    // Calculate final price
    this.price = this.originalPrice * (1 - this.discount / 100);
    
    next();
});

// Virtual for days to expiry
ProductSchema.virtual('daysToExpiry').get(function() {
    const now = new Date();
    const expiry = new Date(this.expiryDate);
    return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
});

// Virtual for isExpiringSoon
ProductSchema.virtual('isExpiringSoon').get(function() {
    return this.daysToExpiry <= 2;
});

// Index for better query performance
ProductSchema.index({ category: 1, status: 1 });
ProductSchema.index({ seller: 1, status: 1 });
ProductSchema.index({ 'store.location.city': 1 });
ProductSchema.index({ expiryDate: 1 });
ProductSchema.index({ createdAt: -1 });

export default mongoose.model('Product', ProductSchema);
