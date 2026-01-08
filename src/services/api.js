const RAW_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const API_BASE_URL = RAW_BASE_URL.endsWith('/api') ? RAW_BASE_URL : `${RAW_BASE_URL}/api`;

export const api = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  },

  auth: {
    async register(username, email, password, role = 'customer') {
      return api.request('/auth/register', {
        method: 'POST',
        body: { username, email, password, role },
      });
    },

    async login(email, password) {
      return api.request('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
    },

    async getProfile(token) {
      return api.request('/auth/profile', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
    },

    async updateProfile(token, updates) {
      return api.request('/auth/profile', {
        method: 'PUT',
        body: updates,
        headers: { Authorization: `Bearer ${token}` },
      });
    },
  },

  products: {
    async getAll(filters = {}) {
      const params = new URLSearchParams(filters);
      return api.request(`/products?${params}`);
    },

    async getById(id) {
      return api.request(`/products/${id}`);
    },

    async create(productData, token) {
      return api.request('/products', {
        method: 'POST',
        body: productData,
        headers: { Authorization: `Bearer ${token}` },
      });
    },

    async update(id, productData, token) {
      return api.request(`/products/${id}`, {
        method: 'PUT',
        body: productData,
        headers: { Authorization: `Bearer ${token}` },
      });
    },

    async delete(id, token) {
      return api.request(`/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    },

    async getBySeller(sellerId) {
      return api.request(`/products/seller/${sellerId}`);
    },

    async updatePrices(daysThreshold = null) {
      const params = daysThreshold ? `?daysThreshold=${daysThreshold}` : '';
      return api.request(`/products/update-prices${params}`, {
        method: 'PUT',
      });
    },

    async getPricing(id) {
      return api.request(`/products/${id}/pricing`);
    },
  },

  cart: {
    async get(token) {
      return api.request('/cart', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    async add(token, productId, quantity = 1) {
      return api.request('/cart/add', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { productId, quantity },
      });
    },
    async update(token, productId, quantity) {
      return api.request('/cart/update', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: { productId, quantity },
      });
    },
    async remove(token, productId) {
      return api.request('/cart/remove', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        body: { productId },
      });
    },
    async clear(token) {
      return api.request('/cart/clear', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    },
  },
};

export default api;

