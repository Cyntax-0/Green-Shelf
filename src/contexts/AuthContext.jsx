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

			const response = await fetch("http://localhost:5001/api/auth/profile", {
				headers: { Authorization: `Bearer ${savedToken}` }
			});
			if (response.ok) {
				const data = await response.json();
				setUser(data.data);
				setToken(savedToken);
				setIsAuthenticated(true);
			} else {
				localStorage.removeItem('authToken');
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
	};

	const logout = async () => {
		try {
			localStorage.removeItem('authToken');
		} catch (error) {
			console.error("Logout error:", error);
		} finally {
			setUser(null);
			setToken(null);
			setIsAuthenticated(false);
		}
	};

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
