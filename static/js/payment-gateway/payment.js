/* ============================================
   PAYMENT GATEWAY - PAYMENT PROCESSING (namespaced)
   ============================================ */

window.PaymentGateway = window.PaymentGateway || {};

PaymentGateway.PaymentProcessor = {
    /**
     * Simulate payment processing. In this demo the payment
     * always succeeds so the member fine flow works smoothly.
     */
    process: function(paymentData, method, callback) {
        setTimeout(() => {
            const result = {
                success: true,
                transactionId: this.generateTransactionId(),
                method: method,
                amount: paymentData.amount,
                timestamp: new Date(),
                failureReason: null
            };
            if (callback) callback(result);
        }, 1200);
    },

    processUPI: function(upiData, callback) {
        this.process(upiData, 'UPI', callback);
    },

    processCard: function(cardData, callback) {
        if (!PaymentGateway.Validation.validateCard(cardData.number, cardData.expiry, cardData.cvv)) {
            callback({ success: false, failureReason: 'Invalid Card Details' });
            return;
        }
        this.process(cardData, 'Card', callback);
    },

    processWallet: function(walletData, callback) {
        this.process(walletData, 'Wallet', callback);
    },

    processNetBanking: function(bankData, callback) {
        this.process(bankData, 'Net Banking', callback);
    },

    generateTransactionId: function() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return 'TXN' + timestamp + random;
    }
};

