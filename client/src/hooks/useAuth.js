import { useState, useEffect, useCallback } from 'react';
import { SOCKET_EVENTS } from '../config/constants';

export const useAuth = (socket) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authError, setAuthError] = useState('');

    // Initialize authentication state
    useEffect(() => {
        const storedToken = localStorage.getItem('authToken');
        const storedUserInfo = localStorage.getItem('userInfo');

        if (storedToken && storedUserInfo) {
            try {
                const userInfo = JSON.parse(storedUserInfo);
                setUser({ ...userInfo, accessToken: storedToken });
                setIsAuthenticated(true);
            } catch (error) {
                console.error('Failed to parse stored user info:', error);
                logout();
            }
        }
    }, []);

    // Authenticate with socket when user is set
    useEffect(() => {
        if (socket && user?.accessToken) {
            socket.emit(SOCKET_EVENTS.AUTHENTICATE, user.accessToken);
        }
    }, [socket, user]);

    // Listen for auth events
    useEffect(() => {
        if (!socket) return;

        const handleAuthSuccess = (authData) => {
            console.log('Authentication successful:', authData);
            setAuthError('');
        };

        const handleAuthError = (error) => {
            console.error('Authentication failed:', error);
            setAuthError(error.message);
            // Don't auto-logout on socket auth error, user might be in guest mode
        };

        socket.on('auth-success', handleAuthSuccess);
        socket.on('auth-error', handleAuthError);

        return () => {
            socket.off('auth-success', handleAuthSuccess);
            socket.off('auth-error', handleAuthError);
        };
    }, [socket]);

    const login = useCallback((userInfo) => {
        setUser(userInfo);
        setIsAuthenticated(true);
        setAuthError('');

        // Store in localStorage
        localStorage.setItem('authToken', userInfo.accessToken);
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError('');

        // Clear localStorage
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
    }, []);

    const continueAsGuest = useCallback(() => {
        setUser({ username: 'Guest', isGuest: true });
        setIsAuthenticated(false); // Guest is not authenticated
        setAuthError('');
    }, []);

    return {
        user,
        isAuthenticated,
        authError,
        login,
        logout,
        continueAsGuest
    };
};
