/* ============================================
   PAYMENT GATEWAY - UI UTILITIES (namespaced)
   ============================================ */

window.PaymentGateway = window.PaymentGateway || {};

PaymentGateway.UIUtils = {
    showToast: function(message, type = 'info', duration = 3000) {
        const container = document.getElementById('pgToastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast ' + type;

        const msg = document.createElement('div');
        msg.className = 'toast-message';
        msg.textContent = message;

        toast.appendChild(msg);
        container.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => {
                toast.classList.add('removing');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    },

    formatCurrency: function(amount) {
        return '₹' + Number(amount || 0).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
};

