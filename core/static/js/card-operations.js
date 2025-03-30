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
        this.scanCardBtn = document.getElementById('scanCardBtn');
        this.nfcCardId = null;
        
        // Initialize immediately
        this.initialize();
        
        // Load cards immediately
        if (this.cardList) {
            this.loadCards();
        }
    }

    initialize() {
        // Initialize issue card form
        if (this.issueCardForm) {
            this.issueCardForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.issueCard();
            });
        }

        // Initialize scan card buttons
        if (this.scanCardBtn) {
            this.scanCardBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.scanNfcCard();
            });
        }

        // Initialize scan topup card button
        const scanTopupCardBtn = document.getElementById('scanTopupCardBtn');
        if (scanTopupCardBtn) {
            scanTopupCardBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.scanTopupCard();
            });
        }

        // Initialize top-up form
        if (this.topupForm) {
            this.topupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.topupCard();
            });
        }

        // Initialize balance buttons with touchstart and click events
        const balanceButtons = document.querySelectorAll('.balance-btn');
        if (balanceButtons.length > 0) {
            balanceButtons.forEach(button => {
                const handleBalanceButtonAction = () => {
                    console.log('Balance button clicked');
                    const clickedAmount = parseInt(button.getAttribute('data-amount'));
                    const initialBalanceInput = document.getElementById('initialBalance');
                    const selectedBalanceText = document.getElementById('selectedBalance');
                    
                    // Get current amount or default to 0
                    let currentAmount = initialBalanceInput ? parseInt(initialBalanceInput.value) || 0 : 0;
                    
                    // Add the clicked amount to the current amount
                    const newAmount = currentAmount + clickedAmount;
                    console.log(`Adding ${clickedAmount} to balance. New total: ${newAmount}`);
                    
                    // Update the hidden input value
                    if (initialBalanceInput) {
                        initialBalanceInput.value = newAmount;
                    }
                    
                    // Update the selected amount text
                    if (selectedBalanceText) {
                        selectedBalanceText.textContent = `Selected: ₹${newAmount}`;
                    }
                    
                    // Highlight the selected button
                    button.classList.remove('bg-gray-200', 'text-gray-800');
                    button.classList.add('bg-blue-200', 'text-blue-800');
                    
                    // After a short delay, reset the button highlight
                    setTimeout(() => {
                        button.classList.remove('bg-blue-200', 'text-blue-800');
                        button.classList.add('bg-gray-200', 'text-gray-800');
                    }, 300);
                };
                
                // Add both click and touchstart events for better mobile support
                button.addEventListener('click', handleBalanceButtonAction);
                button.addEventListener('touchstart', function(e) {
                    e.preventDefault(); // Prevent default touch behavior
                    handleBalanceButtonAction();
                });
            });
        }

        // Initialize topup buttons with touchstart and click events
        const topupButtons = document.querySelectorAll('.topup-btn');
        if (topupButtons.length > 0) {
            topupButtons.forEach(button => {
                const handleTopupButtonAction = () => {
                    console.log('Topup button clicked');
                    const clickedAmount = parseInt(button.getAttribute('data-amount'));
                    const topupAmountInput = document.getElementById('topupAmount');
                    const selectedTopupAmountText = document.getElementById('selectedTopupAmount');
                    
                    // Get current amount or default to 0
                    let currentAmount = topupAmountInput ? parseInt(topupAmountInput.value) || 0 : 0;
                    
                    // Add the clicked amount to the current amount
                    const newAmount = currentAmount + clickedAmount;
                    console.log(`Adding ${clickedAmount} to topup. New total: ${newAmount}`);
                    
                    // Update the hidden input value
                    if (topupAmountInput) {
                        topupAmountInput.value = newAmount;
                    }
                    
                    // Update the selected amount text
                    if (selectedTopupAmountText) {
                        selectedTopupAmountText.textContent = `Selected: ₹${newAmount}`;
                    }
                    
                    // Highlight the selected button
                    button.classList.remove('bg-gray-200', 'text-gray-800');
                    button.classList.add('bg-blue-200', 'text-blue-800');
                    
                    // After a short delay, reset the button highlight
                    setTimeout(() => {
                        button.classList.remove('bg-blue-200', 'text-blue-800');
                        button.classList.add('bg-gray-200', 'text-gray-800');
                    }, 300);
                };
                
                // Add both click and touchstart events for better mobile support
                button.addEventListener('click', handleTopupButtonAction);
                button.addEventListener('touchstart', function(e) {
                    e.preventDefault(); // Prevent default touch behavior
                    handleTopupButtonAction();
                });
            });
        }

        // Load cards for dropdown and list
        this.loadCards();
    }

    // Helper method to get cookie by name
    getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    async loadCards() {
        try {
            console.log('Loading cards...');
            
            // Get the CSRF token from the cookie
            const csrftoken = this.getCookie('csrftoken');
            // Get the access token from localStorage
            const accessToken = localStorage.getItem('access_token');
            
            const response = await fetch('/api/cards/', {
                headers: {
                    'X-CSRFToken': csrftoken,
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                credentials: 'same-origin' // Include cookies in the request
            });

            if (!response.ok) {
                throw new Error(`Failed to load cards: ${response.status} ${response.statusText}`);
            }

            const cards = await response.json();
            console.log('Cards loaded:', cards);
            
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
                    <div class="bg-gray-50 rounded-lg p-5 border border-gray-200 mb-5">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <div class="mb-4 sm:mb-0">
                                <h4 class="text-xl font-medium text-gray-900">${card.card_id}</h4>
                                <p class="text-base text-gray-600 mt-2">
                                    <span class="font-medium">Customer:</span> ${card.customer_name || 'N/A'} 
                                    ${card.customer_mobile ? `<br><span class="font-medium">Mobile:</span> ${card.customer_mobile}` : ''}
                                </p>
                                <p class="text-base text-gray-600 mt-2">
                                    <span class="font-medium">Balance:</span> <span class="text-lg">₹${card.balance}</span>
                                </p>
                                <p class="text-base text-gray-600 mt-2">
                                    <span class="font-medium">Status:</span> 
                                    <span class="${card.active ? 'text-green-600' : 'text-red-600'} font-medium">
                                        ${card.active ? 'Active' : 'Inactive'}
                                    </span>
                                </p>
                            </div>
                            <div>
                                <button class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors card-topup-btn text-lg font-medium" data-card-id="${card.id}">
                                    Top-up
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');

                // Add event listeners to top-up buttons
                document.querySelectorAll('.card-topup-btn').forEach(button => {
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
            if (this.cardList) {
                this.cardList.innerHTML = `<p class="text-red-500 text-center py-4">Error loading cards: ${error.message}</p>`;
            }
            this.showStatus('Failed to load cards: ' + error.message, 'error');
        }
    }

    async scanNfcCard() {
        try {
            // Check if Web NFC API is available
            if (!('NDEFReader' in window)) {
                console.log('Web NFC API not available');
                this.handleNfcScanFallback();
                return;
            }

            this.showStatus('Waiting for NFC card...', 'info');
            
            try {
                const reader = new NDEFReader();
                console.log('Requesting NFC permission...');
                await reader.scan();
                console.log('NFC permission granted, scanning...');

                reader.onreading = ({ message, serialNumber }) => {
                    console.log('NFC card detected:', serialNumber);
                    this.nfcCardId = serialNumber;
                    this.showStatus(`NFC card scanned successfully! Card ID: ${serialNumber}`, 'success');
                    
                    // Update the hidden input field with the NFC card ID
                    const nfcCardIdInput = document.getElementById('nfcCardId');
                    if (nfcCardIdInput) {
                        nfcCardIdInput.value = serialNumber;
                    }
                    
                    reader.stop();
                };

                reader.onreadingerror = (event) => {
                    console.error('Reading error:', event);
                    this.showStatus('Error reading NFC card. Please try again.', 'error');
                };
            } catch (nfcError) {
                console.error('NFC error:', nfcError);
                
                // Check if the error is due to user permissions
                if (nfcError.name === 'NotAllowedError') {
                    this.showStatus('NFC permission denied. Please allow NFC access and try again.', 'error');
                } else if (nfcError.name === 'NotSupportedError') {
                    this.showStatus('NFC is not supported on this device or browser.', 'error');
                    this.handleNfcScanFallback();
                } else {
                    this.showStatus(`NFC error: ${nfcError.message}. Try manual entry.`, 'error');
                    this.handleNfcScanFallback();
                }
            }
        } catch (error) {
            console.error('General error:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
            this.handleNfcScanFallback();
        }
    }
    
    handleNfcScanFallback() {
        // Create a modal or form for manual card ID entry
        const cardIdInput = prompt('NFC not available. Please enter the card ID manually:');
        
        if (cardIdInput && cardIdInput.trim() !== '') {
            this.nfcCardId = cardIdInput;
            this.showStatus(`Card ID entered manually: ${cardIdInput}`, 'success');
            
            // Update the hidden input field with the manually entered card ID
            const nfcCardIdInput = document.getElementById('nfcCardId');
            if (nfcCardIdInput) {
                nfcCardIdInput.value = cardIdInput;
            }
        } else {
            this.showStatus('Card ID entry cancelled', 'info');
        }
    }

    async scanTopupCard() {
        try {
            // Check if Web NFC API is available
            if (!('NDEFReader' in window)) {
                console.log('Web NFC API not available for topup scan');
                this.handleTopupScanFallback();
                return;
            }

            this.showStatus('Waiting for NFC card...', 'info');
            
            try {
                const reader = new NDEFReader();
                console.log('Requesting NFC permission for topup...');
                await reader.scan();
                console.log('NFC permission granted for topup, scanning...');

                reader.onreading = async ({ message, serialNumber }) => {
                    console.log('NFC card detected for topup:', serialNumber);
                    this.showStatus(`NFC card scanned successfully! Looking up card...`, 'info');
                    
                    try {
                        await this.findAndSelectCard(serialNumber);
                    } catch (error) {
                        console.error('Error finding card:', error);
                        this.showStatus(`Error finding card: ${error.message}`, 'error');
                    }
                    
                    reader.stop();
                };

                reader.onreadingerror = (event) => {
                    console.error('Reading error:', event);
                    this.showStatus('Error reading NFC card. Please try again.', 'error');
                };
            } catch (nfcError) {
                console.error('NFC error during topup scan:', nfcError);
                
                // Check if the error is due to user permissions
                if (nfcError.name === 'NotAllowedError') {
                    this.showStatus('NFC permission denied. Please allow NFC access and try again.', 'error');
                } else if (nfcError.name === 'NotSupportedError') {
                    this.showStatus('NFC is not supported on this device or browser.', 'error');
                    this.handleTopupScanFallback();
                } else {
                    this.showStatus(`NFC error: ${nfcError.message}. Try manual entry.`, 'error');
                    this.handleTopupScanFallback();
                }
            }
        } catch (error) {
            console.error('General error during topup scan:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
            this.handleTopupScanFallback();
        }
    }
    
    async findAndSelectCard(cardId) {
        // Find the card by secure key (NFC ID)
        const response = await fetch('/api/cards/', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load cards');
        }
        
        const cards = await response.json();
        const matchingCard = cards.find(card => card.secure_key === cardId);
        
        if (matchingCard) {
            // Select the card in the dropdown
            if (this.cardSelect) {
                this.cardSelect.value = matchingCard.id;
                this.showStatus(`Card found: ${matchingCard.card_id} - ${matchingCard.customer_name || 'Unknown'}`, 'success');
            } else {
                this.showStatus('Card select dropdown not found', 'error');
            }
        } else {
            this.showStatus('No matching card found for this NFC tag', 'error');
        }
    }
    
    handleTopupScanFallback() {
        // Create a modal or form for manual card ID entry
        const cardIdInput = prompt('NFC not available. Please enter the card ID manually:');
        
        if (cardIdInput && cardIdInput.trim() !== '') {
            this.showStatus(`Looking up card with ID: ${cardIdInput}...`, 'info');
            
            // Find and select the card with the manually entered ID
            this.findAndSelectCard(cardIdInput)
                .catch(error => {
                    this.showStatus(`Error finding card: ${error.message}`, 'error');
                });
        } else {
            this.showStatus('Card ID entry cancelled', 'info');
        }
    }

    async issueCard() {
        try {
            const customerName = document.getElementById('customerName').value;
            const customerMobile = document.getElementById('customerMobile').value;
            const initialBalance = document.getElementById('initialBalance').value;
            const userId = document.getElementById('userId').value;
            const nfcCardId = document.getElementById('nfcCardId')?.value || this.nfcCardId;

            if (!customerName || !customerMobile) {
                this.showStatus('Please enter customer name and mobile number', 'error');
                return;
            }

            if (!nfcCardId) {
                this.showStatus('Please scan an NFC card first', 'error');
                return;
            }

            if (!initialBalance || initialBalance === '0') {
                this.showStatus('Please select an initial balance amount', 'error');
                return;
            }

            this.showStatus('Issuing card...', 'info');

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
                    user_id: userId,
                    nfc_card_id: nfcCardId
                })
            });

            const result = await response.json();

            if (response.ok) {
                this.showStatus(`Card issued successfully! Card ID: ${result.card_id}`, 'success');
                this.issueCardForm.reset();
                
                // Reset the selected balance text
                const selectedBalanceText = document.getElementById('selectedBalance');
                if (selectedBalanceText) {
                    selectedBalanceText.textContent = 'Selected: ₹0';
                }
                
                // Clear the NFC card ID
                this.nfcCardId = null;
                const nfcCardIdInput = document.getElementById('nfcCardId');
                if (nfcCardIdInput) {
                    nfcCardIdInput.value = '';
                }
                
                // Refresh card list with a slight delay to ensure the API has updated
                setTimeout(() => {
                    this.loadCards();
                }, 500);
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

            if (!amount || amount === '0') {
                this.showStatus('Please select a top-up amount', 'error');
                return;
            }

            this.showStatus('Processing top-up...', 'info');

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
                
                // Reset the selected topup amount text
                const selectedTopupAmountText = document.getElementById('selectedTopupAmount');
                if (selectedTopupAmountText) {
                    selectedTopupAmountText.textContent = 'Selected: ₹0';
                }
                
                // Refresh card list with a slight delay to ensure the API has updated
                setTimeout(() => {
                    this.loadCards();
                }, 500);
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
