import mongoose from 'mongoose';

const CartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

const CartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [CartItemSchema],
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
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
CartSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for total items count
CartSchema.virtual('totalItems').get(function() {
    return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for total price (requires population)
CartSchema.virtual('totalPrice').get(function() {
    if (!this.items || this.items.length === 0) return 0;
    
    return this.items.reduce((total, item) => {
        const itemPrice = item.product?.price || 0;
        return total + (itemPrice * item.quantity);
    }, 0);
});

// Method to add item to cart
CartSchema.methods.addItem = function(productId, quantity = 1) {
    const existingItem = this.items.find(item => 
        item.product.toString() === productId.toString()
    );
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        this.items.push({
            product: productId,
            quantity: quantity
        });
    }
    
    return this.save();
};

// Method to remove item from cart
CartSchema.methods.removeItem = function(productId) {
    this.items = this.items.filter(item => 
        item.product.toString() !== productId.toString()
    );
    return this.save();
};

// Method to update item quantity
CartSchema.methods.updateItemQuantity = function(productId, quantity) {
    const item = this.items.find(item => 
        item.product.toString() === productId.toString()
    );
    
    if (item) {
        if (quantity <= 0) {
            return this.removeItem(productId);
        } else {
            item.quantity = quantity;
        }
    }
    
    return this.save();
};

// Method to clear cart
CartSchema.methods.clear = function() {
    this.items = [];
    this.store = null;
    return this.save();
};

// Index for better query performance
CartSchema.index({ user: 1 });
CartSchema.index({ store: 1 });

export default mongoose.model('Cart', CartSchema);
