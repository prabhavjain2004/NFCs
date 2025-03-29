class CardOperationsHandler {
    constructor() {
        this.nfcHandler = window.nfcHandler;
        this.authManager = window.authManager;
        this.rateLimiter = window.rateLimiter;
        this.operationInProgress = false;
        this.currentOperation = null;
    }

    async initialize() {
        try {
            await this.nfcHandler.initialize();
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize card operations:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Issue Card Form
        const issueCardForm = document.getElementById('issueCardForm');
        if (issueCardForm) {
            issueCardForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleCardIssuance();
            });
        }

        // Recharge Form
        const rechargeForm = document.getElementById('rechargeForm');
        if (rechargeForm) {
            rechargeForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleCardRecharge();
            });
        }
    }

    async handleCardIssuance() {
        if (this.operationInProgress) {
            throw new Error('An operation is already in progress');
        }

        try {
            await this.rateLimiter.checkLimit();
            
            const customerId = document.getElementById('customerSelect').value;
            const initialBalance = parseFloat(document.getElementById('initialBalance').value);

            if (!customerId || isNaN(initialBalance) || initialBalance < 0) {
                throw new Error('Invalid input parameters');
            }

            this.operationInProgress = true;
            this.currentOperation = {
                type: 'issuance',
                customerId: customerId,
                initialBalance: initialBalance,
                operationId: this.generateOperationId()
            };

            await this.performTwoStepCardOperation(
                this.processFirstScanIssuance.bind(this),
                this.processSecondScanIssuance.bind(this)
            );

        } catch (error) {
            this.showError('Card issuance failed: ' + error.message);
            throw error;
        } finally {
            this.cleanupOperation();
        }
    }

    async handleCardRecharge() {
        if (this.operationInProgress) {
            throw new Error('An operation is already in progress');
        }

        try {
            await this.rateLimiter.checkLimit();
            
            const amount = parseFloat(document.getElementById('rechargeAmount').value);

            if (isNaN(amount) || amount <= 0) {
                throw new Error('Invalid recharge amount');
            }

            this.operationInProgress = true;
            this.currentOperation = {
                type: 'recharge',
                amount: amount,
                operationId: this.generateOperationId()
            };

            await this.performTwoStepCardOperation(
                this.processFirstScanRecharge.bind(this),
                this.processSecondScanRecharge.bind(this)
            );

        } catch (error) {
            this.showError('Card recharge failed: ' + error.message);
            throw error;
        } finally {
            this.cleanupOperation();
        }
    }

    async performTwoStepCardOperation(firstScanHandler, secondScanHandler) {
        // First scan
        this.updateStatus('Please tap the card for first scan...', 'info');
        const firstScanData = await this.waitForNFCScan();
        const firstScanResult = await firstScanHandler(firstScanData);

        // Second scan
        this.updateStatus('Please tap the card again to confirm...', 'info');
        const secondScanData = await this.waitForNFCScan();
        const finalResult = await secondScanHandler(secondScanData, firstScanResult);

        this.showSuccess(finalResult.message);
        return finalResult;
    }

    async waitForNFCScan() {
        return new Promise((resolve, reject) => {
            this.nfcHandler.startScan(async (nfcData) => {
                try {
                    resolve(nfcData);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    async processFirstScanIssuance(nfcData) {
        const response = await axios.post('/api/cards/issue/first-scan/', {
            nfc_data: nfcData,
            customer_id: this.currentOperation.customerId,
            initial_balance: this.currentOperation.initialBalance,
            operation_id: this.currentOperation.operationId
        }, {
            headers: this.authManager.getAuthHeaders()
        });

        return response.data;
    }

    async processSecondScanIssuance(nfcData, firstScanResult) {
        const response = await axios.post('/api/cards/issue/confirm/', {
            nfc_data: nfcData,
            operation_id: this.currentOperation.operationId,
            first_scan_data: firstScanResult
        }, {
            headers: this.authManager.getAuthHeaders()
        });

        return response.data;
    }

    async processFirstScanRecharge(nfcData) {
        const response = await axios.post('/api/cards/recharge/first-scan/', {
            nfc_data: nfcData,
            amount: this.currentOperation.amount,
            operation_id: this.currentOperation.operationId
        }, {
            headers: this.authManager.getAuthHeaders()
        });

        // Update UI with card details
        const cardDetails = response.data.card_details;
        document.getElementById('cardId').textContent = cardDetails.card_id;
        document.getElementById('cardCustomer').textContent = cardDetails.customer_name;
        document.getElementById('currentBalance').textContent = cardDetails.current_balance;
        document.getElementById('cardDetails').classList.remove('d-none');

        return response.data;
    }

    async processSecondScanRecharge(nfcData, firstScanResult) {
        const response = await axios.post('/api/cards/recharge/confirm/', {
            nfc_data: nfcData,
            operation_id: this.currentOperation.operationId,
            first_scan_data: firstScanResult
        }, {
            headers: this.authManager.getAuthHeaders()
        });

        return response.data;
    }

    generateOperationId() {
        return 'OP' + Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    updateStatus(message, type = 'info') {
        const statusElement = document.getElementById(`${this.currentOperation.type}Status`);
        if (statusElement) {
            statusElement.className = `alert alert-${type}`;
            statusElement.textContent = message;
            statusElement.classList.remove('d-none');
        }
    }

    showSuccess(message) {
        this.updateStatus(message, 'success');
        this.refreshOperationsList();
    }

    showError(message) {
        this.updateStatus(message, 'danger');
    }

    async refreshOperationsList() {
        try {
            const response = await axios.get('/api/cards/operations/', {
                headers: this.authManager.getAuthHeaders()
            });

            const tbody = document.getElementById('recentOperations');
            if (tbody) {
                tbody.innerHTML = response.data.map(op => `
                    <tr>
                        <td>${new Date(op.timestamp).toLocaleString()}</td>
                        <td>${op.operation_type}</td>
                        <td>${op.card_id}</td>
                        <td>${op.customer}</td>
                        <td>₹${op.amount}</td>
                        <td>
                            <span class="badge bg-${op.status === 'completed' ? 'success' : 'danger'}">
                                ${op.status}
                            </span>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (error) {
            console.error('Error refreshing operations list:', error);
        }
    }

    cleanupOperation() {
        this.operationInProgress = false;
        this.currentOperation = null;
        this.nfcHandler.stopScan();
    }

    // Utility method to validate card status
    async validateCardStatus(cardId) {
        try {
            const response = await axios.get(`/api/cards/${cardId}/status/`, {
                headers: this.authManager.getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('Error validating card status:', error);
            throw error;
        }
    }

    // Method to handle card activation/deactivation
    async toggleCardStatus(cardId, currentStatus) {
        try {
            await this.rateLimiter.checkLimit();
            
            const response = await axios.post(`/api/cards/${cardId}/toggle/`, {
                active: !currentStatus
            }, {
                headers: this.authManager.getAuthHeaders()
            });

            this.showSuccess(`Card successfully ${response.data.active ? 'activated' : 'deactivated'}`);
            return response.data;
        } catch (error) {
            this.showError('Failed to toggle card status: ' + error.message);
            throw error;
        }
    }
}

// Initialize card operations handler when document is ready
document.addEventListener('DOMContentLoaded', () => {
    const cardOperations = new CardOperationsHandler();
    cardOperations.initialize().catch(error => {
        console.error('Failed to initialize card operations:', error);
    });

    // Make instance available globally
    window.cardOperations = cardOperations;
});
