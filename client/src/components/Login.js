import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Login = ({ onLoginSuccess, onSkipLogin }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [authUrl, setAuthUrl] = useState('');

    useEffect(() => {
        // Check for authorization code in URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const scope = urlParams.get('scope') || 'openid';
        const paramState = urlParams.get('state');
        if (code) {
            handleAuthCallback(code, scope, paramState);
            return;
        }

        // Check if we have OAuth config
        const clientId = process.env.REACT_APP_OAUTH2_CLIENT_ID;
        const redirectUri = process.env.REACT_APP_OAUTH2_REDIRECT_URI;
        const oauthUrl = process.env.REACT_APP_OAUTH2_API_URL;
        const state = Math.random().toString(36).substring(2, 15);

        if (clientId && redirectUri && oauthUrl) {
            const url = `${oauthUrl}/oauth2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid&state=${state}`;
            setAuthUrl(url);
        }
    }, []);

    const handleAuthCallback = async (code, scope, state) => {
        try {
            setIsLoading(true);
            setError('');

            // Exchange code for token
            const tokenResponse = await axios.post('/api/auth/token', { code, scope, state });
            const { access_token } = tokenResponse.data;

            // Verify token and get user info
            const userResponse = await axios.post('/api/auth/verify', { access_token });
            const userInfo = { ...userResponse.data, accessToken: access_token };

            // Store in localStorage
            localStorage.setItem('authToken', access_token);
            localStorage.setItem('userInfo', JSON.stringify(userInfo));

            // Clear URL params
            window.history.replaceState({}, document.title, window.location.pathname);

            onLoginSuccess(userInfo);
        } catch (error) {
            console.error('Authentication failed:', error);
            setError(error.response?.data?.message || 'Authentication failed');
            // Clear URL params on error
            window.history.replaceState({}, document.title, window.location.pathname);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = () => {
        if (authUrl) {
            window.location.href = authUrl;
        }
    };

    const handleSkip = () => {
        onSkipLogin();
    };

    // Check for stored auth
    useEffect(() => {
        const storedToken = localStorage.getItem('authToken');
        const storedUserInfo = localStorage.getItem('userInfo');

        if (storedToken && storedUserInfo) {
            try {
                const userInfo = JSON.parse(storedUserInfo);
                // Verify token is still valid
                axios.post('/api/auth/verify', { access_token: storedToken })
                    .then(() => {
                        onLoginSuccess({ ...userInfo, accessToken: storedToken });
                    })
                    .catch(() => {
                        // Token expired, clear storage
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('userInfo');
                    });
            } catch (error) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('userInfo');
            }
        }
    }, [onLoginSuccess]);

    if (isLoading) {
        return (
            <div className="login-container">
                <div className="login-card">
                    <h2>Authenticating...</h2>
                    <div className="loading-spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Listen Together</h1>
                <p>Join a room to watch YouTube videos together with friends!</p>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <div className="login-options">
                    {authUrl ? (
                        <button
                            className="login-button primary"
                            onClick={handleLogin}
                            disabled={isLoading}
                        >
                            Login with Mezon
                        </button>
                    ) : (
                        <div className="warning-message">
                            OAuth not configured. Please set environment variables.
                        </div>
                    )}

                    <button
                        className="login-button secondary"
                        onClick={handleSkip}
                        disabled={isLoading}
                    >
                        Continue as Guest
                    </button>
                </div>

                <div className="login-info">
                    <p>
                        <strong>Login benefits:</strong><br />
                        • Your username will be displayed in rooms<br />
                        • Room owners can grant you playlist permissions<br />
                        • Better experience with room management
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
