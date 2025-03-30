/**
 * NFC Handler
 * Handles NFC card detection and reading using the Web NFC API
 */
class NFCHandler {
    constructor() {
        this.isNFCSupported = 'NDEFReader' in window;
        this.reader = null;
        this.isReading = false;
        this.statusCallback = null;
        this.currentOperation = null;
        this.operationCallback = null;
    }
    
    /**
     * Check if NFC is supported by the browser
     * @returns {boolean} True if NFC is supported, false otherwise
     */
    checkNFCSupport() {
        if (!this.isNFCSupported) {
            console.warn('Web NFC API is not supported in this browser');
            return false;
        }
        
        // Check if we're in a secure context (HTTPS or localhost)
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            console.warn('Web NFC API requires HTTPS (except on localhost)');
            return false;
        }
        
        return true;
    }
    
    /**
     * Request NFC permissions explicitly
     * This method is called directly from the UI
     * @returns {Promise<boolean>} Promise resolving to true if permission granted, false otherwise
     */
    async requestPermission() {
        if (!this.checkNFCSupport()) {
            return false;
        }
        
        try {
            // Create a temporary NDEFReader to trigger the permission prompt
            const tempReader = new NDEFReader();
            await tempReader.scan();
            console.log('NFC permission granted');
            return true;
        } catch (error) {
            console.error('Error requesting NFC permission:', error);
            return false;
        }
    }
    
    /**
     * Set the status callback function
     * @param {Function} callback The callback function to display status messages
     */
    setStatusCallback(callback) {
        this.statusCallback = callback;
    }
    
    /**
     * Show a status message
     * @param {string} message The message to display
     * @param {string} type The type of message (info, success, error, warning)
     */
    showStatus(message, type = 'info') {
        if (this.statusCallback) {
            this.statusCallback(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    /**
     * Start reading NFC cards
     * @param {string} operation The operation being performed (issuance, topup, balance)
     * @param {Function} callback The callback function to handle the scanned card
     */
    async startReading(operation, callback) {
        if (!this.checkNFCSupport()) {
            callback(null, new Error('NFC not supported in this browser or requires HTTPS'));
            return;
        }

        if (this.isReading) {
            this.showStatus('Already reading NFC cards', 'info');
            return;
        }

        this.currentOperation = operation;
        this.operationCallback = callback;
        this.isReading = true;

        try {
            this.showStatus('Waiting for NFC card...', 'info');
            
            // Check if NFC is enabled on the device
            try {
                this.reader = new NDEFReader();
                
                // Handle reading errors
                this.reader.addEventListener('error', (event) => {
                    console.error('NFC reading error:', event);
                    this.showStatus(`NFC Error: ${event.message}`, 'error');
                    this.isReading = false;
                    if (this.operationCallback) {
                        this.operationCallback(null, new Error(event.message));
                    }
                });

                // Handle successful reading
                this.reader.addEventListener('reading', ({ serialNumber }) => {
                    console.log('NFC card detected:', serialNumber);
                    this.handleCardRead(serialNumber);
                });

                // Start scanning - this will trigger the permission prompt if not already granted
                await this.reader.scan();
                this.showStatus('NFC reader activated. Please tap your card.', 'info');
                
            } catch (error) {
                if (error.name === 'NotAllowedError') {
                    this.showStatus('NFC permission denied. Please allow NFC access and try again.', 'error');
                } else if (error.name === 'NotSupportedError') {
                    this.showStatus('NFC is not supported or not enabled on this device.', 'error');
                } else {
                    this.showStatus(`Error starting NFC reader: ${error.message}`, 'error');
                }
                console.error('Detailed NFC error:', error);
                this.isReading = false;
                if (callback) {
                    callback(null, error);
                }
            }
            
        } catch (error) {
            this.showStatus(`Error starting NFC reader: ${error.message}`, 'error');
            console.error('Detailed NFC error:', error);
            this.isReading = false;
            if (callback) {
                callback(null, error);
            }
        }
    }
    
    /**
     * Stop reading NFC cards
     */
    stopReading() {
        if (this.reader && this.isReading) {
            try {
                // There's no explicit stop method in the Web NFC API
                // We just set the flag to false and ignore future readings
                this.isReading = false;
                this.currentOperation = null;
                this.operationCallback = null;
                console.log('NFC reading stopped');
            } catch (error) {
                console.error('Error stopping NFC reader:', error);
            }
        }
    }
    
    /**
     * Handle a card read event
     * @param {string} serialNumber The serial number of the card
     */
    handleCardRead(serialNumber) {
        if (!this.isReading) {
            return;
        }
        
        this.showStatus('Card detected!', 'success');
        
        // Call the operation callback with the card ID
        if (this.operationCallback) {
            this.operationCallback(serialNumber);
        }
        
        // Stop reading after a successful read
        this.stopReading();
    }
    
    /**
     * Generate a 16-character alphanumeric unique ID
     * @returns {string} A 16-character alphanumeric unique ID
     */
    generateUniqueID() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let uniqueId = '';
        
        // Generate a 16-character random string
        for (let i = 0; i < 16; i++) {
            uniqueId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return uniqueId;
    }
}
