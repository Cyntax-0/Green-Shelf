import Product from '../models/Product.js';

/**
 * Updates all product prices based on their expiry dates
 * This function should be called periodically (e.g., daily) to ensure prices are current
 */
export const updateAllProductPrices = async () => {
  try {
    console.log('Starting automatic price update based on expiry dates...');
    
    // Get all active products that are for sale (not donations)
    const products = await Product.find({ 
      status: 'active',
      type: 'sell'
    });

    let updatedCount = 0;
    const results = [];
    
    for (const product of products) {
      const oldPrice = product.price;
      const pricing = await product.updatePriceBasedOnExpiry();
      
      if (oldPrice !== pricing.finalPrice) {
        updatedCount++;
        results.push({
          productId: product._id,
          productName: product.name,
          oldPrice,
          newPrice: pricing.finalPrice,
          discount: pricing.discount,
          daysToExpiry: pricing.daysToExpiry
        });
        
        console.log(`Updated ${product.name}: $${oldPrice} → $${pricing.finalPrice} (${pricing.discount}% off, ${pricing.daysToExpiry} days left)`);
      }
    }

    console.log(`Price update completed. Updated ${updatedCount} out of ${products.length} products.`);
    
    return {
      success: true,
      totalProducts: products.length,
      updatedCount,
      results
    };
  } catch (error) {
    console.error('Error updating product prices:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Updates prices for products expiring within a specific number of days
 */
export const updatePricesForExpiringProducts = async (daysThreshold = 5) => {
  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysThreshold);
    
    const products = await Product.find({
      status: 'active',
      type: 'sell',
      expiry: { $lte: targetDate.toISOString().split('T')[0] }
    });

    let updatedCount = 0;
    const results = [];
    
    for (const product of products) {
      const oldPrice = product.price;
      const pricing = await product.updatePriceBasedOnExpiry();
      
      if (oldPrice !== pricing.finalPrice) {
        updatedCount++;
        results.push({
          productId: product._id,
          productName: product.name,
          oldPrice,
          newPrice: pricing.finalPrice,
          discount: pricing.discount,
          daysToExpiry: pricing.daysToExpiry
        });
      }
    }

    return {
      success: true,
      totalProducts: products.length,
      updatedCount,
      results
    };
  } catch (error) {
    console.error('Error updating prices for expiring products:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Gets pricing information for a specific product
 */
export const getProductPricing = async (productId) => {
  try {
    const product = await Product.findById(productId);
    
    if (!product) {
      return {
        success: false,
        error: 'Product not found'
      };
    }

    const pricing = product.calculateDynamicPrice();
    
    return {
      success: true,
      data: {
        product: {
          id: product._id,
          name: product.name,
          originalPrice: product.originalPrice,
          initialAmount: product.initialAmount,
          currentPrice: product.price,
          type: product.type,
          expiry: product.expiry
        },
        pricing
      }
    };
  } catch (error) {
    console.error('Error getting product pricing:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
