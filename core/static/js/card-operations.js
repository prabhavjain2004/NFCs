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
        // Card Issuance Button
        const cardIssuanceBtn = document.getElementById('cardIssuanceBtn');
        if (cardIssuanceBtn) {
            cardIssuanceBtn.addEventListener('click', () => {
                this.showOperationForm('cardIssuance');
            });
        }
        
        // Top-up Button
        const topupCardBtn = document.getElementById('topupCardBtn');
        if (topupCardBtn) {
            topupCardBtn.addEventListener('click', () => {
                this.showOperationForm('topup');
            });
        }
        
        // Balance Inquiry Button
        const balanceInquiryBtn = document.getElementById('balanceInquiryBtn');
        if (balanceInquiryBtn) {
            balanceInquiryBtn.addEventListener('click', () => {
                this.showOperationForm('balanceInquiry');
            });
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
        
        // Confirm Issuance Button
        const confirmIssuanceBtn = document.getElementById('confirmIssuanceBtn');
        if (confirmIssuanceBtn) {
            confirmIssuanceBtn.addEventListener('click', () => {
                this.confirmIssuance();
            });
        }
        
        // Confirm Top-up Button
        const confirmTopupBtn = document.getElementById('confirmTopupBtn');
        if (confirmTopupBtn) {
            confirmTopupBtn.addEventListener('click', () => {
                this.confirmTopup();
            });
        }
        
        // Cancel Issuance Button
        const cancelIssuanceBtn = document.getElementById('cancelIssuanceBtn');
        if (cancelIssuanceBtn) {
            cancelIssuanceBtn.addEventListener('click', () => {
                this.cancelOperation();
            });
        }
        
        // Cancel Top-up Button
        const cancelTopupBtn = document.getElementById('cancelTopupBtn');
        if (cancelTopupBtn) {
            cancelTopupBtn.addEventListener('click', () => {
                this.cancelOperation();
            });
        }
        
        // Close Balance Button
        const closeBalanceBtn = document.getElementById('closeBalanceBtn');
        if (closeBalanceBtn) {
            closeBalanceBtn.addEventListener('click', () => {
                this.cancelOperation();
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
    }

    /**
     * Show the appropriate operation form and hide others
     */
    showOperationForm(operation) {
        // Hide all operation forms first
        document.getElementById('cardIssuanceForm').classList.add('hidden');
        document.getElementById('topupFormContainer').classList.add('hidden');
        document.getElementById('balanceInquiryForm').classList.add('hidden');
        
        // Reset any previous operation
        this.cancelOperation();
        
        // Show the selected operation form
        if (operation === 'cardIssuance') {
            document.getElementById('cardIssuanceForm').classList.remove('hidden');
            document.getElementById('issuanceStep1').classList.remove('hidden');
            document.getElementById('issuanceStep2').classList.add('hidden');
            this.currentOperation = 'issuance';
        } else if (operation === 'topup') {
            document.getElementById('topupFormContainer').classList.remove('hidden');
            document.getElementById('topupStep1').classList.remove('hidden');
            document.getElementById('topupStep2').classList.add('hidden');
            this.currentOperation = 'topup';
        } else if (operation === 'balanceInquiry') {
            document.getElementById('balanceInquiryForm').classList.remove('hidden');
            document.getElementById('balanceResult').classList.add('hidden');
            this.currentOperation = 'balance';
        }
        
        // Scroll to the form
        document.getElementById('operationForms').scrollIntoView({ behavior: 'smooth' });
    }
    
    /**
     * Cancel the current operation and reset the forms
     */
    cancelOperation() {
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
        
        // Hide all operation forms
        document.getElementById('cardIssuanceForm').classList.add('hidden');
        document.getElementById('topupFormContainer').classList.add('hidden');
        document.getElementById('balanceInquiryForm').classList.add('hidden');
        
        // Hide status message
        if (this.operationStatus) {
            this.operationStatus.classList.add('hidden');
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
                    // Fall back to manual entry if there's an error
                    this.fallbackToManualEntry(operation);
                    return;
                }
                
                if (!cardId) {
                    this.showStatus('Failed to read NFC card', 'error');
                    this.isProcessing = false;
                    this.updateScanButtonText(operation, false);
                    return;
                }
                
                // Process the card ID based on the operation
                this.processCardId(operation, cardId);
            });
        } else {
            // Fall back to manual entry if NFC is not supported
            this.fallbackToManualEntry(operation);
        }
    }
    
    /**
     * Fall back to manual card ID entry
     */
    fallbackToManualEntry(operation) {
        // Create a modal or form for manual card ID entry
        const cardIdInput = prompt('Please enter the card ID:');
        
        if (cardIdInput && cardIdInput.trim() !== '') {
            this.processCardId(operation, cardIdInput);
        } else {
            this.showStatus('Card ID entry cancelled', 'info');
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
        document.getElementById('issuanceStep1').classList.add('hidden');
        document.getElementById('issuanceStep2').classList.remove('hidden');
        
        this.isProcessing = false;
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
     * Complete the card issuance after the second entry
     */
    async completeIssuance(cardId) {
        try {
            const customerName = document.getElementById('customerName').value;
            const customerMobile = document.getElementById('customerMobile').value;
            const initialBalance = document.getElementById('initialBalance').value;
            const userId = document.getElementById('userId').value;
            const nfcCardId = document.getElementById('nfcCardId').value;
            
            // Verify that the second entry matches the first entry
            if (cardId !== nfcCardId) {
                this.showStatus('The entered card ID does not match the initial card ID. Please start over.', 'error');
                this.secondEntryPending = false;
                this.isProcessing = false;
                return;
            }

            this.showStatus('Issuing card...', 'info');

            // Get the CSRF token
            const csrftoken = this.getCookie('csrftoken');
            
            const response = await fetch('/api/cards/issue/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                credentials: 'same-origin', // Include cookies in the request
                body: JSON.stringify({
                    customer_name: customerName,
                    customer_mobile: customerMobile,
                    initial_balance: initialBalance,
                    user_id: userId,
                    nfc_card_id: nfcCardId
                })
            });

            let result;
            try {
                result = await response.json();
            } catch (e) {
                console.error('Error parsing JSON response:', e);
                throw new Error('Invalid response from server');
            }

            if (response.ok) {
                this.showStatus(`Card issued successfully! Card ID: ${result.card_id || 'Unknown'}`, 'success');
                
                // Reset the form and state
                this.secondEntryPending = false;
                
                // Reset the selected balance text
                const selectedBalanceText = document.getElementById('selectedBalance');
                if (selectedBalanceText) {
                    selectedBalanceText.textContent = 'Selected: ₹0';
                }
                
                // Hide the form after a delay
                setTimeout(() => {
                    document.getElementById('cardIssuanceForm').classList.add('hidden');
                    
                    // Refresh card list
                    this.loadCards();
                }, 2000);
            } else {
                throw new Error(result.error || 'Failed to issue card');
            }
        } catch (error) {
            console.error('Error issuing card:', error);
            this.showStatus('Failed to issue card: ' + error.message, 'error');
            this.secondEntryPending = false;
        }
        
        this.isProcessing = false;
    }
    
    /**
     * Handle the first entry for card top-up
     */
    async handleTopupFirstEntry(cardId) {
        try {
            this.showStatus(`Card ID entered successfully! Looking up card...`, 'info');
            
            // Find the card by secure key (card ID)
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
                // Store the card ID for the second entry
                const topupCardIdInput = document.getElementById('topupCardId');
                if (topupCardIdInput) {
                    topupCardIdInput.value = cardId;
                }
                
                // Display card information
                document.getElementById('cardIdDisplay').querySelector('span').textContent = matchingCard.card_id;
                document.getElementById('cardCustomerDisplay').querySelector('span').textContent = matchingCard.customer_name || 'Unknown';
                document.getElementById('cardBalanceDisplay').querySelector('span').textContent = `₹${matchingCard.balance}`;
                
                // Show the second step of the top-up form
                document.getElementById('topupStep1').classList.add('hidden');
                document.getElementById('topupStep2').classList.remove('hidden');
                
                this.showStatus(`Card found: ${matchingCard.card_id} - ${matchingCard.customer_name || 'Unknown'}`, 'success');
            } else {
                this.showStatus('No matching card found for this card ID', 'error');
            }
        } catch (error) {
            console.error('Error finding card:', error);
            this.showStatus(`Error finding card: ${error.message}`, 'error');
        }
        
        this.isProcessing = false;
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
     * Complete the top-up after the second entry
     */
    async completeTopup(cardId) {
        try {
            const topupAmount = document.getElementById('topupAmount').value;
            const storedCardId = document.getElementById('topupCardId').value;
            
            // Verify that the second entry matches the first entry
            if (cardId !== storedCardId) {
                this.showStatus('The entered card ID does not match the initial card ID. Please start over.', 'error');
                this.secondEntryPending = false;
                this.isProcessing = false;
                return;
            }
            
            this.showStatus('Processing top-up...', 'info');
            
            // Find the card by secure key (card ID)
            const cardsResponse = await fetch('/api/cards/', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'X-CSRFToken': this.getCookie('csrftoken')
                },
                credentials: 'same-origin' // Include cookies in the request
            });
            
            if (!cardsResponse.ok) {
                throw new Error('Failed to load cards');
            }
            
            let cards;
            try {
                cards = await cardsResponse.json();
            } catch (e) {
                console.error('Error parsing JSON response:', e);
                throw new Error('Invalid response from server when loading cards');
            }
            
            const matchingCard = cards.find(card => card.secure_key === cardId);
            
            if (!matchingCard) {
                throw new Error('Card not found');
            }
            
            // Process the top-up
            const response = await fetch(`/api/cards/${matchingCard.id}/topup/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCookie('csrftoken'),
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                credentials: 'same-origin', // Include cookies in the request
                body: JSON.stringify({
                    amount: topupAmount
                })
            });

            let result;
            try {
                result = await response.json();
            } catch (e) {
                console.error('Error parsing JSON response:', e);
                throw new Error('Invalid response from server during top-up');
            }

            if (response.ok) {
                this.showStatus(`Top-up successful! New balance: ₹${result.new_balance || 0}`, 'success');
                
                // Reset the form and state
                this.secondEntryPending = false;
                
                // Reset the selected topup amount text
                const selectedTopupAmountText = document.getElementById('selectedTopupAmount');
                if (selectedTopupAmountText) {
                    selectedTopupAmountText.textContent = 'Selected: ₹0';
                }
                
                // Hide the form after a delay
                setTimeout(() => {
                    document.getElementById('topupFormContainer').classList.add('hidden');
                    
                    // Refresh card list
                    this.loadCards();
                }, 2000);
            } else {
                throw new Error(result.error || 'Failed to top-up card');
            }
        } catch (error) {
            console.error('Error topping up card:', error);
            this.showStatus('Failed to top-up card: ' + error.message, 'error');
            this.secondEntryPending = false;
        }
        
        this.isProcessing = false;
    }
    
    /**
     * Handle balance inquiry
     */
    async handleBalanceInquiry(cardId) {
        try {
            this.showStatus(`Card ID entered successfully! Looking up balance...`, 'info');
            
            // Find the card by secure key (card ID)
            const response = await fetch('/api/cards/', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'X-CSRFToken': this.getCookie('csrftoken')
                },
                credentials: 'same-origin' // Include cookies in the request
            });
            
            if (!response.ok) {
                throw new Error('Failed to load cards');
            }
            
            let cards;
            try {
                cards = await response.json();
            } catch (e) {
                console.error('Error parsing JSON response:', e);
                throw new Error('Invalid response from server when loading cards');
            }
            
            const matchingCard = cards.find(card => card.secure_key === cardId);
            
            if (matchingCard) {
                // Display balance information
                const balanceCardIdElement = document.getElementById('balanceCardId');
                if (balanceCardIdElement && balanceCardIdElement.querySelector('span')) {
                    balanceCardIdElement.querySelector('span').textContent = matchingCard.card_id;
                }
                
                const balanceCustomerNameElement = document.getElementById('balanceCustomerName');
                if (balanceCustomerNameElement && balanceCustomerNameElement.querySelector('span')) {
                    balanceCustomerNameElement.querySelector('span').textContent = matchingCard.customer_name || 'Unknown';
                }
                
                const balanceAmountElement = document.getElementById('balanceAmount');
                if (balanceAmountElement) {
                    balanceAmountElement.textContent = matchingCard.balance;
                }
                
                // Show the balance result
                const balanceResultElement = document.getElementById('balanceResult');
                if (balanceResultElement) {
                    balanceResultElement.classList.remove('hidden');
                }
                
                this.showStatus(`Balance inquiry successful!`, 'success');
            } else {
                this.showStatus('No matching card found for this card ID', 'error');
            }
        } catch (error) {
            console.error('Error checking balance:', error);
            this.showStatus(`Error checking balance: ${error.message}`, 'error');
        }
        
        this.isProcessing = false;
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
                        // Show the top-up form
                        this.showOperationForm('topup');
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
