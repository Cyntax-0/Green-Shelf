import React, { useState, useEffect } from 'react';
import './GreenShelfHomepage.css';

const GreenShelfHomepage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cartItems, setCartItems] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Sample food items data with real image URLs
  const foodItems = [
    {
      id: 1,
      name: "Fresh Organic Bananas",
      originalPrice: 25,
      discountedPrice: 12,
      expiryDate: "2025-09-13",
      category: "Fruits",
      image: "https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=300&h=200&fit=crop&crop=center",
      location: "Mumbai Central",
      seller: "Fresh Mart",
      type: "Sale",
      description: "Ripe organic bananas, perfect for smoothies",
      discount: 52
    },
    {
      id: 2,
      name: "Whole Wheat Bread",
      originalPrice: 40,
      discountedPrice: 0,
      expiryDate: "2025-09-12",
      category: "Bakery",
      image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=200&fit=crop&crop=center",
      location: "Bandra West",
      seller: "Daily Bread Co.",
      type: "Donation",
      description: "Fresh whole wheat bread loaves",
      discount: 0
    },
    {
      id: 3,
      name: "Fresh Milk (1L)",
      originalPrice: 60,
      discountedPrice: 30,
      expiryDate: "2025-09-14",
      category: "Dairy",
      image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&h=200&fit=crop&crop=center",
      location: "Andheri East",
      seller: "Dairy Fresh",
      type: "Sale",
      description: "Farm fresh whole milk",
      discount: 50
    },
    {
      id: 4,
      name: "Mixed Vegetables Pack",
      originalPrice: 120,
      discountedPrice: 0,
      expiryDate: "2025-09-13",
      category: "Vegetables",
      image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&h=200&fit=crop&crop=center",
      location: "Thane",
      seller: "Green Grocer",
      type: "Donation",
      description: "Fresh mixed vegetables - carrots, beans, peas",
      discount: 0
    },
    {
      id: 5,
      name: "Chocolate Cake",
      originalPrice: 450,
      discountedPrice: 200,
      expiryDate: "2025-09-12",
      category: "Bakery",
      image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&h=200&fit=crop&crop=center",
      location: "Powai",
      seller: "Sweet Delights",
      type: "Sale",
      description: "Rich chocolate layer cake",
      discount: 56
    },
    {
      id: 6,
      name: "Greek Yogurt",
      originalPrice: 80,
      discountedPrice: 40,
      expiryDate: "2025-09-15",
      category: "Dairy",
      image: "https://images.unsplash.com/photo-1571212515416-fac8c80879a7?w=300&h=200&fit=crop&crop=center",
      location: "Colaba",
      seller: "Healthy Choice",
      type: "Sale",
      description: "Creamy Greek yogurt, high protein",
      discount: 50
    },
    {
      id: 7,
      name: "Fresh Apples (1kg)",
      originalPrice: 180,
      discountedPrice: 90,
      expiryDate: "2025-09-16",
      category: "Fruits",
      image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&h=200&fit=crop&crop=center",
      location: "Juhu",
      seller: "Fruit Paradise",
      type: "Sale",
      description: "Crisp red apples from Kashmir",
      discount: 50
    },
    {
      id: 8,
      name: "Sandwich Pack",
      originalPrice: 150,
      discountedPrice: 0,
      expiryDate: "2025-09-12",
      category: "Ready-to-eat",
      image: "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=300&h=200&fit=crop&crop=center",
      location: "Lower Parel",
      seller: "Quick Bites",
      type: "Donation",
      description: "Vegetarian sandwich variety pack",
      discount: 0
    }
  ];

  const categories = ["All", "Fruits", "Vegetables", "Dairy", "Bakery", "Ready-to-eat"];

  const heroSlides = [
    {
      title: "Save Food, Save Money, Save Planet",
      subtitle: "Join the fight against food waste while getting quality ingredients at unbeatable prices",
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=400&fit=crop&crop=center",
      cta: "Shop Now"
    },
    {
      title: "Fresh Food, Zero Waste",
      subtitle: "Discover premium food items available for donation or at heavily discounted rates",
      image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&h=400&fit=crop&crop=center",
      cta: "Browse Items"
    },
    {
      title: "Community Impact",
      subtitle: "Help local businesses reduce waste while feeding families in need",
      image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200&h=400&fit=crop&crop=center",
      cta: "Learn More"
    }
  ];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 1000);

    // Auto-slide hero section
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [heroSlides.length]);

  const filteredItems = foodItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (item) => {
    if (item.type === 'Sale') {
      setCartItems([...cartItems, item.id]);
    }
  };

  const toggleWishlist = (itemId) => {
    if (wishlist.includes(itemId)) {
      setWishlist(wishlist.filter(id => id !== itemId));
    } else {
      setWishlist([...wishlist, itemId]);
    }
  };

  const getDaysUntilExpiry = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <h2>Loading GreenShelf...</h2>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="brand-title">GreenShelf</h1>
          <div className="search-container">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="21 21l-4.35-4.35"></path>
            </svg>
            <input
              className="search-input"
              type="text"
              placeholder="Search for food items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="header-actions">
            <button className="cart-button">
              <svg className="cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 22C9.55228 22 10 21.5523 10 21C10 20.4477 9.55228 20 9 20C8.44772 20 8 20.4477 8 21C8 21.5523 8.44772 22 9 22Z"></path>
                <path d="M20 22C20.5523 22 21 21.5523 21 21C21 20.4477 20.5523 20 20 20C19.4477 20 19 20.4477 19 21C19 21.5523 19.4477 22 20 22Z"></path>
                <path d="M1 1H5L7.68 14.39C7.77144 14.8504 8.02191 15.264 8.38755 15.5583C8.75318 15.8526 9.2107 16.009 9.68 16H19.4C19.8693 16.009 20.3268 15.8526 20.6925 15.5583C21.0581 15.264 21.3086 14.8504 21.4 14.39L23 6H6"></path>
              </svg>
              <span className="cart-count">Cart ({cartItems.length})</span>
            </button>
            <button className="login-button">
              <svg className="user-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Login</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav">
        <div className="nav-content">
          <div className="category-buttons">
            <svg className="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
            </svg>
            {categories.map(category => (
              <button
                key={category}
                className={`category-button ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main">
        {/* Hero Section with Slider */}
        <section className="hero-section">
          <div className="hero-slider">
            {heroSlides.map((slide, index) => (
              <div 
                key={index}
                className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
                style={{backgroundImage: `url(${slide.image})`}}
              >
                <div className="hero-overlay">
                  <div className="hero-content">
                    <h1 className="hero-title">{slide.title}</h1>
                    <p className="hero-subtitle">{slide.subtitle}</p>
                    <button className="cta-button">{slide.cta}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hero-indicators">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
              ></button>
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section className="stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>5000+</h3>
              <p>Food Items Saved</p>
            </div>
            <div className="stat-card">
              <h3>200+</h3>
              <p>Partner Stores</p>
            </div>
            <div className="stat-card">
              <h3>₹2L+</h3>
              <p>Money Saved</p>
            </div>
            <div className="stat-card">
              <h3>1000+</h3>
              <p>Happy Customers</p>
            </div>
          </div>
        </section>

        {/* Items Grid */}
        <section className="items-section">
          <div className="section-header">
            <h2>Available Items</h2>
            <p>Fresh food items at discounted prices or available for donation</p>
          </div>
          
          <div className="items-grid">
            {filteredItems.map(item => {
              const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
              const isInWishlist = wishlist.includes(item.id);
              
              return (
                <div key={item.id} className="item-card">
                  <div className="item-image-container">
                    <img src={item.image} alt={item.name} className="item-image" />
                    <div className={`type-tag ${item.type.toLowerCase()}`}>
                      {item.type}
                    </div>
                    {item.discount > 0 && (
                      <div className="discount-badge">
                        -{item.discount}%
                      </div>
                    )}
                    <button
                      className={`wishlist-button ${isInWishlist ? 'active' : ''}`}
                      onClick={() => toggleWishlist(item.id)}
                    >
                      <svg viewBox="0 0 24 24" fill={isInWishlist ? "currentColor" : "none"} stroke="currentColor">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                    </button>
                  </div>
                  
                  <div className="item-content">
                    <h3 className="item-name">{item.name}</h3>
                    <p className="item-description">{item.description}</p>
                    
                    <div className="price-container">
                      {item.type === 'Sale' ? (
                        <>
                          <span className="discounted-price">₹{item.discountedPrice}</span>
                          <span className="original-price">₹{item.originalPrice}</span>
                        </>
                      ) : (
                        <span className="free-tag">FREE</span>
                      )}
                    </div>

                    <div className="item-meta">
                      <div className="location">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        {item.location}
                      </div>
                      <div className="seller">Seller: {item.seller}</div>
                      <div className={`expiry ${daysUntilExpiry <= 2 ? 'warning' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12,6 12,12 16,14"></polyline>
                        </svg>
                        Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="action-buttons">
                      {item.type === 'Sale' ? (
                        <button
                          className="add-to-cart-button"
                          onClick={() => addToCart(item)}
                        >
                          Add to Cart
                        </button>
                      ) : (
                        <button className="contact-button">
                          Contact for Pickup
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default GreenShelfHomepage;