/* ============================================
   PAYMENT GATEWAY - MAIN APPLICATION (namespaced)
   Handles modal initialization, tab switching, and
   the complete fine payment flow. Exposes
   PaymentGateway.open(config) for external use.
   ============================================ */

window.PaymentGateway = window.PaymentGateway || {};

PaymentGateway.App = {
    paymentModal: null,
    processingModal: null,
    successModal: null,
    failureModal: null,

    currentPaymentData: null,
    currentPaymentMethod: null,
    isProcessing: false,
    onSuccessCallback: null,
    onFailureCallback: null,

    /**
     * Initialize the payment gateway with modal references
     */
    init: function() {
        this.paymentModal = document.getElementById('pgPaymentModal');
        this.processingModal = document.getElementById('pgProcessingModal');
        this.successModal = document.getElementById('pgSuccessModal');
        this.failureModal = document.getElementById('pgFailureModal');

        if (!this.paymentModal) return;

        this.attachEventListeners();
        console.log('Payment Gateway Initialized');
    },

    /**
     * Attach event listeners to all modal controls
     */
    attachEventListeners: function() {
        const closeBtn = document.getElementById('pgCloseBtn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());

        if (this.paymentModal) {
            this.paymentModal.addEventListener('click', (e) => {
                if (e.target === this.paymentModal.querySelector('.modal-overlay')) {
                    this.closeModal();
                }
            });
        }

        // Tab switching
        document.querySelectorAll('#pgPaymentModal .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.closest('.tab-btn')));
        });

        // UPI handlers
        document.querySelectorAll('#pgPaymentModal .upi-app').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectUpiApp(e.target.closest('.upi-app')));
        });

        const verifyUpiBtn = document.getElementById('pgVerifyUpiBtn');
        if (verifyUpiBtn) verifyUpiBtn.addEventListener('click', () => this.verifyUPI());

        const upiPayBtn = document.getElementById('pgUpiPayBtn');
        if (upiPayBtn) upiPayBtn.addEventListener('click', () => this.initiateUPIPayment());

        // Card handlers
        const cardNumber = document.getElementById('pgCardNumber');
        if (cardNumber) cardNumber.addEventListener('input', (e) => this.formatCardNumber(e.target));
        const cardExpiry = document.getElementById('pgCardExpiry');
        if (cardExpiry) cardExpiry.addEventListener('input', (e) => this.formatExpiry(e.target));
        const cardCvv = document.getElementById('pgCardCvv');
        if (cardCvv) cardCvv.addEventListener('input', (e) => this.formatCVV(e.target));
        const cardHolder = document.getElementById('pgCardHolder');
        if (cardHolder) cardHolder.addEventListener('input', (e) => this.updateCardHolder(e.target.value));
        const cardPayBtn = document.getElementById('pgCardPayBtn');
        if (cardPayBtn) cardPayBtn.addEventListener('click', () => this.initiateCardPayment());

        // Wallet handlers
        document.querySelectorAll('#pgPaymentModal .wallet-option').forEach(btn => {
            btn.addEventListener('click', (e) => this.initiateWalletPayment(e.target.closest('.wallet-option')));
        });

        // Net Banking handler
        const netbankingBtn = document.getElementById('pgNetbankingBtn');
        if (netbankingBtn) netbankingBtn.addEventListener('click', () => this.initiateNetBankingPayment());

        // Success/Failure handlers
        const downloadReceiptBtn = document.getElementById('pgDownloadReceiptBtn');
        if (downloadReceiptBtn) downloadReceiptBtn.addEventListener('click', () => this.downloadReceipt());
        const continueBtn = document.getElementById('pgContinueBtn');
        if (continueBtn) continueBtn.addEventListener('click', () => this.finishPayment());
        const retryBtn = document.getElementById('pgRetryBtn');
        if (retryBtn) retryBtn.addEventListener('click', () => this.retryPayment());
        const cancelBtn = document.getElementById('pgCancelBtn');
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeAllModals());
    },

    /**
     * Open the payment gateway with a configuration object
     * @param {Object} config - { amount, customerName, customerEmail, customerPhone, merchantName, issueIds, onSuccess, onFailure }
     */
    open: function(config) {
        if (!this.paymentModal) {
            console.error('Payment gateway modal not found');
            return;
        }

        // Reset to first tab
        this.resetForm();

        const defaults = {
            amount: 0,
            customerName: '',
            customerEmail: '',
            customerPhone: '',
            merchantName: 'Smart Library',
            issueIds: [],
            onSuccess: null,
            onFailure: null
        };

        const cfg = Object.assign({}, defaults, config);
        cfg.amount = Number(cfg.amount || 0);

        this.currentPaymentData = {
            amount: cfg.amount,
            tax: 0,
            delivery: 0,
            customerName: cfg.customerName,
            customerEmail: cfg.customerEmail,
            customerPhone: cfg.customerPhone,
            merchantName: cfg.merchantName,
            issueIds: cfg.issueIds || []
        };

        this.onSuccessCallback = cfg.onSuccess || null;
        this.onFailureCallback = cfg.onFailure || null;

        this.currentPaymentData.orderId = this.generateOrderId();
        this.currentPaymentData.transactionId = this.generateTransactionId();

        this.populateModalData();

        this.paymentModal.classList.remove('hidden');
        PaymentGateway.UIUtils.showToast('Payment Started', 'success');
    },

    /**
     * Populate modal with payment data
     */
    populateModalData: function() {
        const merchantName = document.getElementById('pgMerchantName');
        const orderId = document.getElementById('pgOrderId');
        const customerName = document.getElementById('pgCustomerName');
        const totalAmount = document.getElementById('pgTotalAmount');

        if (merchantName) merchantName.textContent = this.currentPaymentData.merchantName;
        if (orderId) orderId.textContent = this.currentPaymentData.orderId;
        if (customerName) customerName.textContent = this.currentPaymentData.customerName;
        if (totalAmount) totalAmount.textContent = '₹' + this.currentPaymentData.amount.toFixed(2);
    },

    /**
     * Switch between payment method tabs
     */
    switchTab: function(tabBtn) {
        if (!tabBtn) return;

        document.querySelectorAll('#pgPaymentModal .tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('#pgPaymentModal .tab-pane').forEach(pane => pane.classList.remove('active'));

        tabBtn.classList.add('active');
        const tabName = tabBtn.dataset.tab;
        const pane = document.getElementById('pgTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
        if (pane) pane.classList.add('active');
    },

    /**
     * Select UPI app
     */
    selectUpiApp: function(button) {
        if (!button) return;
        document.querySelectorAll('#pgPaymentModal .upi-app').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        this.currentPaymentMethod = button.dataset.upi;
    },

    /**
     * Verify UPI ID
     */
    verifyUPI: function() {
        const upiId = document.getElementById('pgUpiId').value.trim();
        if (!PaymentGateway.Validation.validateUPI(upiId)) {
            PaymentGateway.UIUtils.showToast('Invalid UPI ID', 'error');
            return;
        }
        const verificationDiv = document.getElementById('pgUpiVerification');
        if (verificationDiv) verificationDiv.classList.remove('hidden');
        PaymentGateway.UIUtils.showToast('UPI Verified', 'success');
    },

    /**
     * Initiate UPI payment
     */
    initiateUPIPayment: function() {
        if (!this.currentPaymentMethod) {
            PaymentGateway.UIUtils.showToast('Select UPI App', 'error');
            return;
        }
        const upiId = document.getElementById('pgUpiId').value.trim();
        if (!PaymentGateway.Validation.validateUPI(upiId)) {
            PaymentGateway.UIUtils.showToast('Invalid UPI ID', 'error');
            return;
        }
        this.processPayment('UPI');
    },

    /**
     * Format card number
     */
    formatCardNumber: function(input) {
        let value = input.value.replace(/\s/g, '');
        let formatted = '';
        for (let i = 0; i < value.length; i++) {
            if (i > 0 && i % 4 === 0) formatted += ' ';
            formatted += value[i];
        }
        input.value = formatted;

        const display = value.replace(/\s/g, '');
        const masked = display.slice(0, -4).replace(/./g, '•') + display.slice(-4);
        const formattedDisplay = masked.match(/.{1,4}/g)?.join(' ') || '•••• •••• •••• ••••';
        const el = document.getElementById('pgCardNumberDisplay');
        if (el) el.textContent = formattedDisplay;
    },

    /**
     * Format expiry date
     */
    formatExpiry: function(input) {
        let value = input.value.replace(/\D/g, '');
        if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2, 4);
        input.value = value;
        const el = document.getElementById('pgCardExpiryDisplay');
        if (el) el.textContent = value || 'MM/YY';
    },

    /**
     * Format CVV
     */
    formatCVV: function(input) {
        input.value = input.value.replace(/\D/g, '').slice(0, 3);
    },

    /**
     * Update card holder display
     */
    updateCardHolder: function(value) {
        const el = document.getElementById('pgCardHolderDisplay');
        if (el) el.textContent = value.toUpperCase() || 'CARDHOLDER NAME';
    },

    /**
     * Initiate card payment
     */
    initiateCardPayment: function() {
        const cardNumber = document.getElementById('pgCardNumber').value.replace(/\s/g, '');
        const cardHolder = document.getElementById('pgCardHolder').value.trim();
        const expiry = document.getElementById('pgCardExpiry').value;
        const cvv = document.getElementById('pgCardCvv').value;

        if (!PaymentGateway.Validation.validateCard(cardNumber, expiry, cvv)) {
            PaymentGateway.UIUtils.showToast('Invalid Card Details', 'error');
            return;
        }
        if (!cardHolder) {
            PaymentGateway.UIUtils.showToast('Enter Cardholder Name', 'error');
            return;
        }
        this.processPayment('Card');
    },

    /**
     * Initiate wallet payment
     */
    initiateWalletPayment: function(walletBtn) {
        if (!walletBtn) return;
        const walletName = walletBtn.querySelector('.wallet-name').textContent;
        this.currentPaymentMethod = walletBtn.dataset.wallet;
        this.processPayment('Wallet - ' + walletName);
    },

    /**
     * Initiate net banking payment
     */
    initiateNetBankingPayment: function() {
        const bankSelect = document.getElementById('pgBankSelect');
        if (!bankSelect || !bankSelect.value) {
            PaymentGateway.UIUtils.showToast('Select a Bank', 'error');
            return;
        }
        const selectedBank = bankSelect.options[bankSelect.selectedIndex].text;
        this.processPayment('Net Banking - ' + selectedBank);
    },

    /**
     * Process payment with animation
     */
    processPayment: function(paymentMethod) {
        if (this.isProcessing) return;

        this.isProcessing = true;
        this.currentPaymentMethod = paymentMethod;

        this.paymentModal.classList.add('hidden');
        this.processingModal.classList.remove('hidden');

        const steps = document.querySelectorAll('#pgProcessingModal .step');
        let currentStep = 0;

        const processStep = () => {
            if (currentStep < steps.length) {
                if (currentStep > 0) {
                    steps[currentStep - 1].classList.add('completed');
                }
                steps[currentStep].classList.add('active');
                currentStep++;
                setTimeout(processStep, 700);
            } else {
                setTimeout(() => this.completePayment(), 400);
            }
        };

        processStep();
    },

    /**
     * Complete payment - show success modal and fire callback
     */
    completePayment: function() {
        this.processingModal.classList.add('hidden');
        this.isProcessing = false;

        // Payment always succeeds in this demo
        this.currentPaymentData.paymentMethod = this.currentPaymentMethod;
        this.currentPaymentData.timestamp = new Date();

        this.showSuccessModal();

        if (this.onSuccessCallback) {
            this.onSuccessCallback({
                transactionId: this.currentPaymentData.transactionId,
                orderId: this.currentPaymentData.orderId,
                amount: this.currentPaymentData.amount,
                paymentMethod: this.currentPaymentMethod,
                issueIds: this.currentPaymentData.issueIds
            });
        }
    },

    /**
     * Show success modal
     */
    showSuccessModal: function() {
        const now = new Date();
        const txnId = document.getElementById('pgTxnId');
        const successOrderId = document.getElementById('pgSuccessOrderId');
        const successAmount = document.getElementById('pgSuccessAmount');
        const successDate = document.getElementById('pgSuccessDate');
        const successTime = document.getElementById('pgSuccessTime');

        if (txnId) txnId.textContent = this.currentPaymentData.transactionId;
        if (successOrderId) successOrderId.textContent = this.currentPaymentData.orderId;
        if (successAmount) successAmount.textContent = '₹' + this.currentPaymentData.amount.toFixed(2);
        if (successDate) successDate.textContent = now.toLocaleDateString();
        if (successTime) successTime.textContent = now.toLocaleTimeString();

        this.successModal.classList.remove('hidden');
        PaymentGateway.UIUtils.showToast('Payment Successful', 'success');
    },

    /**
     * Show failure modal
     */
    showFailureModal: function() {
        const reasonEl = document.getElementById('pgFailureReason');
        if (reasonEl) reasonEl.textContent = 'Transaction Failed';
        this.failureModal.classList.remove('hidden');
        PaymentGateway.UIUtils.showToast('Payment Failed', 'error');
    },

    /**
     * Download receipt
     */
    downloadReceipt: function() {
        const receiptData = {
            transactionId: this.currentPaymentData.transactionId,
            orderId: this.currentPaymentData.orderId,
            amount: this.currentPaymentData.amount,
            merchantName: this.currentPaymentData.merchantName,
            customerName: this.currentPaymentData.customerName,
            customerEmail: this.currentPaymentData.customerEmail,
            customerPhone: this.currentPaymentData.customerPhone,
            paymentMethod: this.currentPaymentData.paymentMethod,
            timestamp: this.currentPaymentData.timestamp
        };
        PaymentGateway.Receipt.generateAndDownload(receiptData);
        PaymentGateway.UIUtils.showToast('Receipt Downloaded', 'success');
    },

    /**
     * Finish payment (continue button)
     */
    finishPayment: function() {
        this.closeAllModals();
        this.resetForm();
    },

    /**
     * Retry payment
     */
    retryPayment: function() {
        this.closeAllModals();
        this.open(this.currentPaymentData);
    },

    /**
     * Close payment modal
     */
    closeModal: function() {
        if (!this.isProcessing) {
            this.paymentModal.classList.add('hidden');
            this.resetForm();
        }
    },

    /**
     * Close all modals
     */
    closeAllModals: function() {
        if (this.paymentModal) this.paymentModal.classList.add('hidden');
        if (this.processingModal) this.processingModal.classList.add('hidden');
        if (this.successModal) this.successModal.classList.add('hidden');
        if (this.failureModal) this.failureModal.classList.add('hidden');
        this.resetForm();
    },

    /**
     * Reset form fields
     */
    resetForm: function() {
        const cardNumber = document.getElementById('pgCardNumber');
        const cardHolder = document.getElementById('pgCardHolder');
        const cardExpiry = document.getElementById('pgCardExpiry');
        const cardCvv = document.getElementById('pgCardCvv');

        if (cardNumber) cardNumber.value = '';
        if (cardHolder) cardHolder.value = '';
        if (cardExpiry) cardExpiry.value = '';
        if (cardCvv) cardCvv.value = '';

        const cardNumberDisplay = document.getElementById('pgCardNumberDisplay');
        const cardHolderDisplay = document.getElementById('pgCardHolderDisplay');
        const cardExpiryDisplay = document.getElementById('pgCardExpiryDisplay');
        if (cardNumberDisplay) cardNumberDisplay.textContent = '•••• •••• •••• ••••';
        if (cardHolderDisplay) cardHolderDisplay.textContent = 'CARDHOLDER NAME';
        if (cardExpiryDisplay) cardExpiryDisplay.textContent = 'MM/YY';

        const upiId = document.getElementById('pgUpiId');
        if (upiId) upiId.value = '';
        const upiVerification = document.getElementById('pgUpiVerification');
        if (upiVerification) upiVerification.classList.add('hidden');
        document.querySelectorAll('#pgPaymentModal .upi-app').forEach(btn => btn.classList.remove('active'));

        const bankSelect = document.getElementById('pgBankSelect');
        if (bankSelect) bankSelect.selectedIndex = 0;

        // Reset tabs to UPI
        const firstTab = document.querySelector('#pgPaymentModal .tab-btn');
        if (firstTab) this.switchTab(firstTab);

        // Reset processing steps
        document.querySelectorAll('#pgProcessingModal .step').forEach(step => {
            step.classList.remove('active', 'completed');
        });
    },

    /**
     * Generate random order ID
     */
    generateOrderId: function() {
        const random = Math.floor(Math.random() * 1000000000);
        return 'ORD' + String(random).padStart(9, '0');
    },

    /**
     * Generate random transaction ID
     */
    generateTransactionId: function() {
        const random = Math.floor(Math.random() * 1000000000);
        return 'TXN' + String(random).padStart(9, '0');
    }
};

// Global function to open payment gateway from the member dashboard
window.openFinePaymentGateway = function(config) {
    PaymentGateway.App.open(config);
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    PaymentGateway.App.init();
    console.log('Payment Gateway (Library) Initialized');
    console.log('Usage: openFinePaymentGateway({ amount: 100, customerName: "John", customerEmail: "j@x.com", customerPhone: "9876543210", issueIds: [...], onSuccess: (data) => {...} })');
});

