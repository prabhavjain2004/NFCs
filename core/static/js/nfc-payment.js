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
