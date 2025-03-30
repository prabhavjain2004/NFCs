/**
 * Card Payment Handler
 * Handles card payments for outlet transactions
 */
class CardPaymentHandler {
    constructor() {
        this.paymentForm = document.getElementById('paymentForm');
        this.paymentStatus = document.getElementById('paymentStatus');
        this.isProcessing = false;
        
        // Initialize NFC handler
        this.nfcHandler = new NFCHandler();
        this.nfcHandler.setStatusCallback((message, type) => this.showStatus(message, type));
        this.nfcSupported = this.nfcHandler.checkNFCSupport();
        
        this.initialize();
    }

    initialize() {
        if (this.paymentForm) {
            this.paymentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processPayment();
            });
        }

        // Initialize payment amount buttons
        const paymentButtons = document.querySelectorAll('.payment-btn');
        if (paymentButtons.length > 0) {
            paymentButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const clickedAmount = parseInt(button.getAttribute('data-amount'));
                    const paymentAmountInput = document.getElementById('paymentAmount');
                    const selectedPaymentAmountText = document.getElementById('selectedPaymentAmount');
                    
                    // Get current amount or default to 0
                    let currentAmount = paymentAmountInput ? parseInt(paymentAmountInput.value) || 0 : 0;
                    
                    // Add the clicked amount to the current amount
                    const newAmount = currentAmount + clickedAmount;
                    
                    // Update the hidden input value
                    if (paymentAmountInput) {
                        paymentAmountInput.value = newAmount;
                    }
                    
                    // Update the selected amount text
                    if (selectedPaymentAmountText) {
                        selectedPaymentAmountText.textContent = `Selected: ₹${newAmount}`;
                    }
                    
                    // Highlight the selected button
                    button.classList.remove('bg-gray-200', 'text-gray-800');
                    button.classList.add('bg-blue-200', 'text-blue-800');
                    
                    // After a short delay, reset the button highlight
                    setTimeout(() => {
                        button.classList.remove('bg-blue-200', 'text-blue-800');
                        button.classList.add('bg-gray-200', 'text-gray-800');
                    }, 300);
                });
            });
        }
    }

    async processPayment() {
        if (this.isProcessing) {
            this.showStatus('A payment is already in progress', 'error');
            return;
        }

        const amount = document.getElementById('paymentAmount').value;
        const description = document.getElementById('paymentDescription').value || 'Payment transaction';

        if (!amount || amount === '0') {
            this.showStatus('Please select a payment amount', 'error');
            return;
        }

        this.isProcessing = true;
        this.promptForCardId(amount, description);
    }
    
    promptForCardId(amount, description) {
        // Update payment button to show scanning state
        const paymentButton = document.querySelector('#paymentForm button[type="submit"]');
        if (paymentButton) {
            paymentButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Scanning NFC Card...';
            paymentButton.disabled = true;
        }
        
        // Check if NFC is supported
        if (this.nfcSupported) {
            // Use NFC to read the card
            this.showStatus('Please tap your NFC card to complete payment...', 'info');
            
            this.nfcHandler.startReading('payment', (cardId, error) => {
                if (error) {
                    console.error('NFC reading error:', error);
                    this.showStatus(`NFC Error: ${error.message}. Please try again.`, 'error');
                    this.isProcessing = false;
                    
                    // Reset payment button
                    if (paymentButton) {
                        paymentButton.innerHTML = '<i class="fas fa-credit-card mr-2"></i> Scan NFC Card & Process Payment';
                        paymentButton.disabled = false;
                    }
                    return;
                }
                
                if (!cardId) {
                    this.showStatus('Failed to read NFC card. Please try again.', 'error');
                    this.isProcessing = false;
                    
                    // Reset payment button
                    if (paymentButton) {
                        paymentButton.innerHTML = '<i class="fas fa-credit-card mr-2"></i> Scan NFC Card & Process Payment';
                        paymentButton.disabled = false;
                    }
                    return;
                }
                
                // Process the payment with the scanned card ID
                this.processPaymentWithCardId(cardId, amount, description);
            });
        } else {
            this.showStatus('NFC is not supported in this browser or device. Please use a compatible device.', 'error');
            this.isProcessing = false;
            
            // Reset payment button
            if (paymentButton) {
                paymentButton.innerHTML = '<i class="fas fa-credit-card mr-2"></i> Scan NFC Card & Process Payment';
                paymentButton.disabled = false;
            }
        }
    }
    
    /**
     * Process payment with the provided card ID
     */
    processPaymentWithCardId(cardId, amount, description) {
        this.showStatus('Processing payment...', 'info');
        
        // Process the payment with the entered card ID
        fetch('/api/transactions/payment/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
                secure_key: cardId,
                amount: amount,
                description: description
            })
        })
        .then(response => response.json())
        .then(result => {
            if (result.error) {
                throw new Error(result.error);
            }
            
            this.showStatus(`Payment successful! New balance: ₹${result.new_balance}`, 'success');
            this.paymentForm.reset();
            
            // Reset selected amount text
            const selectedPaymentAmountText = document.getElementById('selectedPaymentAmount');
            if (selectedPaymentAmountText) {
                selectedPaymentAmountText.textContent = 'Selected: ₹0';
            }
            
            // Refresh the page after 2 seconds to update dashboard data
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        })
        .catch(error => {
            this.showStatus(`Payment failed: ${error.message}`, 'error');
        })
        .finally(() => {
            this.isProcessing = false;
            
            // Reset payment button
            const paymentButton = document.querySelector('#paymentForm button[type="submit"]');
            if (paymentButton) {
                paymentButton.innerHTML = 'Process Payment';
                paymentButton.disabled = false;
            }
        });
    }

    showStatus(message, type = 'info') {
        if (!this.paymentStatus) return;

        this.paymentStatus.className = `rounded-lg p-4 mb-4 ${
            type === 'success' ? 'bg-green-100 text-green-800' : 
            type === 'error' ? 'bg-red-100 text-red-800' : 
            'bg-blue-100 text-blue-800'
        }`;
        this.paymentStatus.textContent = message;
        this.paymentStatus.classList.remove('hidden');
    }
}

// Initialize the payment handler when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    const cardPayment = new CardPaymentHandler();
});
