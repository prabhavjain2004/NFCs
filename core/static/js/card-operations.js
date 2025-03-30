/**
 * Card Operations Handler
 * Handles card issuance and top-up operations
 */
class CardOperationsHandler {
    constructor() {
        this.issueCardForm = document.getElementById('issueCardForm');
        this.topupForm = document.getElementById('topupForm');
        this.operationStatus = document.getElementById('operationStatus');
        this.cardList = document.getElementById('cardList');
        this.cardId = null;
        this.isProcessing = false;
        this.currentOperation = null; // To track which operation is in progress
        this.secondEntryPending = false; // Flag to track if we're waiting for a second entry
        
        // Initialize NFC handler
        this.nfcHandler = new NFCHandler();
        this.nfcHandler.setStatusCallback((message, type) => this.showStatus(message, type));
        this.nfcSupported = this.nfcHandler.checkNFCSupport();
        
        // Initialize immediately
        this.initialize();
        
        // Load cards immediately
        if (this.cardList) {
            this.loadCards();
        }
    }

    initialize() {
        console.log('Initializing card operations handler');
        
        // Card Issuance Button
        const cardIssuanceBtn = document.getElementById('cardIssuanceBtn');
        if (cardIssuanceBtn) {
            cardIssuanceBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Card issuance button clicked');
                this.showOperationForm('cardIssuance');
            });
        } else {
            console.error('Card issuance button not found');
        }
        
        // Top-up Button
        const topupCardBtn = document.getElementById('topupCardBtn');
        if (topupCardBtn) {
            topupCardBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Top-up button clicked');
                this.showOperationForm('topup');
            });
        } else {
            console.error('Top-up button not found');
        }
        
        // Balance Inquiry Button
        const balanceInquiryBtn = document.getElementById('balanceInquiryBtn');
        if (balanceInquiryBtn) {
            balanceInquiryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Balance inquiry button clicked');
                this.showOperationForm('balanceInquiry');
            });
        } else {
            console.error('Balance inquiry button not found');
        }
        
        // Scan Card Button (for issuance)
        const scanNewCardBtn = document.getElementById('scanNewCardBtn');
        if (scanNewCardBtn) {
            scanNewCardBtn.innerHTML = '<i class="fas fa-credit-card mr-2"></i> Scan NFC Card';
            scanNewCardBtn.addEventListener('click', () => {
                this.enterCardId('issuance');
            });
        }
        
        // Scan Card Button (for top-up)
        const scanTopupCardBtn = document.getElementById('scanTopupCardBtn');
        if (scanTopupCardBtn) {
            scanTopupCardBtn.innerHTML = '<i class="fas fa-credit-card mr-2"></i> Scan NFC Card';
            scanTopupCardBtn.addEventListener('click', () => {
                this.enterCardId('topup');
            });
        }
        
        // Scan Card Button (for balance inquiry)
        const scanBalanceCardBtn = document.getElementById('scanBalanceCardBtn');
        if (scanBalanceCardBtn) {
            scanBalanceCardBtn.innerHTML = '<i class="fas fa-credit-card mr-2"></i> Scan NFC Card';
            scanBalanceCardBtn.addEventListener('click', () => {
                this.enterCardId('balance');
            });
        }
        
        // Initialize balance buttons
        const balanceButtons = document.querySelectorAll('.balance-btn');
        balanceButtons.forEach(button => {
            button.addEventListener('click', () => {
                const amount = button.getAttribute('data-amount');
                this.selectInitialBalance(amount);
            });
        });
        
        // Initialize topup buttons
        const topupButtons = document.querySelectorAll('.topup-btn');
        topupButtons.forEach(button => {
            button.addEventListener('click', () => {
                const amount = button.getAttribute('data-amount');
                this.selectTopupAmount(amount);
            });
        });
        
        // Confirm issuance button
        const confirmIssuanceBtn = document.getElementById('confirmIssuanceBtn');
        if (confirmIssuanceBtn) {
            confirmIssuanceBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Confirm issuance button clicked');
                this.confirmIssuance();
            });
        }
        
        // Confirm topup button
        const confirmTopupBtn = document.getElementById('confirmTopupBtn');
        if (confirmTopupBtn) {
            confirmTopupBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Confirm topup button clicked');
                this.confirmTopup();
            });
        }
        
        // Cancel issuance button
        const cancelIssuanceBtn = document.getElementById('cancelIssuanceBtn');
        if (cancelIssuanceBtn) {
            cancelIssuanceBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Cancel issuance button clicked');
                this.cancelOperation();
            });
        }
        
        // Cancel topup button
        const cancelTopupBtn = document.getElementById('cancelTopupBtn');
        if (cancelTopupBtn) {
            cancelTopupBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Cancel topup button clicked');
                this.cancelOperation();
            });
        }
        
        // Close balance button
        const closeBalanceBtn = document.getElementById('closeBalanceBtn');
        if (closeBalanceBtn) {
            closeBalanceBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Close balance button clicked');
                this.cancelOperation();
            });
        }
    }

    /**
     * Show the appropriate operation form and hide others
     */
    showOperationForm(operation) {
        console.log(`Showing operation form: ${operation}`);
        
        try {
            // Get all form elements
            const cardIssuanceForm = document.getElementById('cardIssuanceForm');
            const topupFormContainer = document.getElementById('topupFormContainer');
            const balanceInquiryForm = document.getElementById('balanceInquiryForm');
            const operationForms = document.getElementById('operationForms');
            
            if (!cardIssuanceForm) console.error('Card issuance form not found');
            if (!topupFormContainer) console.error('Topup form container not found');
            if (!balanceInquiryForm) console.error('Balance inquiry form not found');
            if (!operationForms) console.error('Operation forms container not found');
            
            // Hide all operation forms first
            if (cardIssuanceForm) cardIssuanceForm.classList.add('hidden');
            if (topupFormContainer) topupFormContainer.classList.add('hidden');
            if (balanceInquiryForm) balanceInquiryForm.classList.add('hidden');
            
            // Reset any previous operation
            this.cancelOperation();
            
            // Show the selected operation form
            if (operation === 'cardIssuance' && cardIssuanceForm) {
                cardIssuanceForm.classList.remove('hidden');
                const issuanceStep1 = document.getElementById('issuanceStep1');
                const issuanceStep2 = document.getElementById('issuanceStep2');
                
                if (issuanceStep1) issuanceStep1.classList.remove('hidden');
                if (issuanceStep2) issuanceStep2.classList.add('hidden');
                this.currentOperation = 'issuance';
                console.log('Card issuance form displayed');
            } else if (operation === 'topup' && topupFormContainer) {
                topupFormContainer.classList.remove('hidden');
                const topupStep1 = document.getElementById('topupStep1');
                const topupStep2 = document.getElementById('topupStep2');
                
                if (topupStep1) topupStep1.classList.remove('hidden');
                if (topupStep2) topupStep2.classList.add('hidden');
                this.currentOperation = 'topup';
                console.log('Topup form displayed');
            } else if (operation === 'balanceInquiry' && balanceInquiryForm) {
                balanceInquiryForm.classList.remove('hidden');
                const balanceResult = document.getElementById('balanceResult');
                
                if (balanceResult) balanceResult.classList.add('hidden');
                this.currentOperation = 'balance';
                console.log('Balance inquiry form displayed');
            }
            
            // Scroll to the form
            if (operationForms) {
                operationForms.scrollIntoView({ behavior: 'smooth' });
                console.log('Scrolled to operation forms');
            }
            
            // Show status message to confirm form is displayed
            this.showStatus(`${operation} form is now displayed`, 'info');
        } catch (error) {
            console.error('Error showing operation form:', error);
            this.showStatus(`Error showing ${operation} form: ${error.message}`, 'error');
        }
    }

    /**
     * Cancel the current operation and reset the forms
     */
    cancelOperation() {
        console.log('Canceling current operation');
        
        try {
            // Reset forms
            if (this.issueCardForm) {
                this.issueCardForm.reset();
            }
            if (this.topupForm) {
                this.topupForm.reset();
            }
            
            // Reset selected amounts
            const selectedBalanceText = document.getElementById('selectedBalance');
            if (selectedBalanceText) {
                selectedBalanceText.textContent = 'Selected: ₹0';
            }
            
            const selectedTopupAmountText = document.getElementById('selectedTopupAmount');
            if (selectedTopupAmountText) {
                selectedTopupAmountText.textContent = 'Selected: ₹0';
            }
            
            // Reset hidden inputs
            const initialBalanceInput = document.getElementById('initialBalance');
            if (initialBalanceInput) {
                initialBalanceInput.value = '0';
            }
            
            const topupAmountInput = document.getElementById('topupAmount');
            if (topupAmountInput) {
                topupAmountInput.value = '0';
            }
            
            const nfcCardIdInput = document.getElementById('nfcCardId');
            if (nfcCardIdInput) {
                nfcCardIdInput.value = '';
            }
            
            const topupCardIdInput = document.getElementById('topupCardId');
            if (topupCardIdInput) {
                topupCardIdInput.value = '';
            }
            
            // Reset operation state
            this.cardId = null;
            this.isProcessing = false;
            this.secondEntryPending = false;
            
            // Stop any ongoing NFC reading
            if (this.nfcHandler) {
                this.nfcHandler.stopReading();
            }
            
            // Reset scan button text
            this.updateScanButtonText('issuance', false);
            this.updateScanButtonText('topup', false);
            this.updateScanButtonText('balance', false);
            
            // Get all form elements
            const cardIssuanceForm = document.getElementById('cardIssuanceForm');
            const topupFormContainer = document.getElementById('topupFormContainer');
            const balanceInquiryForm = document.getElementById('balanceInquiryForm');
            
            // Hide all operation forms
            if (cardIssuanceForm) cardIssuanceForm.classList.add('hidden');
            if (topupFormContainer) topupFormContainer.classList.add('hidden');
            if (balanceInquiryForm) balanceInquiryForm.classList.add('hidden');
            
            console.log('Operation canceled successfully');
        } catch (error) {
            console.error('Error canceling operation:', error);
        }
    }
    
    /**
     * Enter card ID for different operations
     */
    enterCardId(operation) {
        if (this.isProcessing) {
            this.showStatus('A process is already in progress', 'error');
            return;
        }
        
        this.isProcessing = true;
        
        // Update button text to indicate NFC scanning
        this.updateScanButtonText(operation, true);
        
        // Check if NFC is supported
        if (this.nfcSupported) {
            // Use NFC to read the card
            this.showStatus('Please tap your NFC card...', 'info');
            
            this.nfcHandler.startReading(operation, (cardId, error) => {
                if (error) {
                    console.error('NFC reading error:', error);
                    this.showStatus(`NFC Error: ${error.message}. Please try again.`, 'error');
                    this.isProcessing = false;
                    this.updateScanButtonText(operation, false);
                    return;
                }
                
                if (!cardId) {
                    this.showStatus('Failed to read NFC card. Please try again.', 'error');
                    this.isProcessing = false;
                    this.updateScanButtonText(operation, false);
                    return;
                }
                
                // Process the card ID based on the operation
                this.processCardId(operation, cardId);
            });
        } else {
            this.showStatus('NFC is not supported in this browser or device. Please use a compatible device.', 'error');
            this.isProcessing = false;
            this.updateScanButtonText(operation, false);
        }
    }
    
    /**
     * Process the card ID based on the operation
     */
    processCardId(operation, cardId) {
        if (operation === 'issuance') {
            if (this.secondEntryPending) {
                // Second entry for issuance
                this.completeIssuance(cardId);
            } else {
                // First entry for issuance
                this.handleIssuanceFirstEntry(cardId);
            }
        } else if (operation === 'topup') {
            if (this.secondEntryPending) {
                // Second entry for topup
                this.completeTopup(cardId);
            } else {
                // First entry for topup
                this.handleTopupFirstEntry(cardId);
            }
        } else if (operation === 'balance') {
            // Balance inquiry
            this.handleBalanceInquiry(cardId);
        }
        
        // Reset the scan button text
        this.updateScanButtonText(operation, false);
    }
    
    /**
     * Update the scan button text based on scanning state
     */
    updateScanButtonText(operation, isScanning) {
        let buttonId;
        
        if (operation === 'issuance') {
            buttonId = 'scanNewCardBtn';
        } else if (operation === 'topup') {
            buttonId = 'scanTopupCardBtn';
        } else if (operation === 'balance') {
            buttonId = 'scanBalanceCardBtn';
        }
        
        const button = document.getElementById(buttonId);
        if (button) {
            if (isScanning) {
                button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Scanning NFC Card...';
                button.disabled = true;
            } else {
                button.innerHTML = '<i class="fas fa-credit-card mr-2"></i> Scan NFC Card';
                button.disabled = false;
            }
        }
    }
    
    /**
     * Handle the first entry for card issuance
     */
    handleIssuanceFirstEntry(cardId) {
        this.cardId = cardId;
        
        // Generate a 16-character unique ID for the card if using NFC
        const uniqueId = this.nfcSupported ? this.nfcHandler.generateUniqueID() : cardId;
        
        this.showStatus(`Card detected successfully! Unique ID generated.`, 'success');
        
        // Update the hidden input field with the card ID
        const nfcCardIdInput = document.getElementById('nfcCardId');
        if (nfcCardIdInput) {
            nfcCardIdInput.value = uniqueId;
        }
        
        // Show the second step of the issuance form
        const issuanceStep1 = document.getElementById('issuanceStep1');
        const issuanceStep2 = document.getElementById('issuanceStep2');
        
        if (issuanceStep1) issuanceStep1.classList.add('hidden');
        if (issuanceStep2) issuanceStep2.classList.remove('hidden');
        
        this.isProcessing = false;
    }
    
    /**
     * Handle the first entry for topup
     */
    handleTopupFirstEntry(cardId) {
        this.cardId = cardId;
        this.showStatus('Retrieving card information...', 'info');
        
        // Fetch card information from the server
        fetch(`/api/cards/${cardId}/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Update the card info display
            const cardIdDisplay = document.querySelector('#cardIdDisplay span');
            const cardCustomerDisplay = document.querySelector('#cardCustomerDisplay span');
            const cardBalanceDisplay = document.querySelector('#cardBalanceDisplay span');
            
            if (cardIdDisplay) cardIdDisplay.textContent = data.card_id;
            if (cardCustomerDisplay) cardCustomerDisplay.textContent = data.customer_name;
            if (cardBalanceDisplay) cardBalanceDisplay.textContent = `₹${data.balance}`;
            
            // Update the hidden input field with the card ID
            const topupCardIdInput = document.getElementById('topupCardId');
            if (topupCardIdInput) {
                topupCardIdInput.value = cardId;
            }
            
            // Show the second step of the topup form
            const topupStep1 = document.getElementById('topupStep1');
            const topupStep2 = document.getElementById('topupStep2');
            
            if (topupStep1) topupStep1.classList.add('hidden');
            if (topupStep2) topupStep2.classList.remove('hidden');
            
            this.showStatus('Card information retrieved successfully', 'success');
        })
        .catch(error => {
            this.showStatus(`Error retrieving card information: ${error.message}`, 'error');
        })
        .finally(() => {
            this.isProcessing = false;
        });
    }
    
    /**
     * Handle balance inquiry
     */
    handleBalanceInquiry(cardId) {
        this.showStatus('Retrieving card balance...', 'info');
        
        // Fetch card information from the server
        fetch(`/api/cards/${cardId}/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Update the balance result display
            const balanceCardId = document.querySelector('#balanceCardId span');
            const balanceCustomerName = document.querySelector('#balanceCustomerName span');
            const balanceAmount = document.getElementById('balanceAmount');
            
            if (balanceCardId) balanceCardId.textContent = data.card_id;
            if (balanceCustomerName) balanceCustomerName.textContent = data.customer_name;
            if (balanceAmount) balanceAmount.textContent = data.balance;
            
            // Show the balance result
            const balanceResult = document.getElementById('balanceResult');
            if (balanceResult) {
                balanceResult.classList.remove('hidden');
            }
            
            this.showStatus('Card balance retrieved successfully', 'success');
        })
        .catch(error => {
            this.showStatus(`Error retrieving card balance: ${error.message}`, 'error');
        })
        .finally(() => {
            this.isProcessing = false;
        });
    }
    
    /**
     * Prepare for the second entry to confirm issuance
     */
    confirmIssuance() {
        const customerName = document.getElementById('customerName').value;
        const customerMobile = document.getElementById('customerMobile').value;
        const initialBalance = document.getElementById('initialBalance').value;
        
        if (!customerName || !customerMobile) {
            this.showStatus('Please enter customer name and mobile number', 'error');
            return;
        }
        
        if (!initialBalance || initialBalance === '0') {
            this.showStatus('Please select an initial balance amount', 'error');
            return;
        }
        
        this.secondEntryPending = true;
        this.showStatus('Please tap the NFC card again to confirm and complete the card issuance.', 'info');
        
        // Prompt for the second card ID entry
        this.enterCardId('issuance');
    }
    
    /**
     * Complete the card issuance process
     */
    completeIssuance(cardId) {
        if (cardId !== this.cardId) {
            this.showStatus('Card ID mismatch. Please use the same card for confirmation.', 'error');
            this.secondEntryPending = false;
            this.isProcessing = false;
            return;
        }
        
        const customerName = document.getElementById('customerName').value;
        const customerMobile = document.getElementById('customerMobile').value;
        const initialBalance = document.getElementById('initialBalance').value;
        const userId = document.getElementById('userId').value;
        const nfcCardId = document.getElementById('nfcCardId').value;
        
        this.showStatus('Processing card issuance...', 'info');
        
        // Send the issuance request to the server
        fetch('/api/cards/issue/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
                card_id: nfcCardId,
                customer_name: customerName,
                customer_mobile: customerMobile,
                initial_balance: initialBalance,
                user_id: userId
            })
        })
        .then(response => response.json())
        .then(result => {
            if (result.error) {
                throw new Error(result.error);
            }
            
            this.showStatus('Card issued successfully!', 'success');
            
            // Reset the form
            this.cancelOperation();
            
            // Reload the card list
            this.loadCards();
            
            // Scroll to the card list
            document.querySelector('.card-list-container').scrollIntoView({ behavior: 'smooth' });
        })
        .catch(error => {
            this.showStatus(`Card issuance failed: ${error.message}`, 'error');
        })
        .finally(() => {
            this.secondEntryPending = false;
            this.isProcessing = false;
        });
    }
    
    /**
     * Prepare for the second entry to confirm top-up
     */
    confirmTopup() {
        const topupAmount = document.getElementById('topupAmount').value;
        
        if (!topupAmount || topupAmount === '0') {
            this.showStatus('Please select a top-up amount', 'error');
            return;
        }
        
        this.secondEntryPending = true;
        this.showStatus('Please tap the NFC card again to confirm and finalize the top-up.', 'info');
        
        // Prompt for the second card ID entry
        this.enterCardId('topup');
    }
    
    /**
     * Complete the top-up process
     */
    completeTopup(cardId) {
        if (cardId !== this.cardId) {
            this.showStatus('Card ID mismatch. Please use the same card for confirmation.', 'error');
            this.secondEntryPending = false;
            this.isProcessing = false;
            return;
        }
        
        const topupAmount = document.getElementById('topupAmount').value;
        const topupCardId = document.getElementById('topupCardId').value;
        
        this.showStatus('Processing top-up...', 'info');
        
        // Send the top-up request to the server
        fetch('/api/transactions/topup/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
                card_id: topupCardId,
                amount: topupAmount
            })
        })
        .then(response => response.json())
        .then(result => {
            if (result.error) {
                throw new Error(result.error);
            }
            
            this.showStatus(`Top-up successful! New balance: ₹${result.new_balance}`, 'success');
            
            // Reset the form
            this.cancelOperation();
            
            // Reload the card list
            this.loadCards();
        })
        .catch(error => {
            this.showStatus(`Top-up failed: ${error.message}`, 'error');
        })
        .finally(() => {
            this.secondEntryPending = false;
            this.isProcessing = false;
        });
    }
    
    /**
     * Select initial balance amount
     */
    selectInitialBalance(amount) {
        const initialBalanceInput = document.getElementById('initialBalance');
        const selectedBalanceText = document.getElementById('selectedBalance');
        
        if (initialBalanceInput) {
            initialBalanceInput.value = amount;
        }
        
        if (selectedBalanceText) {
            selectedBalanceText.textContent = `Selected: ₹${amount}`;
        }
        
        // Highlight the selected button
        const balanceButtons = document.querySelectorAll('.balance-btn');
        balanceButtons.forEach(button => {
            if (button.getAttribute('data-amount') === amount) {
                button.classList.remove('bg-gray-200', 'hover:bg-gray-300', 'text-gray-800');
                button.classList.add('bg-blue-600', 'hover:bg-blue-700', 'text-white');
            } else {
                button.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'text-white');
                button.classList.add('bg-gray-200', 'hover:bg-gray-300', 'text-gray-800');
            }
        });
    }
    
    /**
     * Select top-up amount
     */
    selectTopupAmount(amount) {
        const topupAmountInput = document.getElementById('topupAmount');
        const selectedTopupAmountText = document.getElementById('selectedTopupAmount');
        
        if (topupAmountInput) {
            topupAmountInput.value = amount;
        }
        
        if (selectedTopupAmountText) {
            selectedTopupAmountText.textContent = `Selected: ₹${amount}`;
        }
        
        // Highlight the selected button
        const topupButtons = document.querySelectorAll('.topup-btn');
        topupButtons.forEach(button => {
            if (button.getAttribute('data-amount') === amount) {
                button.classList.remove('bg-gray-200', 'hover:bg-gray-300', 'text-gray-800');
                button.classList.add('bg-green-600', 'hover:bg-green-700', 'text-white');
            } else {
                button.classList.remove('bg-green-600', 'hover:bg-green-700', 'text-white');
                button.classList.add('bg-gray-200', 'hover:bg-gray-300', 'text-gray-800');
            }
        });
    }
    
    /**
     * Load the list of issued cards
     */
    loadCards() {
        if (!this.cardList) return;
        
        this.cardList.innerHTML = '<p class="text-gray-500 text-center py-4">Loading cards...</p>';
        
        fetch('/api/cards/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (data.length === 0) {
                this.cardList.innerHTML = '<p class="text-gray-500 text-center py-4">No cards issued yet</p>';
                return;
            }
            
            // Clear the card list
            this.cardList.innerHTML = '';
            
            // Add each card to the list
            data.forEach(card => {
                const cardElement = document.createElement('div');
                cardElement.className = 'bg-gray-50 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center';
                
                cardElement.innerHTML = `
                    <div>
                        <p class="text-lg font-medium text-gray-800">${card.customer_name}</p>
                        <p class="text-sm text-gray-600">Card ID: ${card.card_id}</p>
                        <p class="text-sm text-gray-600">Mobile: ${card.customer_mobile}</p>
                    </div>
                    <div class="mt-2 md:mt-0">
                        <span class="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Balance: ₹${card.balance}
                        </span>
                    </div>
                `;
                
                this.cardList.appendChild(cardElement);
            });
        })
        .catch(error => {
            this.cardList.innerHTML = `<p class="text-red-500 text-center py-4">Error loading cards: ${error.message}</p>`;
        });
    }
    
    /**
     * Show a status message
     */
    showStatus(message, type = 'info') {
        if (!this.operationStatus) return;
        
        // Set the appropriate class based on the message type
        let className = 'rounded-lg p-4 mb-6 ';
        
        if (type === 'error') {
            className += 'bg-red-100 text-red-800';
        } else if (type === 'success') {
            className += 'bg-green-100 text-green-800';
        } else if (type === 'warning') {
            className += 'bg-yellow-100 text-yellow-800';
        } else {
            className += 'bg-blue-100 text-blue-800';
        }
        
        this.operationStatus.className = className;
        this.operationStatus.innerHTML = message;
        this.operationStatus.classList.remove('hidden');
        
        // Scroll to the status message
        this.operationStatus.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Initialize the card operations handler when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CardOperationsHandler();
});
