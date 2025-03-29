class NFCPaymentProcessor {
    constructor() {
        this.nfcHandler = window.nfcHandler;
        this.authManager = window.authManager;
        this.rateLimiter = window.rateLimiter;
        this.transactionInProgress = false;
        this.currentTransaction = null;
    }

    async startPayment(amount, outletId) {
        if (this.transactionInProgress) {
            throw new Error('A transaction is already in progress');
        }

        try {
            await this.rateLimiter.checkLimit();
            
            this.transactionInProgress = true;
            this.currentTransaction = {
                amount: amount,
                outletId: outletId,
                timestamp: Date.now(),
                transactionId: this.generateTransactionId()
            };

            // Start NFC scanning
            return new Promise((resolve, reject) => {
                this.nfcHandler.startScan(async (nfcData) => {
                    try {
                        const result = await this.processPayment(nfcData);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    } finally {
                        this.cleanupTransaction();
                    }
                });
            });
        } catch (error) {
            this.cleanupTransaction();
            throw error;
        }
    }

    async processPayment(nfcData) {
        try {
            // Verify the card and get balance
            const cardVerification = await this.verifyCard(nfcData);
            
            if (!cardVerification.active) {
                throw new Error('Card is inactive');
            }

            // Additional security checks
            if (this.currentTransaction.amount > cardVerification.transaction_limit) {
                throw new Error('Transaction amount exceeds limit');
            }

            if (Date.now() - new Date(cardVerification.last_used).getTime() < 2000) {
                throw new Error('Duplicate transaction detected');
            }

            if (cardVerification.balance < this.currentTransaction.amount) {
                throw new Error('Insufficient balance');
            }

            // Process the transaction
            const transactionResult = await this.executeTransaction(nfcData, cardVerification);
            
            // Verify transaction success
            const verificationResult = await this.verifyTransaction(transactionResult.transactionId);
            
            if (!verificationResult.success) {
                throw new Error('Transaction verification failed');
            }

            return {
                success: true,
                transactionId: transactionResult.transactionId,
                amount: this.currentTransaction.amount,
                timestamp: new Date().toISOString(),
                cardId: cardVerification.cardId,
                newBalance: transactionResult.newBalance
            };
        } catch (error) {
            console.error('Payment processing error:', error);
            throw error;
        }
    }

    async verifyCard(nfcData) {
        const response = await axios.post('/api/cards/verify/', {
            nfc_data: nfcData,
            transaction_id: this.currentTransaction.transactionId
        }, {
            headers: this.authManager.getAuthHeaders()
        });

        return response.data;
    }

    async executeTransaction(nfcData, cardVerification) {
        const transactionData = {
            nfc_data: nfcData,
            transaction_id: this.currentTransaction.transactionId,
            amount: this.currentTransaction.amount,
            outlet_id: this.currentTransaction.outletId,
            card_id: cardVerification.cardId,
            timestamp: this.currentTransaction.timestamp
        };

        const response = await axios.post('/api/transactions/process/', transactionData, {
            headers: this.authManager.getAuthHeaders()
        });

        return response.data;
    }

    async verifyTransaction(transactionId) {
        const response = await axios.get(`/api/transactions/verify/${transactionId}/`, {
            headers: this.authManager.getAuthHeaders()
        });

        return response.data;
    }

    generateTransactionId() {
        return 'TXN' + Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    cleanupTransaction() {
        this.transactionInProgress = false;
        this.currentTransaction = null;
        this.nfcHandler.stopScan();
    }

    async getTransactionHistory(cardId) {
        try {
            const response = await axios.get(`/api/transactions/history/${cardId}/`, {
                headers: this.authManager.getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching transaction history:', error);
            throw error;
        }
    }

    async getCardBalance(cardId) {
        try {
            const response = await axios.get(`/api/cards/${cardId}/balance/`, {
                headers: this.authManager.getAuthHeaders()
            });
            return response.data.balance;
        } catch (error) {
            console.error('Error fetching card balance:', error);
            throw error;
        }
    }
}

// Payment UI Handler
class PaymentUIHandler {
    constructor(paymentProcessor) {
        this.paymentProcessor = paymentProcessor;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Payment form submission
        const paymentForm = document.getElementById('paymentForm');
        if (paymentForm) {
            paymentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handlePaymentSubmission();
            });
        }

        // Amount input validation
        const amountInput = document.getElementById('amount');
        if (amountInput) {
            amountInput.addEventListener('input', (e) => {
                this.validateAmount(e.target.value);
            });
        }
    }

    async handlePaymentSubmission() {
        const amount = parseFloat(document.getElementById('amount').value);
        const outletId = document.getElementById('outletId').value;
        
        if (!this.validateAmount(amount)) {
            return;
        }

        try {
            this.showProcessingUI();
            const result = await this.paymentProcessor.startPayment(amount, outletId);
            this.showSuccessUI(result);
        } catch (error) {
            this.showErrorUI(error);
        }
    }

    validateAmount(amount) {
        if (isNaN(amount) || amount <= 0) {
            this.showError('Please enter a valid amount');
            return false;
        }
        return true;
    }

    showProcessingUI() {
        const statusElement = document.getElementById('paymentStatus');
        if (statusElement) {
            statusElement.className = 'alert alert-info';
            statusElement.textContent = 'Processing payment... Please hold the NFC card steady.';
        }
    }

    showSuccessUI(result) {
        const statusElement = document.getElementById('paymentStatus');
        if (statusElement) {
            statusElement.className = 'alert alert-success';
            statusElement.innerHTML = `
                Payment Successful!<br>
                Amount: ₹${result.amount}<br>
                Transaction ID: ${result.transactionId}<br>
                New Balance: ₹${result.newBalance}
            `;
        }

        // Update transaction history if available
        this.updateTransactionHistory();
    }

    showErrorUI(error) {
        const statusElement = document.getElementById('paymentStatus');
        if (statusElement) {
            statusElement.className = 'alert alert-danger';
            statusElement.textContent = `Payment failed: ${error.message}`;
        }
    }

    async updateTransactionHistory() {
        const historyContainer = document.getElementById('transactionHistory');
        if (!historyContainer) return;

        try {
            const cardId = document.getElementById('cardId').value;
            const transactions = await this.paymentProcessor.getTransactionHistory(cardId);
            
            historyContainer.innerHTML = transactions.map(transaction => `
                <tr>
                    <td>${new Date(transaction.timestamp).toLocaleString()}</td>
                    <td>₹${transaction.amount}</td>
                    <td>${transaction.type}</td>
                    <td>${transaction.status}</td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error updating transaction history:', error);
        }
    }
}

// Initialize payment processor and UI handler when document is ready
document.addEventListener('DOMContentLoaded', () => {
    const paymentProcessor = new NFCPaymentProcessor();
    const paymentUI = new PaymentUIHandler(paymentProcessor);
    
    // Make instances available globally
    window.paymentProcessor = paymentProcessor;
    window.paymentUI = paymentUI;
});

// NFC Payment Handling

let nfcReader = null;
let isReading = false;

// Initialize NFC reader
async function initNFC() {
    if (!('NDEFReader' in window)) {
        showNFCStatus('NFC is not supported on this device', 'error');
        return;
    }

    try {
        nfcReader = new NDEFReader();
        await nfcReader.scan();
        showNFCStatus('Ready to read NFC card', 'ready');
    } catch (error) {
        showNFCStatus('Error initializing NFC reader', 'error');
        console.error('NFC initialization error:', error);
    }
}

// Start NFC payment process
async function startNFCPayment() {
    const amount = document.getElementById('amount').value;
    const description = document.getElementById('description')?.value || '';

    if (!amount || amount <= 0) {
        showErrorMessage('Please enter a valid amount');
        return;
    }

    if (!nfcReader) {
        await initNFC();
    }

    showPaymentModal();
    isReading = true;

    try {
        nfcReader.onreading = event => handleNFCReading(event, amount, description);
        showNFCStatus('Please tap the card', 'waiting');
    } catch (error) {
        showNFCStatus('Error starting NFC reader', 'error');
        console.error('NFC reading error:', error);
    }
}

// Handle NFC card reading
async function handleNFCReading(event, amount, description) {
    if (!isReading) return;
    isReading = false;

    showNFCStatus('Processing payment...', 'processing');

    try {
        const cardData = await parseNFCData(event.message);
        const response = await processPayment(cardData, amount, description);
        
        if (response.ok) {
            const result = await response.json();
            showPaymentResult(true, {
                amount: amount,
                cardId: cardData.cardId,
                transactionId: result.transaction_id
            });
        } else {
            throw new Error('Payment processing failed');
        }
    } catch (error) {
        showPaymentResult(false, { error: error.message });
        console.error('Payment error:', error);
    }
}

// Parse NFC card data
async function parseNFCData(message) {
    // Implement secure card data parsing
    // This is a placeholder - actual implementation would depend on your card data format
    return {
        cardId: message.records[0].data,
        secureKey: message.records[1].data
    };
}

// Process payment with backend
async function processPayment(cardData, amount, description) {
    return fetch('/api/transactions/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
            transaction_type: 'payment',
            amount: parseFloat(amount),
            card_id: cardData.cardId,
            secure_key: cardData.secureKey,
            description: description
        })
    });
}

// UI Functions
function showPaymentModal() {
    const modal = document.getElementById('paymentModal');
    modal.style.display = 'block';
    document.querySelector('.payment-processing').style.display = 'block';
    document.querySelector('.payment-result').style.display = 'none';
}

function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    modal.style.display = 'none';
    isReading = false;
}

function showPaymentResult(success, data) {
    const resultDiv = document.querySelector('.payment-result');
    const processingDiv = document.querySelector('.payment-processing');
    
    processingDiv.style.display = 'none';
    resultDiv.style.display = 'block';

    const statusSpan = resultDiv.querySelector('.status');
    const resultIcon = resultDiv.querySelector('.result-icon');

    if (success) {
        statusSpan.textContent = 'Successful';
        statusSpan.className = 'status success';
        resultIcon.className = 'result-icon success';
        
        resultDiv.querySelector('.amount').textContent = data.amount;
        resultDiv.querySelector('.card-id').textContent = data.cardId;
        resultDiv.querySelector('.transaction-id').textContent = data.transactionId;
    } else {
        statusSpan.textContent = 'Failed';
        statusSpan.className = 'status error';
        resultIcon.className = 'result-icon error';
        
        const details = resultDiv.querySelector('.details');
        details.innerHTML = `<p class="error-message">${data.error}</p>`;
    }
}

function showNFCStatus(message, status) {
    const statusDiv = document.getElementById('nfcStatus');
    if (!statusDiv) return;

    const icon = statusDiv.querySelector('.status-icon');
    const text = statusDiv.querySelector('span');

    icon.className = `status-icon ${status}`;
    text.textContent = message;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initNFC);
