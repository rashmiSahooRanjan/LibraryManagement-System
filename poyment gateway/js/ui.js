/* ============================================
   PAYMENT GATEWAY - UI UTILITIES
   ============================================ */

/**
 * UI utility functions for notifications and interactions
 */

const UIUtils = {
    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds (default 3000)
     */
    showToast: function(message, type = 'info', duration = 3000) {
        const toastContainer = document.getElementById('toastContainer');
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const toastMessage = document.createElement('div');
        toastMessage.className = 'toast-message';
        toastMessage.textContent = message;
        
        toast.appendChild(toastMessage);
        toastContainer.appendChild(toast);

        // Remove toast after duration
        if (duration > 0) {
            setTimeout(() => {
                toast.classList.add('removing');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            }, duration);
        }

        return toast;
    },

    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {Function} onConfirm - Callback on confirm
     * @param {Function} onCancel - Callback on cancel
     */
    showConfirm: function(message, onConfirm, onCancel) {
        const confirmed = window.confirm(message);
        if (confirmed && onConfirm) {
            onConfirm();
        } else if (!confirmed && onCancel) {
            onCancel();
        }
    },

    /**
     * Show loading spinner
     * @param {string} message - Loading message
     * @returns {HTMLElement} - Spinner element
     */
    showSpinner: function(message = 'Loading...') {
        const spinner = document.createElement('div');
        spinner.className = 'spinner-overlay';
        spinner.innerHTML = `
            <div class="spinner-content">
                <div class="spinner-ring"></div>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(spinner);
        return spinner;
    },

    /**
     * Hide loading spinner
     * @param {HTMLElement} spinner - Spinner element to hide
     */
    hideSpinner: function(spinner) {
        if (spinner) {
            spinner.remove();
        }
    },

    /**
     * Disable button
     * @param {HTMLElement} button - Button to disable
     */
    disableButton: function(button) {
        button.disabled = true;
        button.style.opacity = '0.5';
        button.style.cursor = 'not-allowed';
    },

    /**
     * Enable button
     * @param {HTMLElement} button - Button to enable
     */
    enableButton: function(button) {
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
    },

    /**
     * Show error message on field
     * @param {HTMLElement} field - Input field
     * @param {string} message - Error message
     */
    showFieldError: function(field, message) {
        field.classList.add('error');
        field.setAttribute('data-error', message);
        
        // Create error tooltip if not exists
        if (!field.nextElementSibling?.classList.contains('field-error')) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.textContent = message;
            field.after(errorDiv);
        }
    },

    /**
     * Clear field error
     * @param {HTMLElement} field - Input field
     */
    clearFieldError: function(field) {
        field.classList.remove('error');
        field.removeAttribute('data-error');
        
        // Remove error tooltip
        const errorDiv = field.nextElementSibling;
        if (errorDiv?.classList.contains('field-error')) {
            errorDiv.remove();
        }
    },

    /**
     * Focus on field
     * @param {HTMLElement} field - Field to focus
     */
    focusField: function(field) {
        field.focus();
        field.select();
    },

    /**
     * Scroll to element
     * @param {HTMLElement} element - Element to scroll to
     */
    scrollToElement: function(element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    /**
     * Animate element
     * @param {HTMLElement} element - Element to animate
     * @param {string} animationClass - Animation class name
     * @param {number} duration - Animation duration
     */
    animate: function(element, animationClass, duration = 300) {
        element.classList.add(animationClass);
        setTimeout(() => {
            element.classList.remove(animationClass);
        }, duration);
    },

    /**
     * Show/hide element
     * @param {HTMLElement} element - Element to toggle
     * @param {boolean} show - Show or hide
     */
    toggleVisibility: function(element, show) {
        if (show) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    },

    /**
     * Format currency
     * @param {number} amount - Amount to format
     * @returns {string} - Formatted currency
     */
    formatCurrency: function(amount) {
        return '₹' + amount.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },

    /**
     * Format date
     * @param {Date} date - Date to format
     * @returns {string} - Formatted date
     */
    formatDate: function(date) {
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    /**
     * Format time
     * @param {Date} date - Date to format
     * @returns {string} - Formatted time
     */
    formatTime: function(date) {
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Copy to clipboard
     * @param {string} text - Text to copy
     */
    copyToClipboard: function(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Copied to clipboard', 'success', 2000);
        }).catch(() => {
            this.showToast('Failed to copy', 'error');
        });
    },

    /**
     * Generate unique ID
     * @returns {string} - Unique ID
     */
    generateId: function() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} - Debounced function
     */
    debounce: function(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },

    /**
     * Throttle function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Limit in milliseconds
     * @returns {Function} - Throttled function
     */
    throttle: function(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Create modal
     * @param {Object} options - Modal options
     * @returns {HTMLElement} - Modal element
     */
    createModal: function(options) {
        const modal = document.createElement('div');
        modal.className = 'custom-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${options.title || 'Modal'}</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${options.content || ''}
                </div>
                <div class="modal-footer">
                    ${options.footer || ''}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        return modal;
    },

    /**
     * Get element value
     * @param {string} selector - CSS selector
     * @returns {string} - Element value
     */
    getValue: function(selector) {
        const element = document.querySelector(selector);
        return element ? element.value : '';
    },

    /**
     * Set element value
     * @param {string} selector - CSS selector
     * @param {string} value - Value to set
     */
    setValue: function(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            element.value = value;
        }
    },

    /**
     * Get element text
     * @param {string} selector - CSS selector
     * @returns {string} - Element text
     */
    getText: function(selector) {
        const element = document.querySelector(selector);
        return element ? element.textContent : '';
    },

    /**
     * Set element text
     * @param {string} selector - CSS selector
     * @param {string} text - Text to set
     */
    setText: function(selector, text) {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = text;
        }
    },

    /**
     * Add class to element
     * @param {string} selector - CSS selector
     * @param {string} className - Class name to add
     */
    addClass: function(selector, className) {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add(className);
        }
    },

    /**
     * Remove class from element
     * @param {string} selector - CSS selector
     * @param {string} className - Class name to remove
     */
    removeClass: function(selector, className) {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.remove(className);
        }
    },

    /**
     * Toggle class on element
     * @param {string} selector - CSS selector
     * @param {string} className - Class name to toggle
     */
    toggleClass: function(selector, className) {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.toggle(className);
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIUtils };
}
