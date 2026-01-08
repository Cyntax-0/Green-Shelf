import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './services/api';
import './styles/Profile.css';

const AdminPage = () => {
    const navigate = useNavigate();
    const [loggedIn, setLoggedIn] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [ngos, setNgos] = useState([]);
    const [activeTab, setActiveTab] = useState('pending');
    const [token, setToken] = useState('');
    const [banner, setBanner] = useState(null);

    useEffect(() => {
        const savedToken = localStorage.getItem('adminToken');
        if (savedToken) {
            setToken(savedToken);
            setLoggedIn(true);
            fetchPendingNGOs(savedToken);
        }
    }, []);

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

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const data = await api.request('/admin/login', {
                method: 'POST',
                body: { email, password }
            });
            if (data.success) {
                setToken(data.data.token);
                localStorage.setItem('adminToken', data.data.token);
                setLoggedIn(true);
                fetchPendingNGOs(data.data.token);
                setBanner({ type: 'success', text: 'Login successful!' });
                setTimeout(() => setBanner(null), 2000);
            } else {
                setBanner({ type: 'error', text: data.message || 'Invalid credentials' });
                setTimeout(() => setBanner(null), 3000);
            }
        } catch (error) {
            setBanner({ type: 'error', text: 'Login failed. Please try again.' });
            setTimeout(() => setBanner(null), 3000);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        setToken('');
        setLoggedIn(false);
        setNgos([]);
    };

    const handleApprove = async (ngoId) => {
        try {
            const data = await api.request(`/admin/ngos/${ngoId}/approve`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success) {
                setBanner({ type: 'success', text: 'NGO approved successfully!' });
                if (activeTab === 'pending') {
                    fetchPendingNGOs(token);
                } else {
                    fetchVerifiedNGOs(token);
                }
            } else {
                setBanner({ type: 'error', text: 'Failed to approve NGO' });
            }
        } catch (error) {
            setBanner({ type: 'error', text: 'Error approving NGO' });
        }
        setTimeout(() => setBanner(null), 3000);
    };

    const handleReject = async (ngoId, reason = '') => {
        try {
            const data = await api.request(`/admin/ngos/${ngoId}/reject`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: { reason }
            });
            if (data.success) {
                setBanner({ type: 'info', text: 'NGO rejected' });
                if (activeTab === 'pending') {
                    fetchPendingNGOs(token);
                } else {
                    fetchVerifiedNGOs(token);
                }
            } else {
                setBanner({ type: 'error', text: 'Failed to reject NGO' });
            }
        } catch (error) {
            setBanner({ type: 'error', text: 'Error rejecting NGO' });
        }
        setTimeout(() => setBanner(null), 3000);
    };

    if (!loggedIn) {
        return (
            <div className="profile-page">
                <header className="profile-header">
                    <div className="logo" onClick={() => navigate('/')}>GreenShelf</div>
                </header>
                <main className="profile-main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
                        {banner && <div className={`banner ${banner.type}`}>{banner.text}</div>}
                        <h2>Admin Login</h2>
                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="info-field">
                                <label>Email:</label>
                                <input 
                                    type="email" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    placeholder="admin@mail.com"
                                    required
                                />
                            </div>
                            <div className="info-field">
                                <label>Password:</label>
                                <input 
                                    type="password" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    placeholder="123456"
                                    required
                                />
                            </div>
                            <button className="primary" type="submit">Login</button>
                        </form>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="profile-page">
            <header className="profile-header">
                <div className="logo" onClick={() => navigate('/')}>GreenShelf</div>
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
                    <div className="empty-state">
                        <p>No pending NGO verifications.</p>
                    </div>
                ) : (
                    <div className="products-grid">
                        {ngos.map(ngo => (
                            <div key={ngo._id} className="product-card border">
                                <div className="product-header">
                                    <h4>{ngo.username || ngo.email} {ngo.profile?.verified ? <span style={{ color: '#4caf50', fontSize: 14 }}>✓ Verified</span> : null}</h4>
                                </div>
                                <div className="product-details">
                                    <p><strong>Email:</strong> {ngo.email}</p>
                                    <p><strong>Name:</strong> {ngo.profile?.firstName || 'N/A'} {ngo.profile?.lastName || ''}</p>
                                    <p><strong>Phone:</strong> {ngo.profile?.phone || 'N/A'}</p>
                                    <p><strong>Address:</strong> {ngo.profile?.address ? `${ngo.profile.address.street || ''}, ${ngo.profile.address.city || ''}` : 'N/A'}</p>
                                    <p><strong>Registered:</strong> {new Date(ngo.createdAt).toLocaleDateString()}</p>
                                    <p><strong>Status:</strong> {ngo.profile?.verified ? '✓ Verified' : '⏳ Pending'}</p>
                                </div>
                                {activeTab === 'pending' ? (
                                    <div className="product-actions">
                                        <button className="primary" onClick={() => handleApprove(ngo._id)}>
                                            Approve
                                        </button>
                                        <button className="danger" onClick={() => handleReject(ngo._id, 'Rejected by admin')}>
                                            Reject
                                        </button>
                                    </div>
                                ) : (
                                    <div className="product-actions">
                                        <p style={{ color: '#4caf50', margin: 0 }}>Verified</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminPage;

