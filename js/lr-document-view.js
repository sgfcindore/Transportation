/**
 * LR Document View System - Professional Lorry Receipt Viewer
 * Version: 2.0 - Fixed to use allRecords array
 * 
 * IMPORTANT: This file must be loaded AFTER dashboard-main.js
 * The functions are attached to window object for global access
 */

// ============================================
// VIEW BOOKING LR DOCUMENT
// ============================================
window.viewBookingLRDocument = function(backendId) {
    console.log('viewBookingLRDocument called with ID:', backendId);
    
    // Find the LR in allRecords array (NOT appData)
    if (typeof allRecords === 'undefined' || !Array.isArray(allRecords)) {
        console.error('allRecords is not defined or not an array');
        alert('Error: Data not loaded. Please refresh the page.');
        return;
    }
    
    const lr = allRecords.find(r => r.__backendId === backendId && r.type === 'booking_lr');
    
    if (!lr) {
        console.error('LR not found with backendId:', backendId);
        console.log('Available booking LRs:', allRecords.filter(r => r.type === 'booking_lr').map(r => r.__backendId));
        alert('LR record not found. Please refresh the page and try again.');
        return;
    }
    
    console.log('Found LR:', lr);
    
    // Get related daily register entry
    let dailyEntry = null;
    if (lr.dailyEntryId) {
        dailyEntry = allRecords.find(r => r.__backendId === lr.dailyEntryId && r.type === 'daily_register');
    }
    
    // Create professional document view
    const documentHTML = generateBookingLRDocument(lr, dailyEntry);
    
    // Open in new window
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(documentHTML);
    printWindow.document.close();
};

// ============================================
// PRINT BOOKING LR DOCUMENT
// ============================================
window.printBookingLRDocument = function(backendId) {
    console.log('printBookingLRDocument called with ID:', backendId);
    
    // Find the LR in allRecords array
    if (typeof allRecords === 'undefined' || !Array.isArray(allRecords)) {
        console.error('allRecords is not defined or not an array');
        alert('Error: Data not loaded. Please refresh the page.');
        return;
    }
    
    const lr = allRecords.find(r => r.__backendId === backendId && r.type === 'booking_lr');
    
    if (!lr) {
        console.error('LR not found for printing:', backendId);
        alert('LR record not found. Please refresh the page and try again.');
        return;
    }
    
    // Get related daily register entry
    let dailyEntry = null;
    if (lr.dailyEntryId) {
        dailyEntry = allRecords.find(r => r.__backendId === lr.dailyEntryId && r.type === 'daily_register');
    }
    
    // Create document and print
    const documentHTML = generateBookingLRDocument(lr, dailyEntry);
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(documentHTML);
    printWindow.document.close();
    
    // Auto-print after content loads
    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };
};

// ============================================
// GENERATE BOOKING LR DOCUMENT HTML
// ============================================
function generateBookingLRDocument(lr, dailyEntry) {
    const companyName = 'SOUTH GUJARAT FREIGHT CARRIER';
    const companyAddress = 'Your Company Address Here';
    const companyPhone = 'Your Phone Number';
    const companyGST = 'Your GST Number';
    
    // Format date
    const lrDate = lr.lrDate ? new Date(lr.lrDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
    }) : 'N/A';
    
    // Calculate amounts
    const weight = parseFloat(lr.weight) || 0;
    const ratePerTonne = parseFloat(lr.ratePerTonne) || 0;
    const totalAmount = parseFloat(lr.companyRate) || (weight * ratePerTonne);
    const advance = parseFloat(lr.advanceToDriver) || 0;
    const balance = totalAmount - advance;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LR - ${lr.lrNumber || 'N/A'}</title>
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
            color: #333;
        }
        
        .document-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border: 3px solid #1e3a8a;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        
        /* Header Section */
        .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .header p {
            font-size: 12px;
            opacity: 0.9;
        }
        
        /* LR Title Bar */
        .lr-title-bar {
            background: #fef3c7;
            border-bottom: 2px solid #f59e0b;
            padding: 12px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .lr-number {
            font-size: 20px;
            font-weight: bold;
            color: #92400e;
        }
        
        .lr-date {
            font-size: 14px;
            color: #78350f;
            font-weight: 600;
        }
        
        .lr-type {
            background: ${lr.lrType === 'To Pay' ? '#fee2e2' : '#dcfce7'};
            color: ${lr.lrType === 'To Pay' ? '#dc2626' : '#16a34a'};
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
        }
        
        /* Content Section */
        .content {
            padding: 20px;
        }
        
        /* Info Grid */
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .info-box {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .info-box-header {
            background: #f3f4f6;
            padding: 10px 15px;
            font-weight: bold;
            color: #374151;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
        }
        
        .info-box-content {
            padding: 15px;
        }
        
        .info-row {
            display: flex;
            margin-bottom: 8px;
        }
        
        .info-row:last-child {
            margin-bottom: 0;
        }
        
        .info-label {
            width: 100px;
            font-size: 11px;
            color: #6b7280;
            font-weight: 500;
        }
        
        .info-value {
            flex: 1;
            font-size: 13px;
            color: #111827;
            font-weight: 600;
        }
        
        /* Route Section */
        .route-section {
            background: linear-gradient(90deg, #ecfdf5 0%, #f0fdf4 50%, #ecfdf5 100%);
            border: 2px solid #10b981;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .route-display {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
        }
        
        .route-city {
            font-size: 18px;
            font-weight: bold;
            color: #047857;
        }
        
        .route-arrow {
            font-size: 24px;
            color: #10b981;
        }
        
        /* Product Details Table */
        .product-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        .product-table th {
            background: #1e3a8a;
            color: white;
            padding: 12px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
        }
        
        .product-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
        }
        
        .product-table tr:nth-child(even) {
            background: #f9fafb;
        }
        
        /* Amount Summary */
        .amount-summary {
            background: #fef3c7;
            border: 2px solid #f59e0b;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .amount-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dashed #fbbf24;
        }
        
        .amount-row:last-child {
            border-bottom: none;
            padding-top: 12px;
            margin-top: 8px;
            border-top: 2px solid #f59e0b;
        }
        
        .amount-label {
            font-size: 14px;
            color: #78350f;
        }
        
        .amount-value {
            font-size: 14px;
            font-weight: bold;
            color: #92400e;
        }
        
        .amount-row:last-child .amount-label,
        .amount-row:last-child .amount-value {
            font-size: 18px;
            color: #78350f;
        }
        
        /* Signature Section */
        .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px dashed #d1d5db;
        }
        
        .signature-box {
            text-align: center;
        }
        
        .signature-line {
            border-top: 1px solid #9ca3af;
            margin-bottom: 8px;
            width: 150px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .signature-label {
            font-size: 11px;
            color: #6b7280;
        }
        
        /* Footer */
        .footer {
            background: #f3f4f6;
            padding: 15px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 11px;
            color: #6b7280;
        }
        
        /* Print Styles */
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .document-container {
                box-shadow: none;
                border: 2px solid #1e3a8a;
            }
            
            .no-print {
                display: none !important;
            }
        }
        
        /* Action Buttons */
        .action-buttons {
            text-align: center;
            padding: 20px;
            background: #f9fafb;
        }
        
        .action-btn {
            padding: 10px 25px;
            margin: 0 10px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        
        .print-btn {
            background: #1e3a8a;
            color: white;
        }
        
        .print-btn:hover {
            background: #1e40af;
        }
        
        .close-btn {
            background: #6b7280;
            color: white;
        }
        
        .close-btn:hover {
            background: #4b5563;
        }
    </style>
</head>
<body>
    <div class="document-container">
        <!-- Header -->
        <div class="header">
            <h1>${companyName}</h1>
            <p>${companyAddress} | Phone: ${companyPhone} | GST: ${companyGST}</p>
        </div>
        
        <!-- LR Title Bar -->
        <div class="lr-title-bar">
            <div class="lr-number">LR No: ${lr.lrNumber || 'N/A'}</div>
            <span class="lr-type">${lr.lrType || 'To Be Billed'}</span>
            <div class="lr-date">Date: ${lrDate}</div>
        </div>
        
        <!-- Content -->
        <div class="content">
            <!-- Route Section -->
            <div class="route-section">
                <div class="route-display">
                    <span class="route-city">${lr.from || 'N/A'}</span>
                    <span class="route-arrow">→</span>
                    <span class="route-city">${lr.to || 'N/A'}</span>
                </div>
            </div>
            
            <!-- Info Grid -->
            <div class="info-grid">
                <!-- Consignor Details -->
                <div class="info-box">
                    <div class="info-box-header">📦 CONSIGNOR DETAILS</div>
                    <div class="info-box-content">
                        <div class="info-row">
                            <span class="info-label">Name:</span>
                            <span class="info-value">${lr.consignorName || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Address:</span>
                            <span class="info-value">${lr.consignorAddress || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">GST:</span>
                            <span class="info-value">${lr.consignorGST || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Consignee Details -->
                <div class="info-box">
                    <div class="info-box-header">📍 CONSIGNEE DETAILS</div>
                    <div class="info-box-content">
                        <div class="info-row">
                            <span class="info-label">Name:</span>
                            <span class="info-value">${lr.consigneeName || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Address:</span>
                            <span class="info-value">${lr.consigneeAddress || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">GST:</span>
                            <span class="info-value">${lr.consigneeGST || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Truck Details -->
                <div class="info-box">
                    <div class="info-box-header">🚚 TRUCK DETAILS</div>
                    <div class="info-box-content">
                        <div class="info-row">
                            <span class="info-label">Truck No:</span>
                            <span class="info-value">${lr.truckNumber || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Company:</span>
                            <span class="info-value">${lr.companyName || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Billing To:</span>
                            <span class="info-value">${lr.billingTo || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Payment Details -->
                <div class="info-box">
                    <div class="info-box-header">💰 PAYMENT INFO</div>
                    <div class="info-box-content">
                        <div class="info-row">
                            <span class="info-label">Category:</span>
                            <span class="info-value">${lr.paymentCategory || lr.lrType || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Status:</span>
                            <span class="info-value">${lr.status || 'Pending'}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Product Details -->
            <table class="product-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Actual Wt (T)</th>
                        <th>Charged Wt (T)</th>
                        <th>Rate/Tonne</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${lr.productName || 'N/A'}</td>
                        <td>${lr.quantity || '0'}</td>
                        <td>${lr.actualWeight || '0'}</td>
                        <td>${weight.toFixed(2)}</td>
                        <td>₹${ratePerTonne.toFixed(2)}</td>
                        <td>₹${totalAmount.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
            
            <!-- Amount Summary -->
            <div class="amount-summary">
                <div class="amount-row">
                    <span class="amount-label">Total Amount:</span>
                    <span class="amount-value">₹${totalAmount.toFixed(2)}</span>
                </div>
                <div class="amount-row">
                    <span class="amount-label">Advance to Driver:</span>
                    <span class="amount-value">₹${advance.toFixed(2)}</span>
                </div>
                <div class="amount-row">
                    <span class="amount-label">Hammali Charges:</span>
                    <span class="amount-value">₹${(parseFloat(lr.hammaliCharges) || 0).toFixed(2)}</span>
                </div>
                <div class="amount-row">
                    <span class="amount-label">Other Deductions:</span>
                    <span class="amount-value">₹${(parseFloat(lr.otherDeductions) || 0).toFixed(2)}</span>
                </div>
                <div class="amount-row">
                    <span class="amount-label">Balance Amount:</span>
                    <span class="amount-value">₹${balance.toFixed(2)}</span>
                </div>
            </div>
            
            <!-- Signature Section -->
            <div class="signature-section">
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-label">Consignor's Signature</div>
                </div>
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-label">Driver's Signature</div>
                </div>
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-label">For ${companyName}</div>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>This is a computer-generated document. | Generated on: ${new Date().toLocaleString('en-IN')}</p>
            <p>Terms & Conditions Apply | Subject to ${lr.from || 'Origin'} Jurisdiction</p>
        </div>
    </div>
    
    <!-- Action Buttons (No Print) -->
    <div class="action-buttons no-print">
        <button class="action-btn print-btn" onclick="window.print()">🖨️ Print Document</button>
        <button class="action-btn close-btn" onclick="window.close()">✕ Close</button>
    </div>
</body>
</html>
    `;
}

// ============================================
// CONFIRMATION LOG
// ============================================
console.log('✅ LR Document View System loaded successfully');
console.log('Available functions: viewBookingLRDocument, printBookingLRDocument');
