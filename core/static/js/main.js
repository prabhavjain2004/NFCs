// Card ID Handler - Supports both NFC and manual entry
class CardHandler {
    constructor() {
        this.encryptionKey = null;
        this.nfcHandler = new NFCHandler();
        this.isNFCSupported = this.nfcHandler.checkNFCSupport();
    }

    async initialize() {
        await this.setupEncryption();
        if (this.isNFCSupported) {
            await this.nfcHandler.requestPermission();
        }
        this.setupNFCStatusDisplay();
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

    async processCardId(cardId, isNFC = false) {
        try {
            let uniqueId = cardId;
            if (isNFC && !await this.checkIfCardExists(cardId)) {
                uniqueId = this.nfcHandler.generateUniqueID();
            }

            const encryptedData = await this.encryptData({
                text: uniqueId,
                timestamp: Date.now(),
                deviceId: await this.getDeviceIdentifier(),
                isNFC: isNFC
            });
            
            const response = await this.sendCardData(encryptedData);
            this.showStatus('Card processed successfully', 'success');
            return response;
        } catch (error) {
            console.error("Error processing card data:", error);
            this.showStatus(`Error: ${error.message}`, 'error');
            throw error;
        }
    }

    async checkIfCardExists(cardId) {
        // Implement API call to check if the card exists in the backend
        try {
            const response = await axios.get(`/api/cards/check/${cardId}/`);
            return response.data.exists;
        } catch (error) {
            console.error("Error checking card existence:", error);
            return false;
        }
    }

    async sendCardData(encryptedData) {
        // Implement API call to send card data to the backend
        try {
            const response = await axios.post('/api/cards/process/', encryptedData, authManager.getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error("Error sending card data:", error);
            throw error;
        }
    }

    showStatus(message, type) {
        console.log(`[${type.toUpperCase()}] ${message}`);
        const statusElement = document.getElementById('cardStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `text-${type === 'success' ? 'green' : type === 'error' ? 'red' : 'blue'}-600`;
        }
    }

    setupNFCStatusDisplay() {
        const nfcStatusElement = document.getElementById('nfcStatus');
        if (nfcStatusElement) {
            nfcStatusElement.textContent = this.isNFCSupported ? 'NFC Supported' : 'NFC Not Supported';
            nfcStatusElement.className = `text-${this.isNFCSupported ? 'green' : 'red'}-600`;
        }
    }

    startNFCReading() {
        if (!this.isNFCSupported) {
            this.showStatus('NFC is not supported on this device', 'warning');
            return;
        }
        this.showStatus('Waiting for NFC card...', 'info');
        this.nfcHandler.startReading('cardReading', (cardId, ndefMessage, error) => {
            if (error) {
                this.showStatus(`NFC Error: ${error.message}`, 'error');
            } else {
                this.showStatus('NFC Card detected!', 'success');
                this.processCardId(cardId, ndefMessage, true);
            }
        });
    }

    async processCardId(cardId, ndefMessage, isNFC = false) {
        try {
            let uniqueId = cardId;
            if (isNFC) {
                if (ndefMessage && ndefMessage.length === 16) {
                    uniqueId = ndefMessage;
                } else if (!await this.checkIfCardExists(cardId)) {
                    uniqueId = this.nfcHandler.generateUniqueID();
                }
            }

            const encryptedData = await this.encryptData({
                text: uniqueId,
                timestamp: Date.now(),
                deviceId: await this.getDeviceIdentifier(),
                isNFC: isNFC
            });
            
            const response = await this.sendCardData(encryptedData);
            this.showStatus('Card processed successfully', 'success');
            return response;
        } catch (error) {
            console.error("Error processing card data:", error);
            this.showStatus(`Error: ${error.message}`, 'error');
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
    cardHandler.initialize().then(() => {
        console.log('Card handler initialized successfully');
        // Start NFC reading if supported
        if (cardHandler.isNFCSupported) {
            cardHandler.startNFCReading();
        }
    }).catch(error => {
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

/*************************************************************
 *  Custom flows for Issue Card, Top-Up, and Balance Inquiry *
 *************************************************************/

// This function handles the double-scan logic for issuing a card,
// plus collecting Customer Name & Mobile Number
async function handleIssueCardFlow() {
    console.log('Initiating Issue Card flow...');
    // Placeholder logic
    // 1) Trigger first NFC scan
    // 2) Show a modal/form to collect Customer Name & Mobile Number
    // 3) Trigger second NFC scan
    // 4) Make an API call to finalize card issuance
}

// This function handles the double-scan logic for topping up,
// plus prompting for the top-up amount
async function handleTopUpFlow() {
    console.log('Initiating Top-Up flow...');
    // Placeholder logic
    // 1) Trigger first NFC scan
    // 2) Show a modal/form to collect the top-up amount
    // 3) Trigger second NFC scan
    // 4) Make an API call to complete the top-up
}

// This function handles a single-scan flow for balance inquiry,
// analyzing the scanned card ID and returning the balance
async function handleBalanceInquiryFlow() {
    console.log('Initiating Balance Inquiry flow...');
    // Placeholder logic
    // 1) Trigger single NFC scan
    // 2) Make an API call to retrieve the balance
    // 3) Show result to user
}

// Expose these functions globally so they can be called from the admin_dashboard or elsewhere
window.handleIssueCardFlow = handleIssueCardFlow;
window.handleTopUpFlow = handleTopUpFlow;
window.handleBalanceInquiryFlow = handleBalanceInquiryFlow;

// Keep references in case we want to call them from other places.
window.cardHandler = cardHandler;
window.authManager = authManager;
window.rateLimiter = rateLimiter;
