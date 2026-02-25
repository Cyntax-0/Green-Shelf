/**
 * Utility functions for location-based operations
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return Infinity; // Return infinite distance if coordinates are missing
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number} radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a product is within serviceable radius of a user's location
 * @param {Object} productLocation - Product location object with latitude and longitude
 * @param {Object} userLocation - User location object with latitude and longitude
 * @param {number} radius - Serviceability radius in kilometers (default: 50km)
 * @returns {boolean} True if product is within serviceable radius
 */
export function isWithinServiceableRadius(productLocation, userLocation, radius = 50) {
  if (!productLocation?.latitude || !productLocation?.longitude) {
    return false; // Product has no location, not serviceable
  }

  if (!userLocation?.latitude || !userLocation?.longitude) {
    return true; // User has no location, show all products (fallback)
  }

  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    productLocation.latitude,
    productLocation.longitude
  );

  return distance <= radius;
}

/**
 * Get user's location from browser geolocation API
 * @returns {Promise<Object>} Location object with latitude, longitude, and address
 */
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Optional: Reverse geocoding to get address
          const address = await reverseGeocode(latitude, longitude);
          resolve({
            latitude,
            longitude,
            ...address
          });
        } catch (error) {
          // If reverse geocoding fails, still return coordinates
          resolve({
            latitude,
            longitude
          });
        }
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

/**
 * Reverse geocode coordinates to get address
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Object>} Address object
 */
async function reverseGeocode(latitude, longitude) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'GreenShelf/1.0' // Required by Nominatim
        }
      }
    );

    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }

    const data = await response.json();
    const address = data.address || {};

    return {
      address: data.display_name || '',
      city: address.city || address.town || address.village || '',
      state: address.state || address.region || '',
      country: address.country || '',
      zipCode: address.postcode || ''
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return {
      address: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    };
  }
}

/**
 * Filter products by location-based serviceability
 * @param {Array} products - Array of product objects
 * @param {Object} userLocation - User location object
 * @param {number} maxRadius - Maximum serviceability radius in kilometers
 * @returns {Array} Filtered products within serviceable radius
 */
export function filterProductsByLocation(products, userLocation, maxRadius = 50) {
  if (!userLocation?.latitude || !userLocation?.longitude) {
    return products; // If user has no location, return all products
  }

  return products.filter((product) => {
    if (!product.serviceability?.enabled) {
      return true; // Show products with location-based serviceability disabled
    }

    const productRadius = product.serviceability?.radius || maxRadius;
    return isWithinServiceableRadius(product.location, userLocation, productRadius);
  });
}

/**
 * Sort products by distance from user location
 * @param {Array} products - Array of product objects
 * @param {Object} userLocation - User location object
 * @returns {Array} Sorted products by distance (nearest first)
 */
export function sortProductsByDistance(products, userLocation) {
  if (!userLocation?.latitude || !userLocation?.longitude) {
    return products; // If user has no location, return unsorted
  }

  return products
    .map((product) => {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        product.location?.latitude || 0,
        product.location?.longitude || 0
      );
      return { ...product, distance };
    })
    .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
}
