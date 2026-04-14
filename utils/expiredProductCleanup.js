import Product from '../models/Product.js';
import Cart from '../models/Cart.js';

const getExpiredProductsForCleanup = async () => {
  const products = await Product.find({
    status: { $nin: ['Sold'] },
    expiry: { $exists: true, $nin: [null, ''] }
  }).select('_id name expiry status');

  return products.filter((product) => {
    const expiryDate = new Date(`${product.expiry}T23:59:59.999Z`);
    if (Number.isNaN(expiryDate.getTime())) return false;
    return expiryDate <= new Date();
  });
};

const cleanupCartsForProducts = async (productIds) => {
  if (!productIds.length) return 0;
  const result = await Cart.updateMany(
    { 'items.product': { $in: productIds } },
    { $pull: { items: { product: { $in: productIds } } } }
  );
  return result.modifiedCount || 0;
};

export const cleanupExpiredProducts = async () => {
  try {
    const expiredProducts = await getExpiredProductsForCleanup();

    if (!expiredProducts.length) {
      return {
        success: true,
        deletedProducts: 0,
        affectedCarts: 0
      };
    }

    const productIds = expiredProducts.map((product) => product._id);
    const affectedCarts = await cleanupCartsForProducts(productIds);
    const deleteResult = await Product.deleteMany({ _id: { $in: productIds } });

    return {
      success: true,
      deletedProducts: deleteResult.deletedCount || 0,
      affectedCarts
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
