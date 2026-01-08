import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  image: {
    type: String,
    required: true
  },
  imageFile: {
    type: String
  },
  type: {
    type: String,
    enum: ['sell', 'donate'],
    default: 'sell'
  },
  foodType: {
    type: String,
    enum: ['veg', 'nonveg'],
    default: 'veg'
  },
  category: {
    type: String,
    required: true,
    enum: ['Fruits', 'Vegetables', 'Dairy', 'Grains', 'Meat', 'Fish', 'Eggs']
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  originalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  initialAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  quantityUnit: {
    type: String,
    enum: ['units', 'kg', 'g', 'dozens', 'litre', 'ml'],
    default: 'units'
  },
  discountType: {
    type: String,
    enum: ['percent', 'price'],
    default: 'percent'
  },
  currentDiscount: {
    type: Number,
    default: 0
  },
  expiry: {
    type: String,
    required: true
  },
  store: {
    type: String
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Sold', 'Pending'],
    default: 'Active'
  },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [String],
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      enum: ['cm', 'in', 'm'],
      default: 'cm'
    }
  },
  weight: {
    value: Number,
    unit: {
      type: String,
      enum: ['g', 'kg', 'lb', 'oz'],
      default: 'kg'
    }
  },
  isEcoFriendly: {
    type: Boolean,
    default: false
  },
  ecoFriendlyDetails: {
    materials: [String],
    certifications: [String],
    sustainabilityNotes: String
  },
  location: {
    city: String,
    state: String,
    country: String
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isFeatured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for search functionality
productSchema.index({
  name: 'text',
  description: 'text',
  category: 'text',
  brand: 'text',
  tags: 'text'
});

// Index for filtering
productSchema.index({ category: 1, price: 1, condition: 1 });
productSchema.index({ seller: 1, status: 1 });
productSchema.index({ uploader: 1, createdAt: -1 });
productSchema.index({ createdAt: -1 });

// Method to calculate dynamic pricing based on expiry
productSchema.methods.calculateDynamicPrice = function() {
  if (this.type === 'donate') {
    return {
      finalPrice: 0,
      discount: 100,
      daysToExpiry: Math.ceil((new Date(this.expiry) - new Date()) / (1000 * 60 * 60 * 24))
    };
  }

  const daysToExpiry = Math.ceil((new Date(this.expiry) - new Date()) / (1000 * 60 * 60 * 24));
  let baseDiscountPercent = this.currentDiscount || 0;
  
  // Apply automatic discount based on expiry (within 5 days)
  if (daysToExpiry <= 5) {
    if (daysToExpiry <= 1) {
      baseDiscountPercent = Math.max(baseDiscountPercent, 50);
    } else if (daysToExpiry <= 3) {
      baseDiscountPercent = Math.max(baseDiscountPercent, 30);
    } else if (daysToExpiry <= 5) {
      baseDiscountPercent = Math.max(baseDiscountPercent, 20);
    }
  }

  let finalPrice = this.originalPrice;
  if (this.discountType === 'price') {
    // For price-based discount, use the maximum discount amount
    finalPrice = Math.max(0, this.originalPrice - (this.currentDiscount || 0));
  } else {
    // For percentage-based discount
    finalPrice = this.originalPrice * (1 - (baseDiscountPercent / 100));
  }

  return {
    finalPrice: parseFloat(finalPrice.toFixed(2)),
    discount: baseDiscountPercent,
    daysToExpiry
  };
};

// Method to update price based on expiry
productSchema.methods.updatePriceBasedOnExpiry = async function() {
  const pricing = this.calculateDynamicPrice();
  this.price = pricing.finalPrice;
  await this.save();
  return pricing;
};

const Product = mongoose.model('Product', productSchema);

export default Product;
