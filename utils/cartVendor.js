export const CART_SINGLE_VENDOR_MESSAGE =
  'Your cart may only contain items from one seller or donor at a time. Clear the cart or complete checkout before adding items from another source.';

export function productSellerKey(product) {
  if (!product) return '';
  const s = product.seller;
  if (s && typeof s === 'object' && s._id) return String(s._id);
  if (s) return String(s);
  return '';
}
