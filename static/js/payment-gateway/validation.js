/* ============================================
   PAYMENT GATEWAY - VALIDATION (namespaced)
   ============================================ */

window.PaymentGateway = window.PaymentGateway || {};

PaymentGateway.Validation = {
    validateUPI: function(upiId) {
        const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]+$/;
        return upiRegex.test(upiId);
    },

    validateCardNumber: function(cardNumber) {
        const cleaned = cardNumber.replace(/\s|-/g, '');
        if (!/^\d{16}$/.test(cleaned)) return false;

        let sum = 0;
        let isEven = false;
        for (let i = cleaned.length - 1; i >= 0; i--) {
            let digit = parseInt(cleaned.charAt(i), 10);
            if (isEven) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            isEven = !isEven;
        }
        return (sum % 10) === 0;
    },

    validateExpiry: function(expiry) {
        if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
        const [month, year] = expiry.split('/');
        const monthNum = parseInt(month, 10);
        if (monthNum < 1 || monthNum > 12) return false;

        const currentYear = new Date().getFullYear() % 100;
        const currentMonth = new Date().getMonth() + 1;
        const yearNum = parseInt(year, 10);

        if (yearNum < currentYear) return false;
        if (yearNum === currentYear && monthNum < currentMonth) return false;
        return true;
    },

    validateCVV: function(cvv) {
        return /^\d{3,4}$/.test(cvv);
    },

    validateCard: function(cardNumber, expiry, cvv) {
        const cleaned = cardNumber.replace(/\s/g, '');
        if (!this.validateCardNumber(cleaned)) return false;
        if (!this.validateExpiry(expiry)) return false;
        if (!this.validateCVV(cvv)) return false;
        return true;
    },

    validateAmount: function(amount) {
        return amount > 0 && amount <= 999999;
    }
};

