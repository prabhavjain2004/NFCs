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
    }

    async processPayment() {
        if (this.isProcessing) {
            this.showStatus('A payment is already in progress', 'error');
            return;
        }

        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const description = document.getElementById('paymentDescription').value || 'Payment transaction';

        if (isNaN(amount) || amount <= 0) {
            this.showStatus('Please enter a valid amount', 'error');
            return;
        }

        this.isProcessing = true;
        this.showStatus('Waiting for NFC card...', 'info');

        try {
            // Check if Web NFC API is available
            if (!('NDEFReader' in window)) {
                throw new Error('NFC is not supported on this device or browser');
            }

            const reader = new NDEFReader();
            await reader.scan();

            reader.onreading = async ({ message, serialNumber }) => {
                try {
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

            reader.onreadingerror = () => {
                this.showStatus('Error reading NFC card', 'error');
                this.isProcessing = false;
            };

        } catch (error) {
            this.showStatus(`Error: ${error.message}`, 'error');
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
