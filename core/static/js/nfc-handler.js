/**
 * NFC Handler
 * Handles NFC card operations using the Web NFC API
 */
class NFCHandler {
    constructor() {
        this.isNFCSupported = 'NDEFReader' in window;
        this.isReading = false;
        this.reader = null;
        this.currentOperation = null;
        this.operationCallback = null;
        this.statusCallback = null;
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
     * @returns {Promise<boolean>} Promise resolving to true if permission granted, false otherwise
     */
    async requestNFCPermission() {
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
     * Show status message using the callback if available
     * @param {string} message The message to display
     * @param {string} type The type of message (info, success, error)
     */
    showStatus(message, type = 'info') {
        console.log(`[NFC ${type}]: ${message}`);
        if (this.statusCallback) {
            this.statusCallback(message, type);
        }
    }

    /**
     * Generate a 16-character alphanumeric unique ID
     * @returns {string} A 16-character alphanumeric ID
     */
    generateUniqueID() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 16; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
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
        if (this.reader) {
            // The Web NFC API doesn't have a direct method to stop scanning
            // We'll just set our internal state to indicate we're no longer interested in readings
            this.isReading = false;
            this.currentOperation = null;
            this.operationCallback = null;
            this.showStatus('NFC reading stopped', 'info');
        }
    }

    /**
     * Handle a card read event
     * @param {string} serialNumber The serial number of the NFC card
     */
    handleCardRead(serialNumber) {
        if (!this.isReading || !this.operationCallback) {
            return;
        }

        this.showStatus(`Card detected! Serial: ${serialNumber}`, 'success');
        
        // Call the callback with the card ID
        this.operationCallback(serialNumber);
        
        // Stop reading after a successful read
        this.isReading = false;
    }

    /**
     * Write data to an NFC card (for future use)
     * @param {Object} data The data to write to the card
     * @param {Function} callback The callback function to handle the result
     */
    async writeToCard(data, callback) {
        if (!this.checkNFCSupport()) {
            callback(false, new Error('NFC not supported'));
            return;
        }

        try {
            this.showStatus('Waiting for NFC card to write data...', 'info');
            
            const writer = new NDEFReader();
            await writer.write(data);
            
            this.showStatus('Data written to NFC card successfully', 'success');
            if (callback) {
                callback(true);
            }
        } catch (error) {
            this.showStatus(`Error writing to NFC card: ${error.message}`, 'error');
            if (callback) {
                callback(false, error);
            }
        }
    }
}

// Export the NFCHandler class
window.NFCHandler = NFCHandler;
