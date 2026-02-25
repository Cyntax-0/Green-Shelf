import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { api } from './services/api';
import './styles/Profile.css';

const AdminPage = () => {
    const navigate = useNavigate();
    const { user: authUser, token: authToken, logout: authLogout } = useAuth();
    const [loggedIn, setLoggedIn] = useState(false);
    const [ngos, setNgos] = useState([]);
    const [activeTab, setActiveTab] = useState('pending');
    const [token, setToken] = useState('');
    const [banner, setBanner] = useState(null);
    const [rejectModal, setRejectModal] = useState({ open: false, ngoId: null, reason: '' });
    const [selectedNgo, setSelectedNgo] = useState(null);

    useEffect(() => {
        const adminToken = localStorage.getItem('adminToken');
        const mainToken = authToken || localStorage.getItem('authToken');
        const isAdminFromAuth = authUser?.role?.toLowerCase() === 'admin';

        if (adminToken) {
            setToken(adminToken);
            setLoggedIn(true);
            fetchPendingNGOs(adminToken);
        } else if (mainToken && isAdminFromAuth) {
            setToken(mainToken);
            setLoggedIn(true);
            localStorage.setItem('adminToken', mainToken);
            fetchPendingNGOs(mainToken);
        } else {
            // No admin token and not admin user - redirect to home
            navigate('/home');
        }
    }, [authUser, authToken, navigate]);

    const fetchPendingNGOs = async (adminToken) => {
        try {
            const data = await api.request('/admin/ngos/pending', {
                method: 'GET',
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            if (data.success) {
                setNgos(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching pending NGOs:', error);
        }
    };

    const fetchVerifiedNGOs = async (adminToken) => {
        try {
            const data = await api.request('/admin/ngos/verified', {
                method: 'GET',
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            if (data.success) {
                setNgos(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching verified NGOs:', error);
        }
    };

    useEffect(() => {
        if (!token) return;
        if (activeTab === 'pending') {
            fetchPendingNGOs(token);
        } else if (activeTab === 'verified') {
            fetchVerifiedNGOs(token);
        }
    }, [activeTab, token]);

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('authToken');
        setToken('');
        setLoggedIn(false);
        setNgos([]);
        authLogout();
        navigate('/home');
    };

    const handleApprove = async (ngoId) => {
        try {
            const data = await api.request(`/admin/ngos/${ngoId}/approve`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success) {
                setBanner({ type: 'success', text: 'NGO approved successfully!' });
                setTimeout(() => setBanner(null), 2000);
                if (activeTab === 'pending') {
                    fetchPendingNGOs(token);
                } else {
                    fetchVerifiedNGOs(token);
                }
            }
        } catch (error) {
            setBanner({ type: 'error', text: error.message || 'Failed to approve' });
            setTimeout(() => setBanner(null), 3000);
        }
    };

    const openRejectModal = (ngoId) => {
        setRejectModal({ open: true, ngoId, reason: '' });
    };

    const closeRejectModal = () => {
        setRejectModal({ open: false, ngoId: null, reason: '' });
    };

    const handleReject = async () => {
        if (!rejectModal.reason.trim()) {
            setBanner({ type: 'error', text: 'Please provide a rejection reason' });
            setTimeout(() => setBanner(null), 3000);
            return;
        }

        try {
            const data = await api.request(`/admin/ngos/${rejectModal.ngoId}/reject`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: { reason: rejectModal.reason }
            });
            if (data.success) {
                setBanner({ type: 'success', text: 'NGO rejected successfully.' });
                setTimeout(() => setBanner(null), 2000);
                closeRejectModal();
                if (activeTab === 'pending') {
                    fetchPendingNGOs(token);
                }
            }
        } catch (error) {
            setBanner({ type: 'error', text: error.message || 'Failed to reject' });
            setTimeout(() => setBanner(null), 3000);
        }
    };

    const formatAddress = (address) => {
        if (!address) return 'N/A';
        if (typeof address === 'string') return address;
        const parts = [];
        if (address.street) parts.push(address.street);
        if (address.city) parts.push(address.city);
        if (address.state) parts.push(address.state);
        if (address.zipCode) parts.push(address.zipCode);
        if (address.country) parts.push(address.country);
        return parts.length > 0 ? parts.join(', ') : 'N/A';
    };

    if (!loggedIn) {
        return null; // Will redirect via useEffect
    }

    return (
        <div className="profile-page">
            <header className="profile-header">
                <div className="logo" onClick={() => navigate('/home')}>GreenShelf</div>
                <nav className="profile-tabs">
                    <button className={activeTab === 'pending' ? 'active' : ''} onClick={() => setActiveTab('pending')}>Pending NGOs</button>
                    <button className={activeTab === 'verified' ? 'active' : ''} onClick={() => setActiveTab('verified')}>Verified NGOs</button>
                </nav>
                <div className="profile-actions">
                    <span className="greeting">Admin Panel</span>
                    <button className="logout-btn" onClick={handleLogout}>Logout</button>
                </div>
            </header>

            <main className="profile-main">
                {banner && <div className={`banner ${banner.type}`}>{banner.text}</div>}
                <h2>{activeTab === 'pending' ? 'Pending NGO Verifications' : 'Verified NGOs'}</h2>
                {ngos.length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.6)' }}>No {activeTab} NGOs.</p>
                ) : (
                    <div className="orders-list" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                        {ngos.map((ngo) => (
                            <div key={ngo._id} className="card">
                                <h3>{ngo.profile?.organizationName || ngo.username || ngo.email}</h3>
                                <div className="product-details">
                                    <p><strong>Email:</strong> {ngo.email}</p>
                                    <p><strong>Username:</strong> {ngo.username || 'N/A'}</p>
                                    {ngo.profile && (
                                        <>
                                            {ngo.profile.organizationName && <p><strong>Organization Name:</strong> {ngo.profile.organizationName}</p>}
                                            {(ngo.profile.firstName || ngo.profile.lastName) && (
                                                <p><strong>Contact Person:</strong> {[ngo.profile.firstName, ngo.profile.lastName].filter(Boolean).join(' ') || 'N/A'}</p>
                                            )}
                                            {ngo.profile.phone && <p><strong>Phone:</strong> {ngo.profile.phone}</p>}
                                            {ngo.profile.registration && <p><strong>Registration Number:</strong> {ngo.profile.registration}</p>}
                                            {ngo.profile.address && <p><strong>Address:</strong> {formatAddress(ngo.profile.address)}</p>}
                                            {ngo.profile.bio && <p><strong>Bio:</strong> {ngo.profile.bio}</p>}
                                            {ngo.profile.verifiedAt && <p><strong>Verified:</strong> {new Date(ngo.profile.verifiedAt).toLocaleDateString()}</p>}
                                            {ngo.profile.rejectionReason && <p style={{ color: '#ef4444' }}><strong>Rejection Reason:</strong> {ngo.profile.rejectionReason}</p>}
                                        </>
                                    )}
                                    <p><strong>Joined:</strong> {new Date(ngo.createdAt).toLocaleDateString()}</p>
                                </div>
                                {activeTab === 'pending' && (
                                    <div className="product-actions" style={{ marginTop: '0.75rem' }}>
                                        <button className="primary" onClick={() => handleApprove(ngo._id)}>Approve</button>
                                        <button className="danger" onClick={() => openRejectModal(ngo._id)}>Reject</button>
                                    </div>
                                )}
                                {activeTab === 'verified' && ngo.profile?.adminHistory && ngo.profile.adminHistory.length > 0 && (
                                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}><strong>History:</strong></p>
                                        {ngo.profile.adminHistory.slice(-3).reverse().map((history, idx) => (
                                            <p key={idx} style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: '0.25rem 0' }}>
                                                {history.action === 'approved' ? '✓' : '✗'} {history.action} by {history.adminEmail} on {new Date(history.timestamp).toLocaleDateString()}
                                                {history.reason && <span style={{ display: 'block', marginLeft: '1rem' }}>Reason: {history.reason}</span>}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Rejection Reason Modal */}
            {rejectModal.open && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(10px)'
                }}>
                    <div className="card" style={{ maxWidth: '500px', width: '90%', padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Reject NGO Verification</h3>
                        <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                            Please provide a reason for rejecting this NGO verification request.
                        </p>
                        <div className="info-field">
                            <label>Rejection Reason:</label>
                            <textarea
                                value={rejectModal.reason}
                                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                                placeholder="Enter the reason for rejection..."
                                rows={4}
                                style={{ minHeight: '100px' }}
                            />
                        </div>
                        <div className="product-actions" style={{ marginTop: '1rem' }}>
                            <button className="secondary" onClick={closeRejectModal}>Cancel</button>
                            <button className="danger" onClick={handleReject}>Reject</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPage;
