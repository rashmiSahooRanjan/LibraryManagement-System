/* ============================================
   PAYMENT GATEWAY - MAIN APPLICATION
   ============================================ */

/**
 * Main Payment Gateway Application
 * Handles modal initialization, tab switching, and overall flow
 */

class PaymentGatewayApp {
    constructor() {
        this.paymentModal = document.getElementById('paymentModal');
        this.processingModal = document.getElementById('processingModal');
        this.successModal = document.getElementById('successModal');
        this.failureModal = document.getElementById('failureModal');
        
        this.currentPaymentData = null;
        this.currentPaymentMethod = null;
        this.isProcessing = false;
        
        this.initializeEventListeners();
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // Main button
        document.getElementById('proceedBtn').addEventListener('click', () => this.openPaymentGateway());

        // Modal controls
        document.getElementById('closeBtn').addEventListener('click', () => this.closeModal());
        this.paymentModal.addEventListener('click', (e) => {
            if (e.target === this.paymentModal.querySelector('.modal-overlay')) {
                this.closeModal();
            }
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.closest('.tab-btn')));
        });

        // UPI handlers
        document.querySelectorAll('.upi-app').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectUpiApp(e.target.closest('.upi-app')));
        });
        
        document.getElementById('verifyUpiBtn').addEventListener('click', () => this.verifyUPI());
        document.getElementById('upiPayBtn').addEventListener('click', () => this.initiateUPIPayment());

        // Card handlers
        document.getElementById('cardNumber').addEventListener('input', (e) => this.formatCardNumber(e.target));
        document.getElementById('cardExpiry').addEventListener('input', (e) => this.formatExpiry(e.target));
        document.getElementById('cardCvv').addEventListener('input', (e) => this.formatCVV(e.target));
        document.getElementById('cardHolder').addEventListener('input', (e) => this.updateCardHolder(e.target.value));
        document.getElementById('cardPayBtn').addEventListener('click', () => this.initiateCardPayment());

        // Wallet handlers
        document.querySelectorAll('.wallet-option').forEach(btn => {
            btn.addEventListener('click', (e) => this.initiateWalletPayment(e.target.closest('.wallet-option')));
        });

        // Net Banking handler
        document.getElementById('netbankingBtn').addEventListener('click', () => this.initiateNetBankingPayment());

        // Cash on Delivery handler
        document.getElementById('codBtn').addEventListener('click', () => this.initiateCODPayment());

        // Success/Failure handlers
        document.getElementById('downloadReceiptBtn').addEventListener('click', () => this.downloadReceipt());
        document.getElementById('continueShoppingBtn').addEventListener('click', () => this.continueShoppingAfterSuccess());
        document.getElementById('retryPaymentBtn').addEventListener('click', () => this.retryPayment());
        document.getElementById('cancelPaymentBtn').addEventListener('click', () => this.closeAllModals());
    }

    /**
     * Main function to open payment gateway
     * @param {Object} paymentConfig - Payment configuration
     */
    openPaymentGateway(paymentConfig = null) {
        // Set default payment data if not provided
        this.currentPaymentData = paymentConfig || {
            amount: 588.82,
            tax: 89.82,
            delivery: 0,
            customerName: 'John Doe',
            customerEmail: 'john@example.com',
            customerPhone: '9876543210',
            merchantName: 'TasteTrial Food Delivery'
        };

        // Generate Order ID
        this.currentPaymentData.orderId = this.generateOrderId();
        this.currentPaymentData.transactionId = this.generateTransactionId();

        // Populate modal with data
        this.populateModalData();

        // Show modal with animation
        this.paymentModal.classList.remove('hidden');
        UIUtils.showToast('Payment Started', 'success');
    }

    /**
     * Populate modal with payment data
     */
    populateModalData() {
        document.getElementById('merchantName').textContent = this.currentPaymentData.merchantName;
        document.getElementById('orderId').textContent = this.currentPaymentData.orderId;
        document.getElementById('customerName').textContent = this.currentPaymentData.customerName;
        document.getElementById('totalAmount').textContent = '₹' + this.currentPaymentData.amount.toFixed(2);
        document.getElementById('codAmount').textContent = '₹' + this.currentPaymentData.amount.toFixed(2);
    }

    /**
     * Switch between payment method tabs
     */
    switchTab(tabBtn) {
        // Remove active class from all tabs
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

        // Add active class to clicked tab
        tabBtn.classList.add('active');
        const tabName = tabBtn.dataset.tab;
        document.getElementById(tabName).classList.add('active');
    }

    /**
     * Select UPI app
     */
    selectUpiApp(button) {
        document.querySelectorAll('.upi-app').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        this.currentPaymentMethod = button.dataset.upi;
    }

    /**
     * Verify UPI ID
     */
    verifyUPI() {
        const upiId = document.getElementById('upiId').value.trim();
        
        if (!Validation.validateUPI(upiId)) {
            UIUtils.showToast('Invalid UPI ID', 'error');
            return;
        }

        // Show verification status
        const verificationDiv = document.getElementById('upiVerification');
        verificationDiv.classList.remove('hidden');
        UIUtils.showToast('UPI Verified', 'success');
    }

    /**
     * Initiate UPI Payment
     */
    initiateUPIPayment() {
        if (!this.currentPaymentMethod) {
            UIUtils.showToast('Select UPI App', 'error');
            return;
        }

        const upiId = document.getElementById('upiId').value.trim();
        if (!Validation.validateUPI(upiId)) {
            UIUtils.showToast('Invalid UPI ID', 'error');
            return;
        }

        this.processPayment('UPI');
    }

    /**
     * Format card number
     */
    formatCardNumber(input) {
        let value = input.value.replace(/\s/g, '');
        let formattedValue = '';

        for (let i = 0; i < value.length; i++) {
            if (i > 0 && i % 4 === 0) {
                formattedValue += ' ';
            }
            formattedValue += value[i];
        }

        input.value = formattedValue;

        // Update card display
        const display = value.replace(/\s/g, '');
        const masked = display.slice(0, -4).replace(/./g, '•') + display.slice(-4);
        const formatted = masked.match(/.{1,4}/g)?.join(' ') || '•••• •••• •••• ••••';
        document.getElementById('cardNumberDisplay').textContent = formatted || '•••• •••• •••• ••••';

        // Detect card type
        this.detectCardType(display);
    }

    /**
     * Detect card type
     */
    detectCardType(cardNumber) {
        let cardIcon = '💳';
        
        if (cardNumber.startsWith('4')) {
            cardIcon = '💳 Visa';
        } else if (cardNumber.startsWith('5')) {
            cardIcon = '💳 Mastercard';
        } else if (cardNumber.startsWith('6')) {
            cardIcon = '🏦 RuPay';
        }

        document.getElementById('cardIconDisplay').textContent = cardIcon;
    }

    /**
     * Format expiry date
     */
    formatExpiry(input) {
        let value = input.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.slice(0, 2) + '/' + value.slice(2, 4);
        }
        input.value = value;
        document.getElementById('cardExpiryDisplay').textContent = value || 'MM/YY';
    }

    /**
     * Format CVV
     */
    formatCVV(input) {
        input.value = input.value.replace(/\D/g, '').slice(0, 3);
    }

    /**
     * Update card holder display
     */
    updateCardHolder(value) {
        document.getElementById('cardHolderDisplay').textContent = value.toUpperCase() || 'CARDHOLDER NAME';
    }

    /**
     * Initiate card payment
     */
    initiateCardPayment() {
        const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
        const cardHolder = document.getElementById('cardHolder').value.trim();
        const expiry = document.getElementById('cardExpiry').value;
        const cvv = document.getElementById('cardCvv').value;

        if (!Validation.validateCard(cardNumber, expiry, cvv)) {
            UIUtils.showToast('Invalid Card Details', 'error');
            return;
        }

        if (!cardHolder) {
            UIUtils.showToast('Enter Cardholder Name', 'error');
            return;
        }

        this.processPayment('Card');
    }

    /**
     * Initiate wallet payment
     */
    initiateWalletPayment(walletBtn) {
        const walletName = walletBtn.querySelector('.wallet-name').textContent;
        this.currentPaymentMethod = walletBtn.dataset.wallet;
        this.processPayment('Wallet - ' + walletName);
    }

    /**
     * Initiate net banking payment
     */
    initiateNetBankingPayment() {
        const bankSelect = document.getElementById('bankSelect');
        const selectedBank = bankSelect.options[bankSelect.selectedIndex].text;

        if (!bankSelect.value) {
            UIUtils.showToast('Select a Bank', 'error');
            return;
        }

        this.processPayment('Net Banking - ' + selectedBank);
    }

    /**
     * Initiate cash on delivery
     */
    initiateCODPayment() {
        this.processPayment('Cash on Delivery');
    }

    /**
     * Process payment with animation
     */
    processPayment(paymentMethod) {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.currentPaymentMethod = paymentMethod;

        // Close payment modal and show processing modal
        this.paymentModal.classList.add('hidden');
        this.processingModal.classList.remove('hidden');

        // Get all steps
        const steps = document.querySelectorAll('.processing-steps .step');
        let currentStep = 0;

        // Process each step
        const processStep = () => {
            if (currentStep < steps.length) {
                if (currentStep > 0) {
                    steps[currentStep - 1].classList.add('completed');
                }
                steps[currentStep].classList.add('active');
                currentStep++;
                setTimeout(processStep, 1000);
            } else {
                // Payment processing complete
                setTimeout(() => this.completePayment(), 500);
            }
        };

        processStep();
    }

    /**
     * Complete payment - show success or failure
     */
    completePayment() {
        this.processingModal.classList.add('hidden');

        // 20% chance of failure
        const isSuccess = Math.random() > 0.2;

        if (isSuccess) {
            this.showSuccessModal();
        } else {
            this.showFailureModal();
        }

        this.isProcessing = false;
    }

    /**
     * Show success modal
     */
    showSuccessModal() {
        const now = new Date();
        document.getElementById('txnId').textContent = this.currentPaymentData.transactionId;
        document.getElementById('successOrderId').textContent = this.currentPaymentData.orderId;
        document.getElementById('successAmount').textContent = '₹' + this.currentPaymentData.amount.toFixed(2);
        document.getElementById('successDate').textContent = now.toLocaleDateString();
        document.getElementById('successTime').textContent = now.toLocaleTimeString();

        this.successModal.classList.remove('hidden');
        UIUtils.showToast('Payment Successful', 'success');
    }

    /**
     * Show failure modal
     */
    showFailureModal() {
        const failureReasons = [
            'Insufficient Balance',
            'Network Error',
            'Transaction Cancelled',
            'Timeout'
        ];

        const reason = failureReasons[Math.floor(Math.random() * failureReasons.length)];
        document.getElementById('failureReason').textContent = reason;

        this.failureModal.classList.remove('hidden');
        UIUtils.showToast('Payment Failed', 'error');
    }

    /**
     * Download receipt
     */
    downloadReceipt() {
        const receiptData = {
            transactionId: this.currentPaymentData.transactionId,
            orderId: this.currentPaymentData.orderId,
            amount: this.currentPaymentData.amount,
            merchantName: this.currentPaymentData.merchantName,
            customerName: this.currentPaymentData.customerName,
            customerEmail: this.currentPaymentData.customerEmail,
            paymentMethod: this.currentPaymentMethod,
            timestamp: new Date()
        };

        Receipt.generateAndDownload(receiptData);
        UIUtils.showToast('Receipt Downloaded', 'success');
    }

    /**
     * Continue shopping
     */
    continueShoppingAfterSuccess() {
        this.closeAllModals();
        this.resetForm();
    }

    /**
     * Retry payment
     */
    retryPayment() {
        this.closeAllModals();
        this.openPaymentGateway(this.currentPaymentData);
    }

    /**
     * Close payment modal
     */
    closeModal() {
        if (!this.isProcessing) {
            this.paymentModal.classList.add('hidden');
            this.resetForm();
        }
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        this.paymentModal.classList.add('hidden');
        this.processingModal.classList.add('hidden');
        this.successModal.classList.add('hidden');
        this.failureModal.classList.add('hidden');
        this.resetForm();
    }

    /**
     * Reset form fields
     */
    resetForm() {
        // Reset card form
        document.getElementById('cardNumber').value = '';
        document.getElementById('cardHolder').value = '';
        document.getElementById('cardExpiry').value = '';
        document.getElementById('cardCvv').value = '';
        document.getElementById('cardNumberDisplay').textContent = '•••• •••• •••• ••••';
        document.getElementById('cardHolderDisplay').textContent = 'CARDHOLDER NAME';
        document.getElementById('cardExpiryDisplay').textContent = 'MM/YY';
        document.getElementById('cardIconDisplay').textContent = '💳';

        // Reset UPI form
        document.getElementById('upiId').value = '';
        document.getElementById('upiVerification').classList.add('hidden');
        document.querySelectorAll('.upi-app').forEach(btn => btn.classList.remove('active'));

        // Reset bank select
        document.getElementById('bankSelect').selectedIndex = 0;

        // Reset tabs
        const firstTab = document.querySelector('.tab-btn');
        if (firstTab) this.switchTab(firstTab);

        // Reset processing steps
        document.querySelectorAll('.processing-steps .step').forEach(step => {
            step.classList.remove('active', 'completed');
        });
    }

    /**
     * Generate random order ID
     */
    generateOrderId() {
        const random = Math.floor(Math.random() * 1000000000);
        return 'ORD' + String(random).padStart(9, '0');
    }

    /**
     * Generate random transaction ID
     */
    generateTransactionId() {
        const random = Math.floor(Math.random() * 1000000000);
        return 'TXN' + String(random).padStart(9, '0');
    }
}

// Global function to open payment gateway from outside
window.openPaymentGateway = function(config) {
    app.openPaymentGateway(config);
};

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new PaymentGatewayApp();
    console.log('Payment Gateway Initialized');
    console.log('Usage: openPaymentGateway({ amount: 499, customerName: "John", customerEmail: "john@example.com", customerPhone: "9876543210", merchantName: "Store" })');
});
