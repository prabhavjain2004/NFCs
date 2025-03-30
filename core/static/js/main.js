// Card ID Handler - Manual entry replacement for NFC
class CardHandler {
    constructor() {
        this.encryptionKey = null;
    }

    async initialize() {
        await this.setupEncryption();
    }

    async setupEncryption() {
        // Generate encryption key for the session
        const key = await window.crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );
        this.encryptionKey = key;
    }

    async encryptData(data) {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encodedData = new TextEncoder().encode(JSON.stringify(data));
        
        const encryptedData = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            this.encryptionKey,
            encodedData
        );

        return {
            data: Array.from(new Uint8Array(encryptedData)),
            iv: Array.from(iv)
        };
    }

    async processCardId(cardId) {
        try {
            // Encrypt the data before sending
            const encryptedData = await this.encryptData({
                text: cardId,
                timestamp: Date.now(),
                deviceId: await this.getDeviceIdentifier()
            });
            
            return [encryptedData];
        } catch (error) {
            console.error("Error processing card data:", error);
            throw error;
        }
    }

    async getDeviceIdentifier() {
        // Generate a unique device identifier
        const deviceData = [
            navigator.userAgent,
            screen.width,
            screen.height,
            new Date().getTimezoneOffset()
        ].join('|');

        const hash = await crypto.subtle.digest('SHA-256', 
            new TextEncoder().encode(deviceData));
        
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
}

// Authentication and Security
class AuthManager {
    constructor() {
        this.accessToken = localStorage.getItem('access_token');
        this.refreshToken = localStorage.getItem('refresh_token');
        this.tokenRefreshInterval = null;
        this.failedLoginAttempts = parseInt(localStorage.getItem('failedLoginAttempts') || '0');
        this.lockoutUntil = localStorage.getItem('lockoutUntil');
        
        this.setupAxiosDefaults();
        this.setupAxiosInterceptors();
    }

    setupAxiosDefaults() {
        if (this.accessToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
        }
    }

    setupAxiosInterceptors() {
        axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                const isUnauthorized = error.response?.status === 401;
                const hasRefreshToken = Boolean(this.refreshToken);
                const isNotRefreshRequest = !error.config.url.includes('/api/token/refresh/');

                if (isUnauthorized && hasRefreshToken && isNotRefreshRequest) {
                    try {
                        const response = await axios.post('/api/token/refresh/', {
                            refresh: this.refreshToken
                        });
                        this.updateToken(response.data.access);
                        
                        // Retry the original request
                        error.config.headers['Authorization'] = `Bearer ${this.accessToken}`;
                        return axios(error.config);
                    } catch (refreshError) {
                        this.logout();
                        return Promise.reject(refreshError);
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    updateToken(newToken) {
        this.accessToken = newToken;
        localStorage.setItem('access_token', this.accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
    }

    async login(username, password) {
        if (this.isLockedOut()) {
            throw new Error('Account is temporarily locked. Please try again later.');
        }

        try {
            const response = await axios.post('/api/users/login/', {
                username,
                password
            });

            const { access, refresh, user_type } = response.data;
            
            this.accessToken = access;
            this.refreshToken = refresh;
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            localStorage.setItem('user_type', user_type);
            
            this.setupAxiosDefaults();
            this.resetFailedAttempts();
            this.startTokenRefresh();
            
            return response.data;
        } catch (error) {
            this.handleFailedLogin();
            throw error;
        }
    }

    handleFailedLogin() {
        this.failedLoginAttempts++;
        localStorage.setItem('failedLoginAttempts', this.failedLoginAttempts.toString());

        // Implement exponential backoff for lockout duration
        if (this.failedLoginAttempts >= 5) {
            const lockoutDuration = Math.min(Math.pow(2, this.failedLoginAttempts - 5) * 1000, 3600000); // Max 1 hour
            const lockoutUntil = Date.now() + lockoutDuration;
            localStorage.setItem('lockoutUntil', lockoutUntil.toString());
        }
    }

    isLockedOut() {
        const lockoutUntil = parseInt(localStorage.getItem('lockoutUntil') || '0');
        return lockoutUntil > Date.now();
    }

    resetFailedAttempts() {
        localStorage.removeItem('failedLoginAttempts');
        localStorage.removeItem('lockoutUntil');
        this.failedLoginAttempts = 0;
    }

    startTokenRefresh() {
        // Refresh token 5 minutes before expiry (token expires at 60 minutes)
        const REFRESH_INTERVAL = 55 * 60 * 1000; // 55 minutes
        
        this.tokenRefreshInterval = setInterval(async () => {
            try {
                const response = await axios.post('/api/token/refresh/', {
                    refresh: this.refreshToken
                });
                this.updateToken(response.data.access);
            } catch (error) {
                console.error('Error refreshing token:', error);
                this.logout();
            }
        }, REFRESH_INTERVAL);
    }

    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_type');
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
        }
        window.location.href = '/';
    }

    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.accessToken}`
        };
    }
}

// Rate Limiting
class RateLimiter {
    constructor(limit, interval) {
        this.limit = limit; // Number of allowed requests
        this.interval = interval; // Time window in milliseconds
        this.requests = [];
    }

    async checkLimit() {
        const now = Date.now();
        this.requests = this.requests.filter(time => time > now - this.interval);
        
        if (this.requests.length >= this.limit) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }
        
        this.requests.push(now);
        return true;
    }
}

// Initialize global instances
const cardHandler = new CardHandler();
const authManager = new AuthManager();
const rateLimiter = new RateLimiter(60, 60000); // 60 requests per minute

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the card handler
    cardHandler.initialize().catch(error => {
        console.error('Failed to initialize card handler:', error);
    });
    const loginBtn = document.getElementById('loginBtn');
    const loginForm = document.getElementById('loginForm');

    if (loginBtn) {
        loginBtn.addEventListener('click', async function() {
            try {
                await rateLimiter.checkLimit();
                var loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                loginModal.show();
            } catch (error) {
                alert(error.message);
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            try {
                await rateLimiter.checkLimit();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                const response = await authManager.login(username, password);
                window.location.href = '/dashboard';
            } catch (error) {
                console.error('Login failed:', error);
                alert(error.response?.data?.message || error.message || 'Login failed. Please try again.');
            }
        });
    }

    // Logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            authManager.logout();
        });
    }
});

// Export modules for use in other scripts
window.cardHandler = cardHandler;
window.authManager = authManager;
window.rateLimiter = rateLimiter;
