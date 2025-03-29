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
            
            const initialBalance = parseFloat(document.getElementById('initialBalance').value);

            if (isNaN(initialBalance) || initialBalance < 0) {
                throw new Error('Invalid initial balance');
            }

            this.operationInProgress = true;
            this.currentOperation = {
                type: 'issuance',
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

// Card Operations Management

// Card Listing
async function loadUserCards() {
    try {
        const response = await fetch('/api/cards/', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load cards');
        
        const cards = await response.json();
        displayCards(cards);
    } catch (error) {
        showErrorMessage('Failed to load cards: ' + error.message);
    }
}

function displayCards(cards) {
    const cardContainer = document.getElementById('cardList');
    if (!cardContainer) return;

    cardContainer.innerHTML = '';
    
    cards.forEach(card => {
        const cardElement = createCardElement(card);
        cardContainer.appendChild(cardElement);
    });
}

function createCardElement(card) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card-item';
    cardDiv.innerHTML = `
        <div class="card-header">
            <h3>Card ID: ${card.card_id}</h3>
            <span class="status ${card.is_active ? 'active' : 'inactive'}">
                ${card.is_active ? 'Active' : 'Inactive'}
            </span>
        </div>
        <div class="card-body">
            <p>Balance: ₹${card.balance.toFixed(2)}</p>
            <p>Daily Limit: ₹${card.daily_limit.toFixed(2)}</p>
            <p>Transaction Limit: ₹${card.transaction_limit.toFixed(2)}</p>
            <p>Expiry: ${new Date(card.expiry_date).toLocaleDateString()}</p>
        </div>
        <div class="card-actions">
            ${card.is_active ? 
                `<button onclick="deactivateCard('${card.card_id}')" class="btn-danger">Deactivate</button>` :
                `<button onclick="activateCard('${card.card_id}')" class="btn-success">Activate</button>`
            }
            <button onclick="showUpdateLimitsModal('${card.card_id}')" class="btn-primary">Update Limits</button>
        </div>
    `;
    return cardDiv;
}

// Card Activation/Deactivation
async function activateCard(cardId) {
    await updateCardStatus(cardId, true);
}

async function deactivateCard(cardId) {
    if (!confirm('Are you sure you want to deactivate this card?')) return;
    await updateCardStatus(cardId, false);
}

async function updateCardStatus(cardId, isActive) {
    try {
        const response = await fetch(`/api/cards/${cardId}/status/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({ is_active: isActive })
        });

        if (!response.ok) throw new Error('Failed to update card status');
        
        showSuccessMessage(`Card successfully ${isActive ? 'activated' : 'deactivated'}`);
        await loadUserCards(); // Refresh card list
    } catch (error) {
        showErrorMessage('Failed to update card status: ' + error.message);
    }
}

// Card Limits Management
function showUpdateLimitsModal(cardId) {
    const modal = document.getElementById('updateLimitsModal');
    modal.style.display = 'block';
    modal.dataset.cardId = cardId;
}

async function updateCardLimits(event) {
    event.preventDefault();
    const modal = document.getElementById('updateLimitsModal');
    const cardId = modal.dataset.cardId;
    
    const dailyLimit = document.getElementById('dailyLimit').value;
    const transactionLimit = document.getElementById('transactionLimit').value;

    try {
        const response = await fetch(`/api/cards/${cardId}/limits/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
                daily_limit: parseFloat(dailyLimit),
                transaction_limit: parseFloat(transactionLimit)
            })
        });

        if (!response.ok) throw new Error('Failed to update card limits');
        
        showSuccessMessage('Card limits updated successfully');
        modal.style.display = 'none';
        await loadUserCards(); // Refresh card list
    } catch (error) {
        showErrorMessage('Failed to update card limits: ' + error.message);
    }
}

// Card Issue Request (Admin Only)
async function requestNewCard(userId) {
    try {
        const response = await fetch('/api/cards/issue/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
                user_id: userId,
                daily_limit: 1000, // Default daily limit
                transaction_limit: 500 // Default transaction limit
            })
        });

        if (!response.ok) throw new Error('Failed to issue new card');
        
        const result = await response.json();
        showSuccessMessage('New card issued successfully');
        return result.card_id;
    } catch (error) {
        showErrorMessage('Failed to issue new card: ' + error.message);
        throw error;
    }
}

// Utility Functions
function showSuccessMessage(message) {
    const messageDiv = document.getElementById('messageContainer');
    if (!messageDiv) return;
    
    messageDiv.innerHTML = `<div class="alert alert-success">${message}</div>`;
    setTimeout(() => messageDiv.innerHTML = '', 3000);
}

function showErrorMessage(message) {
    const messageDiv = document.getElementById('messageContainer');
    if (!messageDiv) return;
    
    messageDiv.innerHTML = `<div class="alert alert-danger">${message}</div>`;
    setTimeout(() => messageDiv.innerHTML = '', 5000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadUserCards();
    
    // Setup modal close buttons
    document.querySelectorAll('.modal .close').forEach(button => {
        button.onclick = () => {
            button.closest('.modal').style.display = 'none';
        };
    });

    // Close modal when clicking outside
    window.onclick = event => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };

    // Setup limits form submission
    const limitsForm = document.getElementById('updateLimitsForm');
    if (limitsForm) {
        limitsForm.onsubmit = updateCardLimits;
    }
});
