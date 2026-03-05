import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [token, setToken] = useState(null);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		checkAuthStatus();
	}, []);

	const checkAuthStatus = async () => {
		try {
			const savedToken = localStorage.getItem('authToken');
			if (!savedToken) {
				setUser(null);
				setToken(null);
				setIsAuthenticated(false);
				return;
			}

			// Inactivity check: if last activity was more than 15 days ago, log out on this device
			const lastActivityRaw = localStorage.getItem('lastActivity');
			if (lastActivityRaw) {
				const lastActivity = Number(lastActivityRaw);
				if (!Number.isNaN(lastActivity)) {
					const now = Date.now();
					const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
					if (now - lastActivity > fifteenDaysMs) {
						localStorage.removeItem('authToken');
						localStorage.removeItem('adminToken');
						localStorage.removeItem('lastActivity');
						setUser(null);
						setToken(null);
						setIsAuthenticated(false);
						return;
					}
				}
			}

			const response = await fetch("http://localhost:5001/api/auth/profile", {
				headers: { Authorization: `Bearer ${savedToken}` }
			});
			if (response.ok) {
				const data = await response.json();
				setUser(data.data);
				setToken(savedToken);
				setIsAuthenticated(true);
				// Refresh activity timestamp on successful profile check
				try {
					localStorage.setItem('lastActivity', Date.now().toString());
				} catch (_) {}
			} else {
				localStorage.removeItem('authToken');
				localStorage.removeItem('adminToken');
				localStorage.removeItem('lastActivity');
				setUser(null);
				setToken(null);
				setIsAuthenticated(false);
			}
		} catch (error) {
			console.error("Auth check failed:", error);
			setUser(null);
			setToken(null);
			setIsAuthenticated(false);
		} finally {
			setIsLoading(false);
		}
	};

	const login = (userData, jwtToken) => {
		if (jwtToken) {
			localStorage.setItem('authToken', jwtToken);
			setToken(jwtToken);
		}
		setUser(userData);
		setIsAuthenticated(true);
		try {
			localStorage.setItem('lastActivity', Date.now().toString());
		} catch (_) {}
	};

	const logout = async () => {
		try {
			localStorage.removeItem('authToken');
			localStorage.removeItem('adminToken');
			localStorage.removeItem('lastActivity');
		} catch (error) {
			console.error("Logout error:", error);
		} finally {
			setUser(null);
			setToken(null);
			setIsAuthenticated(false);
		}
	};

	// Track user activity in this browser to keep session alive up to 15 days
	useEffect(() => {
		if (!isAuthenticated) return;

		const updateActivity = () => {
			try {
				localStorage.setItem('lastActivity', Date.now().toString());
			} catch (_) {}
		};

		const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
		events.forEach((evt) => window.addEventListener(evt, updateActivity));

		return () => {
			events.forEach((evt) => window.removeEventListener(evt, updateActivity));
		};
	}, [isAuthenticated]);

	const value = {
		user,
		token,
		isAuthenticated,
		isLoading,
		login,
		logout,
		checkAuthStatus
	};

	return (
		<AuthContext.Provider value={value}>
			{children}
		</AuthContext.Provider>
	);
};
