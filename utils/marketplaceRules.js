export function normalizeRole(role) {
  const normalized = String(role ?? '').trim().toLowerCase();
  if (normalized === 'user') return 'customer';
  return normalized;
}

/**
 * Customer, seller, and NGO may use cart and checkout; admin may not.
 * Missing role (legacy DB) is treated as customer for marketplace access.
 */
export function canRoleShop(role) {
  const r = normalizeRole(role);
  if (r === 'admin') return false;
  if (!r) return true;
  return r === 'customer' || r === 'seller' || r === 'ngo';
}

/**
 * @param {string} role
 * @param {string} productType 'sell' | 'donate'
 * @param {{ verified?: boolean }} profile Required for NGO + donation items (must be verified)
 */
export function canRoleAddToCart(role, productType, profile = {}) {
  const r = normalizeRole(role);
  const t = String(productType || 'sell').toLowerCase();
  if (!canRoleShop(r)) return false;
  if (t === 'donate') {
    if (r !== 'ngo') return false;
    return Boolean(profile.verified);
  }
  return true;
}

/**
 * @param {string} role
 * @param {Array<{ product?: { type?: string } }>} cartItems populated items
 * @param {{ verified?: boolean }} profile user.profile for NGO checks
 */
export function validateOrderCartForRole(role, cartItems, profile = {}) {
  const raw = normalizeRole(role);
  if (raw === 'admin') {
    return { ok: false, message: 'Admin accounts cannot place orders' };
  }
  const r = raw || 'customer';
  if (!(r === 'customer' || r === 'seller' || r === 'ngo')) {
    return { ok: false, message: 'This account cannot place orders' };
  }

  const hasDonate = cartItems.some(
    (i) => String(i.product?.type || '').toLowerCase() === 'donate'
  );

  if (r === 'customer' || r === 'seller') {
    if (hasDonate) {
      return { ok: false, message: 'Only NGO accounts can order donation items' };
    }
    const invalid = cartItems.some(
      (i) => String(i.product?.type || 'sell').toLowerCase() !== 'sell'
    );
    if (invalid) {
      return { ok: false, message: 'You can only order priced (for-sale) items' };
    }
  }

  if (r === 'ngo' && hasDonate && !profile.verified) {
    return {
      ok: false,
      message: 'Only verified NGOs can place orders for donation items'
    };
  }

  return { ok: true };
}
