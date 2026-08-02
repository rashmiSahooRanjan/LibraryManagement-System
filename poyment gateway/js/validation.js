/* ============================================
   PAYMENT GATEWAY - VALIDATION
   ============================================ */

/**
 * Validation utilities for payment forms
 */

const Validation = {
    /**
     * Validate UPI ID
     * @param {string} upiId - UPI ID to validate
     * @returns {boolean} - Whether UPI ID is valid
     */
    validateUPI: function(upiId) {
        // UPI ID format: abc@bankname
        const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]+$/;
        return upiRegex.test(upiId);
    },

    /**
     * Validate card number
     * @param {string} cardNumber - Card number without spaces
     * @returns {boolean} - Whether card number is valid
     */
    validateCardNumber: function(cardNumber) {
        // Remove spaces and dashes
        const cleaned = cardNumber.replace(/\s|-/g, '');

        // Check if 16 digits
        if (!/^\d{16}$/.test(cleaned)) {
            return false;
        }

        // Luhn algorithm
        let sum = 0;
        let isEven = false;

        for (let i = cleaned.length - 1; i >= 0; i--) {
            let digit = parseInt(cleaned.charAt(i), 10);

            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isEven = !isEven;
        }

        return (sum % 10) === 0;
    },

    /**
     * Validate expiry date
     * @param {string} expiry - Expiry date in MM/YY format
     * @returns {boolean} - Whether expiry date is valid
     */
    validateExpiry: function(expiry) {
        // Check format MM/YY
        if (!/^\d{2}\/\d{2}$/.test(expiry)) {
            return false;
        }

        const [month, year] = expiry.split('/');
        const monthNum = parseInt(month, 10);

        // Validate month
        if (monthNum < 1 || monthNum > 12) {
            return false;
        }

        // Validate year (must be current year or future)
        const currentYear = new Date().getFullYear() % 100;
        const currentMonth = new Date().getMonth() + 1;
        const yearNum = parseInt(year, 10);

        if (yearNum < currentYear) {
            return false;
        }

        if (yearNum === currentYear && monthNum < currentMonth) {
            return false;
        }

        return true;
    },

    /**
     * Validate CVV
     * @param {string} cvv - CVV number
     * @returns {boolean} - Whether CVV is valid
     */
    validateCVV: function(cvv) {
        // CVV should be 3-4 digits
        return /^\d{3,4}$/.test(cvv);
    },

    /**
     * Validate email
     * @param {string} email - Email address
     * @returns {boolean} - Whether email is valid
     */
    validateEmail: function(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Validate phone number
     * @param {string} phone - Phone number
     * @returns {boolean} - Whether phone number is valid
     */
    validatePhone: function(phone) {
        // 10 digit Indian phone number
        return /^\d{10}$/.test(phone.replace(/\D/g, ''));
    },

    /**
     * Validate card holder name
     * @param {string} name - Card holder name
     * @returns {boolean} - Whether name is valid
     */
    validateCardHolder: function(name) {
        return name.trim().length >= 3;
    },

    /**
     * Complete card validation
     * @param {string} cardNumber - Card number
     * @param {string} expiry - Expiry date
     * @param {string} cvv - CVV
     * @returns {boolean} - Whether all card details are valid
     */
    validateCard: function(cardNumber, expiry, cvv) {
        const cleanedCard = cardNumber.replace(/\s/g, '');
        
        if (!this.validateCardNumber(cleanedCard)) {
            return false;
        }

        if (!this.validateExpiry(expiry)) {
            return false;
        }

        if (!this.validateCVV(cvv)) {
            return false;
        }

        return true;
    },

    /**
     * Validate amount
     * @param {number} amount - Amount to validate
     * @returns {boolean} - Whether amount is valid
     */
    validateAmount: function(amount) {
        return amount > 0 && amount <= 999999;
    },

    /**
     * Check if card is expired
     * @param {string} expiry - Expiry date in MM/YY format
     * @returns {boolean} - Whether card is expired
     */
    isCardExpired: function(expiry) {
        if (!/^\d{2}\/\d{2}$/.test(expiry)) {
            return true;
        }

        const [month, year] = expiry.split('/');
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear() % 100;
        const currentMonth = currentDate.getMonth() + 1;

        const expiryYear = parseInt(year, 10);
        const expiryMonth = parseInt(month, 10);

        if (expiryYear < currentYear) {
            return true;
        }

        if (expiryYear === currentYear && expiryMonth < currentMonth) {
            return true;
        }

        return false;
    },

    /**
     * Get card type from card number
     * @param {string} cardNumber - Card number
     * @returns {string} - Card type
     */
    getCardType: function(cardNumber) {
        const cleaned = cardNumber.replace(/\s|-/g, '');

        if (/^4/.test(cleaned)) {
            return 'Visa';
        } else if (/^5[1-5]/.test(cleaned)) {
            return 'Mastercard';
        } else if (/^6/.test(cleaned)) {
            return 'RuPay';
        }

        return 'Unknown';
    },

    /**
     * Format card number for display
     * @param {string} cardNumber - Card number
     * @returns {string} - Formatted card number
     */
    formatCardNumberDisplay: function(cardNumber) {
        const cleaned = cardNumber.replace(/\s|-/g, '');
        const last4 = cleaned.slice(-4);
        const masked = '*'.repeat(cleaned.length - 4) + last4;

        // Format as groups of 4
        return masked.match(/.{1,4}/g)?.join(' ') || masked;
    },

    /**
     * Sanitize input to prevent XSS
     * @param {string} input - Input to sanitize
     * @returns {string} - Sanitized input
     */
    sanitize: function(input) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return input.replace(/[&<>"']/g, m => map[m]);
    }
};

/**
 * Form field validation with real-time feedback
 */

class FormValidator {
    constructor(formElement) {
        this.form = formElement;
        this.errors = {};
        this.setupListeners();
    }

    setupListeners() {
        if (this.form) {
            this.form.addEventListener('input', (e) => this.validateField(e.target));
            this.form.addEventListener('change', (e) => this.validateField(e.target));
        }
    }

    validateField(field) {
        const fieldName = field.name;
        let isValid = true;
        let errorMessage = '';

        switch (fieldName) {
            case 'cardNumber':
                isValid = Validation.validateCardNumber(field.value);
                errorMessage = 'Invalid card number';
                break;
            case 'cardExpiry':
                isValid = Validation.validateExpiry(field.value);
                errorMessage = 'Invalid expiry date (MM/YY)';
                break;
            case 'cardCvv':
                isValid = Validation.validateCVV(field.value);
                errorMessage = 'Invalid CVV (3-4 digits)';
                break;
            case 'upiId':
                isValid = Validation.validateUPI(field.value);
                errorMessage = 'Invalid UPI ID';
                break;
            case 'email':
                isValid = Validation.validateEmail(field.value);
                errorMessage = 'Invalid email address';
                break;
            case 'phone':
                isValid = Validation.validatePhone(field.value);
                errorMessage = 'Invalid phone number (10 digits)';
                break;
        }

        if (!isValid) {
            this.setError(fieldName, errorMessage);
        } else {
            this.clearError(fieldName);
        }

        return isValid;
    }

    setError(fieldName, message) {
        this.errors[fieldName] = message;
        const field = this.form?.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.classList.add('error');
            const errorDiv = field.parentElement?.querySelector('.error-message');
            if (errorDiv) {
                errorDiv.textContent = message;
            }
        }
    }

    clearError(fieldName) {
        delete this.errors[fieldName];
        const field = this.form?.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.classList.remove('error');
            const errorDiv = field.parentElement?.querySelector('.error-message');
            if (errorDiv) {
                errorDiv.textContent = '';
            }
        }
    }

    isValid() {
        return Object.keys(this.errors).length === 0;
    }

    getErrors() {
        return this.errors;
    }

    clearAll() {
        this.errors = {};
        if (this.form) {
            this.form.querySelectorAll('.error').forEach(field => {
                field.classList.remove('error');
            });
            this.form.querySelectorAll('.error-message').forEach(msg => {
                msg.textContent = '';
            });
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Validation, FormValidator };
}
