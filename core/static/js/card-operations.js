/**
 * Card Operations Handler
 * Handles NFC card issuance and top-up operations
 */
class CardOperationsHandler {
    constructor() {
        this.issueCardForm = document.getElementById('issueCardForm');
        this.topupForm = document.getElementById('topupForm');
        this.operationStatus = document.getElementById('operationStatus');
        this.cardSelect = document.getElementById('cardSelect');
        this.cardList = document.getElementById('cardList');
        
        this.initialize();
    }

    initialize() {
        // Initialize issue card form
        if (this.issueCardForm) {
            this.issueCardForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.issueCard();
            });
        }

        // Initialize top-up form
        if (this.topupForm) {
            this.topupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.topupCard();
            });
        }

        // Load cards for dropdown and list
        this.loadCards();
    }

    async loadCards() {
        try {
            const response = await fetch('/api/cards/', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load cards');
            }

            const cards = await response.json();
            
            // Populate card select dropdown
            if (this.cardSelect) {
                this.cardSelect.innerHTML = '<option value="">Select a card</option>';
                cards.forEach(card => {
                    const option = document.createElement('option');
                    option.value = card.id;
                    option.textContent = `${card.card_id} - ${card.customer_name || 'Unknown'} - ₹${card.balance}`;
                    this.cardSelect.appendChild(option);
                });
            }

            // Populate card list
            if (this.cardList) {
                if (cards.length === 0) {
                    this.cardList.innerHTML = '<p class="text-gray-500 text-center py-4">No cards found</p>';
                    return;
                }

                this.cardList.innerHTML = cards.map(card => `
                    <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div class="flex justify-between items-center">
                            <div>
                                <h4 class="text-lg font-medium text-gray-900">${card.card_id}</h4>
                                <p class="text-sm text-gray-600">
                                    <span class="font-medium">Customer:</span> ${card.customer_name || 'N/A'} 
                                    ${card.customer_mobile ? `(${card.customer_mobile})` : ''}
                                </p>
                                <p class="text-sm text-gray-600">
                                    <span class="font-medium">Balance:</span> ₹${card.balance}
                                </p>
                                <p class="text-sm text-gray-600">
                                    <span class="font-medium">Status:</span> 
                                    <span class="${card.active ? 'text-green-600' : 'text-red-600'}">
                                        ${card.active ? 'Active' : 'Inactive'}
                                    </span>
                                </p>
                            </div>
                            <div>
                                <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors topup-btn" data-card-id="${card.id}">
                                    Top-up
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');

                // Add event listeners to top-up buttons
                document.querySelectorAll('.topup-btn').forEach(button => {
                    button.addEventListener('click', () => {
                        const cardId = button.getAttribute('data-card-id');
                        if (this.cardSelect) {
                            this.cardSelect.value = cardId;
                            // Scroll to top-up form
                            this.topupForm.scrollIntoView({ behavior: 'smooth' });
                        }
                    });
                });
            }
        } catch (error) {
            console.error('Error loading cards:', error);
            this.showStatus('Failed to load cards: ' + error.message, 'error');
        }
    }

    async issueCard() {
        try {
            const customerName = document.getElementById('customerName').value;
            const customerMobile = document.getElementById('customerMobile').value;
            const initialBalance = document.getElementById('initialBalance').value;
            const userId = document.getElementById('userId').value;

            if (!customerName || !customerMobile) {
                this.showStatus('Please enter customer name and mobile number', 'error');
                return;
            }

            const response = await fetch('/api/cards/issue/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    customer_name: customerName,
                    customer_mobile: customerMobile,
                    initial_balance: initialBalance,
                    user_id: userId
                })
            });

            const result = await response.json();

            if (response.ok) {
                this.showStatus(`Card issued successfully! Card ID: ${result.card_id}`, 'success');
                this.issueCardForm.reset();
                this.loadCards(); // Refresh card list
            } else {
                throw new Error(result.error || 'Failed to issue card');
            }
        } catch (error) {
            console.error('Error issuing card:', error);
            this.showStatus('Failed to issue card: ' + error.message, 'error');
        }
    }

    async topupCard() {
        try {
            const cardId = this.cardSelect.value;
            const amount = document.getElementById('topupAmount').value;

            if (!cardId) {
                this.showStatus('Please select a card', 'error');
                return;
            }

            if (!amount || parseFloat(amount) <= 0) {
                this.showStatus('Please enter a valid amount', 'error');
                return;
            }

            const response = await fetch(`/api/cards/${cardId}/topup/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    amount: amount
                })
            });

            const result = await response.json();

            if (response.ok) {
                this.showStatus(`Top-up successful! New balance: ₹${result.new_balance}`, 'success');
                this.topupForm.reset();
                this.loadCards(); // Refresh card list
            } else {
                throw new Error(result.error || 'Failed to top-up card');
            }
        } catch (error) {
            console.error('Error topping up card:', error);
            this.showStatus('Failed to top-up card: ' + error.message, 'error');
        }
    }

    showStatus(message, type = 'info') {
        if (!this.operationStatus) return;

        this.operationStatus.className = `rounded-lg p-4 mb-6 ${
            type === 'success' ? 'bg-green-100 text-green-800' : 
            type === 'error' ? 'bg-red-100 text-red-800' : 
            'bg-blue-100 text-blue-800'
        }`;
        this.operationStatus.textContent = message;
        this.operationStatus.classList.remove('hidden');

        // Auto-hide after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                this.operationStatus.classList.add('hidden');
            }, 5000);
        }
    }
}

// Initialize the card operations handler when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    const cardOperations = new CardOperationsHandler();
});
