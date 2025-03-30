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
    
    checkNFCSupport() {
        if (!this.isNFCSupported) {
            console.warn('Web NFC API is not supported in this browser');
            return false;
        }
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            console.warn('Web NFC API requires HTTPS (except on localhost)');
            return false;
        }
        return true;
    }
    
    async requestPermission() {
        if (!this.checkNFCSupport()) {
            return false;
        }
        try {
            const tempReader = new NDEFReader();
            await tempReader.scan();
            console.log('NFC permission granted');
            return true;
        } catch (error) {
            console.error('Error requesting NFC permission:', error);
            return false;
        }
    }
    
    setStatusCallback(callback) {
        this.statusCallback = callback;
    }
    
    showStatus(message, type = 'info') {
        if (this.statusCallback) {
            this.statusCallback(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
            // Display message in UI
            const statusElement = document.getElementById('nfcStatus');
            if (statusElement) {
                statusElement.textContent = message;
                statusElement.className = `text-${type === 'success' ? 'green' : 'blue'}-600`;
            }
        }
    }
    
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
            this.reader = new NDEFReader();
            this.reader.addEventListener('error', (event) => {
                console.error('NFC reading error:', event);
                this.showStatus(`NFC Error: ${event.message}`, 'error');
                this.isReading = false;
                if (this.operationCallback) {
                    this.operationCallback(null, new Error(event.message));
                }
            });
            this.reader.addEventListener('reading', ({ serialNumber }) => {
                console.log('NFC card detected:', serialNumber);
                this.handleCardRead(serialNumber);
            });
            await this.reader.scan();
            this.showStatus('NFC reader activated. Please tap your card.', 'info');
        } catch (error) {
            this.showStatus(`Error starting NFC reader: ${error.message}`, 'error');
            console.error('Detailed NFC error:', error);
            this.isReading = false;
            if (callback) {
                callback(null, error);
            }
        }
    }
    
    stopReading() {
        if (this.reader && this.isReading) {
            this.isReading = false;
            this.currentOperation = null;
            this.operationCallback = null;
            console.log('NFC reading stopped');
        }
    }
    
    async handleCardRead(serialNumber, rawMessage) {
        if (!this.isReading) {
            return;
        }
        this.showStatus('NFC Card detected successfully!', 'success');
        
        let ndefMessage = null;
        if (rawMessage && rawMessage.records) {
            ndefMessage = await this.decodeNdefMessage(rawMessage);
        }
        
        if (this.operationCallback) {
            this.operationCallback(serialNumber, ndefMessage);
        }
        
        this.stopReading();
    }

    async decodeNdefMessage(rawMessage) {
        const textDecoder = new TextDecoder();
        let decodedMessage = '';
        for (const record of rawMessage.records) {
            if (record.recordType === "text") {
                const textData = textDecoder.decode(record.data);
                decodedMessage += textData;
            }
        }
        return decodedMessage;
    }
    
    generateUniqueID() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let uniqueId = '';
        for (let i = 0; i < 16; i++) {
            uniqueId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return uniqueId;
    }
}
