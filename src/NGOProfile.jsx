import React, { useState, useEffect } from "react";
import api from "./services/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import "./styles/Profile.css";

const NGOProfile = () => {
    const [activeTab, setActiveTab] = useState("dashboard");
    const { user, logout, checkAuthStatus } = useAuth();

    const [profile, setProfile] = useState({
        name: user?.profile?.organizationName || user?.username || "Food for All NGO",
        email: user?.email || "ngo@foodforall.org",
        phone: user?.profile?.phone || "",
        registration: user?.profile?.registration || "",
        address: user?.profile?.address || "",
        mission: user?.profile?.bio || ""
    });

    const [verificationStatus, setVerificationStatus] = useState({
        verified: false,
        documentUrl: "",
        submittedAt: null
    });

    const [verificationForm, setVerificationForm] = useState({
        registrationNumber: "",
        documentFile: null,
        documentPreview: ""
    });

    const [banner, setBanner] = useState(null);

    const [receivedDonations, setReceivedDonations] = useState([]);

    const [partners, setPartners] = useState([]);
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        const partnerMap = {};
        receivedDonations.forEach(donation => {
            const sellerName = donation.seller;
            if (!partnerMap[sellerName]) partnerMap[sellerName] = { name: sellerName, totalDonations: 0 };
            partnerMap[sellerName].totalDonations += donation.quantity;
        });
        setPartners(Object.values(partnerMap));
    }, [receivedDonations]);

    const navigate = useNavigate();
    const handleNavigateHome = () => navigate("/home");
    const displayName = user?.profile?.firstName || user?.username || (user?.email ? user.email.split('@')[0] : 'NGO');

    const handleVerificationDocument = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result; // data URL
            setVerificationForm({ ...verificationForm, documentFile: file, documentPreview: base64 });
        };
        reader.readAsDataURL(file);
    };

    // Sync profile and verification form from server (e.g. when rejected, for resubmission)
    useEffect(() => {
        if (user?.profile?.rejectionReason && user?.profile) {
            const p = user.profile;
            const addr = p.address;
            const addrStr = typeof addr === 'string' ? addr : (addr ? [addr.street, addr.city, addr.state, addr.zipCode, addr.country].filter(Boolean).join(', ') : '');
            setProfile({
                name: p.organizationName || user?.username || user?.email || '',
                email: user?.email || '',
                phone: p.phone || '',
                registration: p.registration || '',
                address: addrStr || (typeof addr === 'object' ? '' : ''),
                mission: p.bio || ''
            });
            setVerificationForm(f => ({
                ...f,
                registrationNumber: p.registration || '',
                documentPreview: p.verificationDocumentUrl || ''
            }));
        }
    }, [user?.profile?.rejectionReason, user?.profile, user?.email, user?.username]);

    // Sync verification status and notifications from server user
    useEffect(() => {
        if (user?.profile?.verified) {
            setVerificationStatus(v => ({ ...v, verified: true }));
        }
        if (Array.isArray(user?.notifications)) {
            // Merge server notifications into messages list
            const serverMsgs = user.notifications
                .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map(n => ({ id: n.id, message: n.message, read: n.read }));
            // Prefer server messages first
            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const merged = [...serverMsgs, ...prev.filter(m => !existingIds.has(m.id))];
                return merged;
            });
        }
    }, [user]);

    // Auto-refresh verification status periodically while pending
    useEffect(() => {
        if (verificationStatus.verified) return;
        let timerId;
        try {
            timerId = setInterval(async () => {
                try {
                    await checkAuthStatus();
                } catch (_) {}
            }, 10000);
        } catch (_) {}
        return () => {
            if (timerId) clearInterval(timerId);
        };
    }, [verificationStatus.verified, checkAuthStatus]);

    const refreshVerificationNow = async () => {
        try {
            setBanner({ type: 'info', text: 'Checking verification status...' });
            await checkAuthStatus();
        } catch (e) {
            // ignore
        } finally {
            setTimeout(() => setBanner(null), 1500);
        }
    };

    const submitVerification = async () => {
        if (!verificationForm.registrationNumber || !verificationForm.documentFile) {
            setBanner({ type: 'warning', text: 'Please provide registration number and document.' });
            return;
        }
        try {
            setBanner({ type: 'info', text: 'Submitting verification...' });
            const token = localStorage.getItem('authToken');
            // Build minimal schema-aligned profile payload
            const safeAddress = typeof profile.address === 'string' 
                ? { street: profile.address } 
                : (profile.address || {});
            const updates = {
                profile: {
                    phone: profile.phone || '',
                    address: {
                        street: safeAddress.street || '',
                        city: safeAddress.city || '',
                        state: safeAddress.state || '',
                        zipCode: safeAddress.zipCode || '',
                        country: safeAddress.country || ''
                    },
                    // custom verification fields the backend will store on profile
                    registration: verificationForm.registrationNumber,
                    verificationDocumentUrl: verificationForm.documentPreview,
                    verified: false,
                    verificationSubmittedAt: new Date().toISOString()
                }
            };
            if (token) {
                await api.auth.updateProfile(token, updates);
                await checkAuthStatus();
            }
            setVerificationStatus({
                verified: false,
                documentUrl: verificationForm.documentPreview,
                submittedAt: new Date().toISOString()
            });
            setProfile({ ...profile, registration: verificationForm.registrationNumber });
            setBanner({ type: 'info', text: 'Verification request submitted. Pending admin approval.' });
        } catch (e) {
            setBanner({ type: 'error', text: 'Failed to submit verification.' });
        } finally {
            setTimeout(() => setBanner(null), 3000);
            setVerificationForm({ ...verificationForm, registrationNumber: "", documentFile: null, documentPreview: "" });
        }
    };

    return (
        <div className="profile-page">
            <header className="profile-header">
                <div className="logo" onClick={handleNavigateHome}>GreenShelf</div>
                <nav className="profile-tabs">
                    <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
                    <button className={activeTab === "donations" ? "active" : ""} onClick={() => setActiveTab("donations")}>Donations</button>
                    <button className={activeTab === "purchases" ? "active" : ""} onClick={() => setActiveTab("purchases")}>Purchases</button>
                    <button className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>Profile</button>

                    <button className={activeTab === "messages" ? "active" : ""} onClick={() => setActiveTab("messages")}>Messages / Notifications</button>
                    <button className={activeTab === "partners" ? "active" : ""} onClick={() => setActiveTab("partners")}>Partnerships / Seller Network</button>
                </nav>
                <div className="profile-actions">
                    <span className="greeting">Hello, {displayName}</span>
                    <button className="logout-btn" onClick={logout}>Logout</button>
                </div>
            </header>

            <main className="profile-main">
                {banner && <div className={`banner ${banner.type}`}>{banner.text}</div>}
                {!verificationStatus.verified && activeTab !== "profile" && (
                    <div className="card verification-required-banner">
                        <h3>Verification Required</h3>
                        <p>You must verify your NGO identity before accessing this feature.</p>
                        <button className="primary" onClick={() => setActiveTab("profile")}>Go to Profile</button>
                    </div>
                )}
                {verificationStatus.verified && activeTab !== "profile" && (
                    <div className="card verification-success-banner">
                        <p>Verified NGO - All features unlocked</p>
                    </div>
                )}

                {activeTab === "profile" && (
                    <div className="profile-section card">
                        <h2>NGO Profile</h2>
                        {!verificationStatus.verified && (!profile.registration || user?.profile?.rejectionReason) ? (
                            <div className="verification-section">
                                <h3>{user?.profile?.rejectionReason ? 'Update and Resubmit Verification' : 'Verify Your NGO Identity'}</h3>
                                {user?.profile?.rejectionReason ? (
                                    <div className="rejection-alert">
                                        <p><strong>Your verification was rejected.</strong></p>
                                        <p>Reason: {user.profile.rejectionReason}</p>
                                        <p className="rejection-hint">Please update your details and upload a new document to resubmit.</p>
                                    </div>
                                ) : (
                                    <p className="verification-hint">You must verify your NGO to receive donations and make purchases.</p>
                                )}
                                <div className="verification-form">
                                    <div className="info-field">
                                        <label>Registration Number:</label>
                                        <input
                                            value={verificationForm.registrationNumber}
                                            onChange={(e) => setVerificationForm({ ...verificationForm, registrationNumber: e.target.value })}
                                            placeholder="Enter NGO registration number"
                                        />
                                    </div>
                                    <div className="info-field">
                                        <label>Verification Document:</label>
                                        <input type="file" accept="image/*,.pdf" onChange={handleVerificationDocument} />
                                    </div>
                                    {verificationForm.documentPreview && (
                                        <div className="document-preview-inline">
                                            <p>Document Preview:</p>
                                            {verificationForm.documentPreview.startsWith('data:image/') ? (
                                                <img src={verificationForm.documentPreview} alt="Document preview" />
                                            ) : (
                                                <a href={verificationForm.documentPreview} target="_blank" rel="noopener noreferrer" className="doc-link">View current document</a>
                                            )}
                                        </div>
                                    )}
                                    <div className="info-field">
                                        <label>Organization Name:</label>
                                        <input value={profile.name} readOnly />
                                    </div>
                                    <div className="info-field">
                                        <label>Phone:</label>
                                        <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                                    </div>
                                    <div className="info-field">
                                        <label>Address:</label>
                                        <textarea value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
                                    </div>
                                    <div className="info-field">
                                        <label>Mission Statement:</label>
                                        <textarea value={profile.mission} onChange={(e) => setProfile({ ...profile, mission: e.target.value })} />
                                    </div>
                                    <button className="primary" onClick={submitVerification}>{user?.profile?.rejectionReason ? 'Resubmit for Verification' : 'Submit for Verification'}</button>
                                </div>
                            </div>
                        ) : profile.registration && !verificationStatus.verified ? (
                            <div className="profile-info">
                                <div className="info-field verification-pending-badge">
                                    <strong>Verification Pending</strong>
                                </div>
                                <div className="info-field">
                                    <label>Organization Name:</label>
                                    <input value={profile.name} readOnly />
                                </div>
                                <div className="info-field">
                                    <label>Email:</label>
                                    <input value={profile.email} readOnly />
                                </div>
                                <div className="info-field">
                                    <label>Registration Number:</label>
                                    <input value={profile.registration} readOnly />
                                </div>
                                <div className="info-field">
                                    <label>Phone:</label>
                                    <input value={profile.phone} readOnly />
                                </div>
                                <div className="info-field">
                                    <label>Address:</label>
                                    <textarea value={profile.address} readOnly />
                                </div>
                                <div className="info-field">
                                    <label>Mission Statement:</label>
                                    <textarea value={profile.mission} readOnly />
                                </div>
                                <p className="verification-pending-hint">Your verification request is pending admin approval. All details are locked until verified.</p>
                                <div className="profile-actions">
                                    <button className="primary" onClick={refreshVerificationNow}>Refresh verification status</button>
                                </div>
                            </div>
                        ) : (
                            <div className="profile-info">
                                <div className="info-field verification-verified-badge">
                                    <strong>Verified NGO</strong>
                                </div>
                                <div className="info-field">
                                    <label>Organization Name:</label>
                                    <input value={profile.name} readOnly />
                                </div>
                                <div className="info-field">
                                    <label>Email:</label>
                                    <input value={profile.email} readOnly />
                                </div>
                                <div className="info-field">
                                    <label>Phone:</label>
                                    <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                                </div>
                                <div className="info-field">
                                    <label>Registration Number:</label>
                                    <input value={profile.registration} readOnly />
                                </div>
                                <div className="info-field">
                                    <label>Address:</label>
                                    <textarea value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
                                </div>
                                <div className="info-field">
                                    <label>Mission Statement:</label>
                                    <textarea value={profile.mission} onChange={(e) => setProfile({ ...profile, mission: e.target.value })} />
                                </div>
                                <button className="primary">Update Profile</button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "messages" && (
                    <div className="messages-section card">
                        <h2>Messages / Notifications</h2>
                        {messages.length === 0 ? (
                            <p>No messages yet.</p>
                        ) : (
                        messages.map(msg => (
                            <div key={msg.id} className={`message-item ${msg.read ? "read" : "unread"}`}>
                                {msg.message}
                                <button onClick={() => setMessages(messages.map(m => m.id === msg.id ? {...m, read: true} : m))}>Mark as Read</button>
                            </div>
                        ))
                        )}
                    </div>
                )}

                {activeTab === "partners" && (
                    <div className="partners-section card">
                        <h2>Partnerships / Seller Network</h2>
                        {partners.length === 0 ? (
                            <p>No partners found yet.</p>
                        ) : (
                            partners.map(partner => (
                                <div key={partner.name} className="partner-item">
                                    <p>Seller: {partner.name}</p>
                                    <p>Total Donations: {partner.totalDonations}</p>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default NGOProfile;