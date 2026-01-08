// Sample, non-persistent data for local/demo rendering only

export const sampleProducts = [
  {
    id: 's-apple-1',
    name: 'Fresh Apples (Royal Gala)',
    image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?q=80&w=1200&auto=format&fit=crop',
    type: 'sell',
    foodType: 'veg',
    category: 'Fruits',
    quantity: 12,
    quantityUnit: 'units',
    originalPrice: 6.99,
    price: 5.59,
    discountType: 'percent',
    currentDiscount: 20,
    expiry: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'Active',
    store: 'Green Farm Market'
  },
  {
    id: 's-banana-1',
    name: 'Bananas (Ripe)',
    image: 'https://images.unsplash.com/photo-1571772805064-207c8435df79?q=80&w=1200&auto=format&fit=crop',
    type: 'sell',
    foodType: 'veg',
    category: 'Fruits',
    quantity: 6,
    quantityUnit: 'units',
    originalPrice: 3.49,
    price: 2.79,
    discountType: 'percent',
    currentDiscount: 20,
    expiry: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'Active',
    store: 'City Grocer'
  },
  {
    id: 's-milk-1',
    name: 'Whole Milk 1L',
    image: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?q=80&w=1200&auto=format&fit=crop',
    type: 'sell',
    foodType: 'veg',
    category: 'Dairy',
    quantity: 1,
    quantityUnit: 'litre',
    originalPrice: 1.99,
    price: 1.49,
    discountType: 'percent',
    currentDiscount: 25,
    expiry: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'Active',
    store: 'Daily Dairy Depot'
  },
  {
    id: 'd-bread-1',
    name: 'Whole Wheat Bread',
    image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?q=80&w=1200&auto=format&fit=crop',
    type: 'donate',
    foodType: 'veg',
    category: 'Grains',
    quantity: 2,
    quantityUnit: 'units',
    originalPrice: 0,
    price: 0,
    expiry: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'Active',
    store: 'Community Bakery'
  }
];

export const sampleSellerProducts = [
  {
    id: 'sel-veg-1',
    name: 'Tomatoes (Box)',
    image: 'https://images.unsplash.com/photo-1546470427-0fddeb30e4b9?q=80&w=1200&auto=format&fit=crop',
    type: 'sell',
    foodType: 'veg',
    category: 'Vegetables',
    quantity: 5,
    quantityUnit: 'kg',
    originalPrice: 12.0,
    price: 9.6,
    discountType: 'percent',
    currentDiscount: 20,
    expiry: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'Active'
  },
  {
    id: 'sel-don-1',
    name: 'Surplus Sandwiches',
    image: 'https://images.unsplash.com/photo-1550317138-10000687a72b?q=80&w=1200&auto=format&fit=crop',
    type: 'donate',
    foodType: 'veg',
    category: 'Grains',
    quantity: 10,
    quantityUnit: 'units',
    originalPrice: 0,
    price: 0,
    expiry: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'Active'
  }
];

export const sampleCustomerDonations = [
  {
    id: 'cust-don-1',
    name: 'Rice Packets',
    image: 'https://images.unsplash.com/photo-1615485737652-6e5d4b9f0f38?q=80&w=1200&auto=format&fit=crop',
    foodType: 'veg',
    category: 'Grains',
    quantity: 3,
    quantityUnit: 'kg',
    expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    date: new Date().toISOString().slice(0, 10)
  }
];

export const sampleWishlist = [
  { id: 'wish-1', name: 'Strawberries (Box)', price: 4.99 },
  { id: 'wish-2', name: 'Greek Yogurt', price: 2.49 }
];

export const sampleNGOReceivedDonations = [
  { id: 'ngo-rec-1', name: 'Baked Breads', seller: 'Community Bakery', quantity: 15, quantityUnit: 'units' },
  { id: 'ngo-rec-2', name: 'Fresh Bananas', seller: 'City Grocer', quantity: 20, quantityUnit: 'units' }
];

export const sampleMessages = [
  { id: 'msg-1', message: 'Welcome to GreenShelf!', read: false },
  { id: 'msg-2', message: 'Your profile is 80% complete.', read: false }
];

export const sampleCustomerProducts = [
  {
    id: 'cust-sell-1',
    name: 'Leftover Cupcakes (Pack of 6)',
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1200&auto=format&fit=crop',
    type: 'sell',
    foodType: 'veg',
    category: 'Grains',
    quantity: 6,
    quantityUnit: 'units',
    originalPrice: 7.5,
    price: 5.25,
    discountType: 'percent',
    currentDiscount: 30,
    expiry: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'Active'
  },
  {
    id: 'cust-sell-2',
    name: 'Homemade Soup (1L)',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=1200&auto=format&fit=crop',
    type: 'sell',
    foodType: 'veg',
    category: 'Vegetables',
    quantity: 1,
    quantityUnit: 'litre',
    originalPrice: 4.0,
    price: 3.2,
    discountType: 'percent',
    currentDiscount: 20,
    expiry: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'Active'
  }
];


