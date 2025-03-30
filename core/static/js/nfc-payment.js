/**
 * NFC Payment Handler
 * Handles NFC card payments for outlet transactions
 */
class NFCPaymentHandler {
    constructor() {
        this.paymentForm = document.getElementById('paymentForm');
        this.paymentStatus = document.getElementById('paymentStatus');
        this.isProcessing = false;
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
        this.showStatus('Waiting for NFC card...', 'info');

        try {
            // Check if Web NFC API is available
            if (!('NDEFReader' in window)) {
                // Fallback for browsers without NFC support
                this.handleNfcFallback(amount, description);
                return;
            }

            try {
                const reader = new NDEFReader();
                await reader.scan();
                
                reader.onreading = async ({ message, serialNumber }) => {
                    try {
                        this.showStatus('Card detected! Processing payment...', 'info');
                        
                        // Process the payment with the card data
                        const response = await fetch('/api/transactions/payment/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                            },
                            body: JSON.stringify({
                                secure_key: serialNumber, // In a real app, this would be properly secured
                                amount: amount,
                                description: description
                            })
                        });

                        const result = await response.json();

                        if (response.ok) {
                            this.showStatus(`Payment successful! New balance: ₹${result.new_balance}`, 'success');
                            this.paymentForm.reset();
                            
                            // Refresh the page after 2 seconds to update dashboard data
                            setTimeout(() => {
                                window.location.reload();
                            }, 2000);
                        } else {
                            throw new Error(result.error || 'Payment failed');
                        }
                    } catch (error) {
                        this.showStatus(`Payment failed: ${error.message}`, 'error');
                    } finally {
                        reader.stop();
                        this.isProcessing = false;
                    }
                };

                reader.onreadingerror = (event) => {
                    console.error('Reading error:', event);
                    this.showStatus('Error reading NFC card. Please try again.', 'error');
                    this.isProcessing = false;
                };
            } catch (nfcError) {
                console.error('NFC error:', nfcError);
                
                // Check if the error is due to user permissions
                if (nfcError.name === 'NotAllowedError') {
                    this.showStatus('NFC permission denied. Please allow NFC access and try again.', 'error');
                } else if (nfcError.name === 'NotSupportedError') {
                    this.showStatus('NFC is not supported on this device or browser.', 'error');
                    // Offer fallback
                    this.handleNfcFallback(amount, description);
                } else {
                    this.showStatus(`NFC error: ${nfcError.message}. Try manual entry.`, 'error');
                    // Offer fallback
                    this.handleNfcFallback(amount, description);
                }
                
                this.isProcessing = false;
            }
        } catch (error) {
            console.error('General error:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
            this.isProcessing = false;
        }
    }
    
    handleNfcFallback(amount, description) {
        // Create a modal or form for manual card ID entry
        const cardIdInput = prompt('NFC not available. Please enter the card ID manually:');
        
        if (cardIdInput) {
            this.showStatus('Processing manual payment...', 'info');
            
            // Process the payment with the manually entered card ID
            fetch('/api/transactions/payment/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    secure_key: cardIdInput,
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
            });
        } else {
            this.showStatus('Payment cancelled', 'info');
            this.isProcessing = false;
        }
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
    const nfcPayment = new NFCPaymentHandler();
});
