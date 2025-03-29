// Common Dashboard Functions

// Modal Management
function showRechargeModal() {
    document.getElementById('rechargeModal').style.display = 'block';
}

function closeRechargeModal() {
    document.getElementById('rechargeModal').style.display = 'none';
}

// Recharge Handling
async function handleRecharge(event) {
    event.preventDefault();
    const form = event.target;
    const amount = form.amount.value;
    const cardId = form.card.value;

    try {
        const response = await fetch('/api/transactions/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
                transaction_type: 'recharge',
                amount: parseFloat(amount),
                card_id: cardId
            })
        });

        if (!response.ok) {
            throw new Error('Recharge failed');
        }

        const result = await response.json();
        showSuccessMessage('Recharge successful!');
        closeRechargeModal();
        location.reload(); // Refresh to show updated balance
    } catch (error) {
        showErrorMessage('Failed to process recharge. Please try again.');
        console.error('Recharge error:', error);
    }
}

// User Card Loading
async function loadUserCards(userId) {
    const cardSelect = document.getElementById('card');
    cardSelect.disabled = true;
    cardSelect.innerHTML = '<option value="">Loading cards...</option>';

    try {
        const response = await fetch(`/api/users/${userId}/cards/`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load cards');
        }

        const cards = await response.json();
        cardSelect.innerHTML = cards.length 
            ? cards.map(card => `<option value="${card.card_id}">Card #${card.card_id}</option>`).join('')
            : '<option value="">No cards available</option>';
        cardSelect.disabled = false;
    } catch (error) {
        cardSelect.innerHTML = '<option value="">Error loading cards</option>';
        console.error('Error loading cards:', error);
    }
}

// Message Display
function showSuccessMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message success';
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}

function showErrorMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message error';
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // User selection change handler
    const userSelect = document.getElementById('user');
    if (userSelect) {
        userSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                loadUserCards(e.target.value);
            }
        });
    }

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        const modals = document.getElementsByClassName('modal');
        Array.from(modals).forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Handle escape key for modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modals = document.getElementsByClassName('modal');
            Array.from(modals).forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
}); 