/* ============================================
   PAYMENT GATEWAY - RECEIPT GENERATION
   ============================================ */

/**
 * Receipt generation and management
 */

const Receipt = {
    /**
     * Generate receipt object
     * @param {Object} paymentData - Payment data
     * @returns {Object} - Receipt data
     */
    generate: function(paymentData) {
        const receiptNumber = this.generateReceiptNumber();
        const timestamp = paymentData.timestamp || new Date();

        return {
            receiptNumber: receiptNumber,
            transactionId: paymentData.transactionId,
            orderId: paymentData.orderId,
            merchantName: paymentData.merchantName,
            merchantAddress: 'Mumbai, India',
            customerName: paymentData.customerName,
            customerEmail: paymentData.customerEmail,
            customerPhone: paymentData.customerPhone,
            paymentMethod: paymentData.paymentMethod,
            amount: paymentData.amount,
            tax: paymentData.tax || 0,
            delivery: paymentData.delivery || 0,
            totalAmount: paymentData.amount,
            date: timestamp.toLocaleDateString('en-IN'),
            time: timestamp.toLocaleTimeString('en-IN'),
            status: 'Success',
            gstin: '27AALCT5055K1Z0'
        };
    },

    /**
     * Generate HTML receipt
     * @param {Object} receiptData - Receipt data
     * @returns {string} - HTML receipt
     */
    generateHTML: function(receiptData) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Receipt - ${receiptData.receiptNumber}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }

                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: #f5f5f5;
                        padding: 20px;
                    }

                    .receipt-container {
                        background: white;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 30px;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                        border-top: 4px solid #1a73e8;
                    }

                    .receipt-header {
                        text-align: center;
                        border-bottom: 1px solid #eee;
                        padding-bottom: 20px;
                        margin-bottom: 20px;
                    }

                    .receipt-header h1 {
                        color: #1a73e8;
                        font-size: 24px;
                        margin-bottom: 5px;
                    }

                    .receipt-header p {
                        color: #666;
                        font-size: 12px;
                    }

                    .receipt-number {
                        background: #f0f7ff;
                        padding: 10px;
                        border-radius: 4px;
                        font-size: 12px;
                        color: #1a73e8;
                        margin-top: 10px;
                        font-weight: 600;
                    }

                    .receipt-section {
                        margin-bottom: 20px;
                    }

                    .section-title {
                        font-weight: 600;
                        color: #202124;
                        font-size: 13px;
                        text-transform: uppercase;
                        border-bottom: 2px solid #1a73e8;
                        padding-bottom: 8px;
                        margin-bottom: 12px;
                    }

                    .receipt-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 8px 0;
                        font-size: 13px;
                        border-bottom: 1px solid #f0f0f0;
                    }

                    .receipt-row label {
                        color: #5f6368;
                        font-weight: 500;
                    }

                    .receipt-row strong {
                        color: #202124;
                        font-weight: 600;
                    }

                    .amount-section {
                        background: #f8f9fa;
                        padding: 12px;
                        border-radius: 4px;
                        margin: 15px 0;
                    }

                    .amount-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 6px 0;
                        font-size: 13px;
                    }

                    .amount-row.total {
                        border-top: 1px solid #ddd;
                        padding-top: 8px;
                        margin-top: 8px;
                        font-weight: 600;
                        color: #1a73e8;
                        font-size: 15px;
                    }

                    .receipt-footer {
                        text-align: center;
                        border-top: 1px solid #eee;
                        padding-top: 15px;
                        margin-top: 20px;
                        font-size: 12px;
                        color: #5f6368;
                    }

                    .success-badge {
                        display: inline-block;
                        background: #34a853;
                        color: white;
                        padding: 4px 12px;
                        border-radius: 4px;
                        font-size: 12px;
                        font-weight: 600;
                        margin: 10px 0;
                    }

                    .print-note {
                        text-align: center;
                        color: #999;
                        font-size: 11px;
                        margin-top: 20px;
                    }

                    @media print {
                        body {
                            background: white;
                            padding: 0;
                        }
                        .receipt-container {
                            box-shadow: none;
                            padding: 20px;
                        }
                        .print-note {
                            display: none;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="receipt-container">
                    <!-- Header -->
                    <div class="receipt-header">
                        <h1>🧾 Receipt</h1>
                        <p>Transaction Successful</p>
                        <div class="success-badge">✓ SUCCESS</div>
                        <div class="receipt-number">Receipt #${receiptData.receiptNumber}</div>
                    </div>

                    <!-- Merchant Information -->
                    <div class="receipt-section">
                        <div class="section-title">Merchant</div>
                        <div class="receipt-row">
                            <label>Name:</label>
                            <strong>${this.sanitize(receiptData.merchantName)}</strong>
                        </div>
                        <div class="receipt-row">
                            <label>Address:</label>
                            <strong>${this.sanitize(receiptData.merchantAddress)}</strong>
                        </div>
                        <div class="receipt-row">
                            <label>GSTIN:</label>
                            <strong>${receiptData.gstin}</strong>
                        </div>
                    </div>

                    <!-- Customer Information -->
                    <div class="receipt-section">
                        <div class="section-title">Customer</div>
                        <div class="receipt-row">
                            <label>Name:</label>
                            <strong>${this.sanitize(receiptData.customerName)}</strong>
                        </div>
                        <div class="receipt-row">
                            <label>Email:</label>
                            <strong>${this.sanitize(receiptData.customerEmail)}</strong>
                        </div>
                        <div class="receipt-row">
                            <label>Phone:</label>
                            <strong>${receiptData.customerPhone}</strong>
                        </div>
                    </div>

                    <!-- Transaction Details -->
                    <div class="receipt-section">
                        <div class="section-title">Transaction Details</div>
                        <div class="receipt-row">
                            <label>Transaction ID:</label>
                            <strong>${receiptData.transactionId}</strong>
                        </div>
                        <div class="receipt-row">
                            <label>Order ID:</label>
                            <strong>${receiptData.orderId}</strong>
                        </div>
                        <div class="receipt-row">
                            <label>Payment Method:</label>
                            <strong>${this.sanitize(receiptData.paymentMethod)}</strong>
                        </div>
                        <div class="receipt-row">
                            <label>Date:</label>
                            <strong>${receiptData.date}</strong>
                        </div>
                        <div class="receipt-row">
                            <label>Time:</label>
                            <strong>${receiptData.time}</strong>
                        </div>
                        <div class="receipt-row">
                            <label>Status:</label>
                            <strong style="color: #34a853;">${receiptData.status}</strong>
                        </div>
                    </div>

                    <!-- Amount Details -->
                    <div class="amount-section">
                        <div class="amount-row">
                            <label>Subtotal:</label>
                            <strong>₹${(receiptData.totalAmount - receiptData.tax).toFixed(2)}</strong>
                        </div>
                        <div class="amount-row">
                            <label>Tax (18%):</label>
                            <strong>₹${receiptData.tax.toFixed(2)}</strong>
                        </div>
                        <div class="amount-row">
                            <label>Delivery:</label>
                            <strong>₹${receiptData.delivery.toFixed(2)}</strong>
                        </div>
                        <div class="amount-row total">
                            <label>Total Amount:</label>
                            <strong>₹${receiptData.totalAmount.toFixed(2)}</strong>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="receipt-footer">
                        <p>Thank you for your purchase!</p>
                        <p>This is a computer-generated receipt and does not require a signature.</p>
                    </div>

                    <div class="print-note">
                        🖨️ Click Print to get a physical copy
                    </div>
                </div>
            </body>
            </html>
        `;
    },

    /**
     * Generate and download receipt
     * @param {Object} paymentData - Payment data
     */
    generateAndDownload: function(paymentData) {
        const receiptData = this.generate(paymentData);
        const html = this.generateHTML(receiptData);
        
        // Create blob and download
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Receipt-${receiptData.receiptNumber}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * Print receipt
     * @param {Object} paymentData - Payment data
     */
    print: function(paymentData) {
        const receiptData = this.generate(paymentData);
        const html = this.generateHTML(receiptData);
        
        const printWindow = window.open('', '', 'width=600,height=800');
        printWindow.document.write(html);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
        }, 250);
    },

    /**
     * Generate receipt number
     * @returns {string} - Receipt number
     */
    generateReceiptNumber: function() {
        const date = new Date();
        const dateStr = date.getFullYear() + 
                       String(date.getMonth() + 1).padStart(2, '0') + 
                       String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return dateStr + random;
    },

    /**
     * Sanitize HTML content
     * @param {string} str - String to sanitize
     * @returns {string} - Sanitized string
     */
    sanitize: function(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Receipt };
}
