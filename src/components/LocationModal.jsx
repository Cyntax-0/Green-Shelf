import React, { useState, useEffect } from 'react';
import '../styles/LocationModal.css';
import api from '../services/api';

export const LocationModal = ({ isOpen, onClose, onLocationSet, currentUser }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [method, setMethod] = useState('auto'); // 'auto' or 'manual'
  const [manualLocation, setManualLocation] = useState({
    address: '',
    city: '',
    state: '',
    country: '',
    zipCode: ''
  });
  const [locationData, setLocationData] = useState(null);

  // Check if user is a seller or NGO - they can only set location once
  const isSellerOrNGO = currentUser?.role === 'seller' || currentUser?.role === 'ngo';
  const hasExistingLocation = currentUser?.location?.latitude && currentUser?.location?.longitude;
  const isLocationLocked = isSellerOrNGO && hasExistingLocation;

  useEffect(() => {
    // Pre-fill with existing location if available
    if (currentUser?.location) {
      setManualLocation({
        address: currentUser.location.address || '',
        city: currentUser.location.city || '',
        state: currentUser.location.state || '',
        country: currentUser.location.country || '',
        zipCode: currentUser.location.zipCode || ''
      });
      setLocationData({
        latitude: currentUser.location.latitude,
        longitude: currentUser.location.longitude
      });
    }
  }, [currentUser]);

  const handleGetLocation = async () => {
    setLoading(true);
    setError('');

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // Reverse geocode to get address
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
              {
                headers: {
                  'User-Agent': 'GreenShelf/1.0'
                }
              }
            );

            if (response.ok) {
              const data = await response.json();
              const address = data.address || {};

              const location = {
                latitude,
                longitude,
                address: data.display_name || '',
                city: address.city || address.town || address.village || '',
                state: address.state || address.region || '',
                country: address.country || '',
                zipCode: address.postcode || ''
              };

              setLocationData(location);
              setManualLocation({
                address: location.address,
                city: location.city,
                state: location.state,
                country: location.country,
                zipCode: location.zipCode
              });
            } else {
              // If reverse geocoding fails, still use coordinates
              setLocationData({ latitude, longitude });
            }
          } catch (geocodeError) {
            console.error('Reverse geocoding error:', geocodeError);
            setLocationData({ latitude, longitude });
            setError('Location detected but address lookup failed. You can enter address manually.');
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          setLoading(false);
          switch (err.code) {
            case err.PERMISSION_DENIED:
              setError('Location access denied. Please enable location permissions or enter manually.');
              setMethod('manual');
              break;
            case err.POSITION_UNAVAILABLE:
              setError('Location information unavailable. Please enter manually.');
              setMethod('manual');
              break;
            case err.TIMEOUT:
              setError('Location request timed out. Please try again or enter manually.');
              break;
            default:
              setError('An error occurred while getting your location. Please enter manually.');
              setMethod('manual');
              break;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to get location. Please enter manually.');
      setMethod('manual');
    }
  };

  const handleManualSubmit = async () => {
    if (!manualLocation.address && !manualLocation.city && !manualLocation.state) {
      setError('Please enter at least an address or city');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Forward geocode to get coordinates from address
      const query = [manualLocation.address, manualLocation.city, manualLocation.state, manualLocation.country]
        .filter(Boolean)
        .join(', ');

      if (query) {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'GreenShelf/1.0'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            const result = data[0];
            setLocationData({
              latitude: parseFloat(result.lat),
              longitude: parseFloat(result.lon)
            });
          } else {
            setError('Could not find coordinates for this address. Location will be saved without coordinates.');
          }
        }
      }
    } catch (geocodeError) {
      console.error('Forward geocoding error:', geocodeError);
      setError('Could not get coordinates for this address. Location will be saved without coordinates.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLocation = async () => {
    if (method === 'auto' && !locationData?.latitude) {
      setError('Please get your location first or switch to manual entry');
      return;
    }

    if (method === 'manual' && !manualLocation.address && !manualLocation.city && !manualLocation.state) {
      setError('Please enter at least an address or city');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const locationPayload = {
        ...(locationData || {}),
        ...manualLocation
      };

      const response = await api.updateLocation(token, locationPayload);

      if (response.success) {
        // Refresh the user profile to get updated location
        const profileResponse = await api.auth.getProfile(token);
        if (profileResponse.success && profileResponse.data) {
          if (onLocationSet) {
            onLocationSet(profileResponse.data);
          }
        }
        onClose();
      } else {
        setError(response.message || 'Failed to save location');
      }
    } catch (err) {
      setError(err.message || 'Failed to save location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="location-modal-overlay" onClick={onClose}>
      <div className="location-modal" onClick={(e) => e.stopPropagation()}>
        <div className="location-modal-header">
          <h2>Set Your Location</h2>
          <button className="location-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="location-modal-content">
          {isLocationLocked && (
            <div className="location-error" style={{ background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.15) 0%, rgba(249, 115, 22, 0.1) 100%)', borderLeft: '4px solid #f97316', color: '#fdba74', marginBottom: '16px' }}>
              <strong>Location Locked:</strong> As a {currentUser?.role === 'seller' ? 'shop/seller' : 'NGO'}, your location has been set and cannot be changed. This ensures consistency for your customers and delivery serviceability.
            </div>
          )}
          <p className="location-modal-description">
            {isLocationLocked 
              ? `Your ${currentUser?.role === 'seller' ? 'shop' : 'organization'} location is set to: ${currentUser.location.city || 'N/A'}${currentUser.location.state ? `, ${currentUser.location.state}` : ''}`
              : 'We need your location to show you products available in your area and ensure delivery serviceability.'}
          </p>

          {!isLocationLocked && (
            <div className="location-method-selector">
              <button
                className={`method-button ${method === 'auto' ? 'active' : ''}`}
                onClick={() => setMethod('auto')}
                disabled={loading}
              >
                Use Current Location
              </button>
              <button
                className={`method-button ${method === 'manual' ? 'active' : ''}`}
                onClick={() => setMethod('manual')}
                disabled={loading}
              >
                Enter Manually
              </button>
            </div>
          )}

          {isLocationLocked ? (
            <div className="location-preview">
              <p><strong>Coordinates:</strong> {currentUser.location.latitude?.toFixed(6)}, {currentUser.location.longitude?.toFixed(6)}</p>
              {currentUser.location.address && (
                <p><strong>Address:</strong> {currentUser.location.address}</p>
              )}
              {(currentUser.location.city || currentUser.location.state) && (
                <p><strong>City, State:</strong> {currentUser.location.city}{currentUser.location.city && currentUser.location.state ? ', ' : ''}{currentUser.location.state}</p>
              )}
              {currentUser.location.country && (
                <p><strong>Country:</strong> {currentUser.location.country}</p>
              )}
              {currentUser.location.zipCode && (
                <p><strong>Zip Code:</strong> {currentUser.location.zipCode}</p>
              )}
            </div>
          ) : method === 'auto' ? (
            <div className="auto-location-section">
              <button
                className="get-location-button"
                onClick={handleGetLocation}
                disabled={loading}
              >
                {loading ? 'Getting Location...' : 'Get My Location'}
              </button>

              {locationData && (
                <div className="location-preview">
                  <p><strong>Coordinates:</strong> {locationData.latitude?.toFixed(6)}, {locationData.longitude?.toFixed(6)}</p>
                  {manualLocation.address && (
                    <p><strong>Address:</strong> {manualLocation.address}</p>
                  )}
                  {(manualLocation.city || manualLocation.state) && (
                    <p><strong>City, State:</strong> {manualLocation.city}{manualLocation.city && manualLocation.state ? ', ' : ''}{manualLocation.state}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="manual-location-section">
              <div className="form-group">
                <label htmlFor="address">Address *</label>
                <input
                  type="text"
                  id="address"
                  placeholder="Street address"
                  value={manualLocation.address}
                  onChange={(e) => setManualLocation({ ...manualLocation, address: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">City</label>
                  <input
                    type="text"
                    id="city"
                    placeholder="City"
                    value={manualLocation.city}
                    onChange={(e) => setManualLocation({ ...manualLocation, city: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="state">State/Province</label>
                  <input
                    type="text"
                    id="state"
                    placeholder="State"
                    value={manualLocation.state}
                    onChange={(e) => setManualLocation({ ...manualLocation, state: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="country">Country</label>
                  <input
                    type="text"
                    id="country"
                    placeholder="Country"
                    value={manualLocation.country}
                    onChange={(e) => setManualLocation({ ...manualLocation, country: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="zipCode">Zip Code</label>
                  <input
                    type="text"
                    id="zipCode"
                    placeholder="Zip/Postal Code"
                    value={manualLocation.zipCode}
                    onChange={(e) => setManualLocation({ ...manualLocation, zipCode: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                className="geocode-button"
                onClick={handleManualSubmit}
                disabled={loading}
              >
                {loading ? 'Looking up coordinates...' : 'Get Coordinates from Address'}
              </button>
            </div>
          )}

          {error && (
            <div className="location-error">
              {error}
            </div>
          )}

          <div className="location-modal-actions">
            {!isLocationLocked ? (
              <>
                <button
                  className="save-location-button"
                  onClick={handleSaveLocation}
                  disabled={loading || (method === 'auto' && !locationData) || (method === 'manual' && !manualLocation.address && !manualLocation.city && !manualLocation.state)}
                >
                  {loading ? 'Saving...' : 'Save Location'}
                </button>
                <button
                  className="skip-location-button"
                  onClick={onClose}
                  disabled={loading}
                >
                  Skip for Now
                </button>
              </>
            ) : (
              <button
                className="skip-location-button"
                onClick={onClose}
                style={{ width: '100%' }}
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationModal;
