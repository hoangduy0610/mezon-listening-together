const axios = require('axios');
const Logger = require('../utils/Logger');

class AuthService {
    constructor() {
        this.logger = new Logger('AuthService');
        this.CLIENT_ID = process.env.OAUTH2_CLIENT_ID;
        this.CLIENT_SECRET = process.env.OAUTH2_CLIENT_SECRET;
        this.OAUTH2_URL = process.env.OAUTH2_API_URL;
        this.REDIRECT_URI = process.env.OAUTH2_REDIRECT_URI;
    }

    /**
     * Exchange authorization code for access token
     * @param {string} code - Authorization code
     * @returns {Promise<Object>} Token response
     */
    async getOAuth2Token(code, scope, state) {
        try {
            const body = new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                scope,
                state,
                client_id: this.CLIENT_ID,
                client_secret: this.CLIENT_SECRET,
                redirect_uri: this.REDIRECT_URI,
            })

            const response = await axios.post(`${this.OAUTH2_URL}/oauth2/token`,
                body,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    }
                }
            );

            return response.data;
        } catch (error) {
            this.logger.error('Failed to get OAuth2 token', { error: error.message });
            throw new Error('Failed to authenticate');
        }
    }

    /**
     * Get user information from access token
     * @param {string} accessToken - OAuth2 access token
     * @returns {Promise<Object>} User information
     */
    async getUserInfo(accessToken) {
        try {
            const response = await axios.post(`${this.OAUTH2_URL}/userinfo`,
                new URLSearchParams({
                    access_token: accessToken,
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    }
                }
            );

            return response.data;
        } catch (error) {
            this.logger.error('Failed to get user info', { error: error.message });
            throw new Error('Failed to get user information');
        }
    }

    /**
     * Verify access token and return user info
     * @param {string} accessToken - OAuth2 access token
     * @returns {Promise<Object>} User information
     */
    async verifyToken(accessToken) {
        if (!accessToken) {
            throw new Error('Access token required');
        }

        return await this.getUserInfo(accessToken);
    }
}

module.exports = AuthService;
