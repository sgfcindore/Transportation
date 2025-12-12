// ==================== PROFESSIONAL CHALLAN VIEW SYSTEM ====================
// File: js/challan-document-view.js
// Professional Challan Document Viewer for Truck Owner Records
// Matches the LR document design style
// Add this file to your project and include it in dashboard.html
// <script src="js/challan-document-view.js"></script>

(function() {
  'use strict';

  // ==================== STYLES ====================
  const CHALLAN_STYLES = `
    <style id="challan-document-styles">
      @import url('https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi&display=swap');
      
      #challanViewModal {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(0,0,0,0.85);
        backdrop-filter: blur(4px);
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow: auto;
      }
      
      #challanViewModal.show {
        display: flex;
      }
      
      .challan-modal-container {
        background: #f5f5f5;
        border-radius: 12px;
        box-shadow: 0 25px 80px rgba(0,0,0,0.5);
        max-width: 900px;
        width: 100%;
        max-height: 95vh;
        overflow: auto;
      }
      
      .challan-modal-toolbar {
        background: linear-gradient(135deg, #065f46 0%, #047857 100%);
        padding: 15px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: sticky;
        top: 0;
        z-index: 10;
        border-radius: 12px 12px 0 0;
      }
      
      .challan-modal-title {
        color: #fff;
        font-size: 18px;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .challan-modal-actions {
        display: flex;
        gap: 10px;
      }
      
      .challan-modal-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .challan-modal-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
      }
      
      .challan-modal-btn.print-btn {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: #fff;
      }
      
      .challan-modal-btn.close-btn {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: #fff;
      }
      
      .challan-document-wrapper {
        padding: 25px;
        display: flex;
        justify-content: center;
        background: #e5e7eb;
      }
      
      .challan-document {
        width: 210mm;
        min-height: auto;
        padding: 10mm;
        background: #fff;
        font-family: 'Arial', sans-serif;
        font-size: 11px;
        color: #1a1a2e;
        border: 3px solid #065f46;
        box-shadow: 0 15px 50px rgba(0,0,0,0.25);
      }
      
      .challan-header {
        border: 2px solid #065f46;
        margin-bottom: 0;
      }
      
      .challan-header-phones {
        display: flex;
        justify-content: space-between;
        padding: 8px 15px;
        border-bottom: 1px solid #065f46;
        font-size: 11px;
        font-weight: bold;
        background: #f0fdf4;
      }
      
      .challan-company-block {
        text-align: center;
        padding: 12px 15px;
        background: linear-gradient(180deg, #fff 0%, #f0fdf4 100%);
      }
      
      .challan-logo-company-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 20px;
        margin-bottom: 8px;
      }
      
      .challan-logo-box {
        width: 60px;
        height: 60px;
        border: 2px solid #065f46;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #fff;
        position: relative;
      }
      
      .challan-logo-map {
        font-size: 28px;
        line-height: 1;
      }
      
      .challan-logo-label {
        font-size: 9px;
        font-weight: bold;
        color: #065f46;
        margin-top: 2px;
      }
      
      .challan-company-title {
        font-size: 26px;
        font-weight: bold;
        color: #065f46;
        text-transform: uppercase;
        letter-spacing: 2px;
        text-shadow: 1px 1px 0 rgba(0,0,0,0.1);
      }
      
      .challan-company-hindi {
        font-family: 'Tiro Devanagari Hindi', serif;
        font-size: 15px;
        color: #1a1a2e;
        margin: 4px 0;
      }
      
      .challan-company-addr {
        font-size: 12px;
        font-weight: 600;
        color: #1a1a2e;
        margin-top: 5px;
      }
      
      .challan-title-banner {
        background: linear-gradient(135deg, #065f46 0%, #047857 100%);
        color: #fff;
        padding: 10px;
        font-size: 18px;
        font-weight: bold;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 3px;
        border: 2px solid #065f46;
        border-top: none;
      }
      
      .challan-main-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        border: 2px solid #065f46;
        border-top: none;
      }
      
      .challan-grid-col {
        padding: 12px;
        border-right: 1px solid #065f46;
      }
      
      .challan-grid-col:last-child {
        border-right: none;
      }
      
      .challan-field-row {
        display: flex;
        margin-bottom: 10px;
        align-items: center;
      }
      
      .challan-field-label {
        font-size: 11px;
        font-weight: bold;
        width: 100px;
        color: #1a1a2e;
      }
      
      .challan-field-value {
        flex: 1;
        border-bottom: 1px solid #065f46;
        padding: 3px 8px;
        font-size: 14px;
        font-weight: bold;
        color: #00008b;
        font-family: 'Segoe Script', 'Bradley Hand', 'Comic Sans MS', cursive;
        min-height: 22px;
      }
      
      .challan-copy-badge {
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        color: #78350f;
        padding: 6px 15px;
        font-size: 11px;
        font-weight: bold;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 1px;
        border-radius: 4px;
        margin-bottom: 10px;
        display: inline-block;
      }
      
      .challan-lr-section {
        border: 2px solid #065f46;
        border-top: none;
        padding: 12px;
        background: #f0fdf4;
      }
      
      .challan-lr-title {
        font-size: 12px;
        font-weight: bold;
        color: #065f46;
        margin-bottom: 8px;
        text-transform: uppercase;
      }
      
      .challan-lr-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      
      .challan-lr-badge {
        background: #fff;
        border: 1px solid #065f46;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: bold;
        color: #065f46;
        border-radius: 4px;
      }
      
      .challan-route-section {
        border: 2px solid #065f46;
        border-top: none;
        padding: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 30px;
        background: linear-gradient(90deg, #ecfdf5 0%, #f0fdf4 50%, #ecfdf5 100%);
      }
      
      .challan-route-city {
        font-size: 20px;
        font-weight: bold;
        color: #065f46;
        font-family: 'Segoe Script', 'Bradley Hand', 'Comic Sans MS', cursive;
      }
      
      .challan-route-arrow {
        font-size: 28px;
        color: #047857;
      }
      
      .challan-details-table {
        width: 100%;
        border-collapse: collapse;
        border: 2px solid #065f46;
        border-top: none;
      }
      
      .challan-details-table th {
        background: linear-gradient(180deg, #065f46 0%, #047857 100%);
        color: #fff;
        border: 1px solid #065f46;
        padding: 10px 8px;
        font-size: 11px;
        font-weight: bold;
        text-align: center;
      }
      
      .challan-details-table td {
        border: 1px solid #065f46;
        padding: 12px 8px;
        font-size: 13px;
        text-align: center;
        vertical-align: middle;
      }
      
      .challan-value {
        font-family: 'Segoe Script', 'Bradley Hand', 'Comic Sans MS', cursive;
        color: #00008b;
        font-size: 15px;
        font-weight: bold;
      }
      
      .challan-amount-section {
        border: 2px solid #065f46;
        border-top: none;
        padding: 15px;
      }
      
      .challan-amount-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      
      .challan-amount-box {
        border: 1px solid #d1d5db;
        border-radius: 6px;
        overflow: hidden;
      }
      
      .challan-amount-box-title {
        background: #f3f4f6;
        padding: 8px 12px;
        font-weight: bold;
        font-size: 11px;
        color: #374151;
        border-bottom: 1px solid #d1d5db;
      }
      
      .challan-amount-box-content {
        padding: 10px 12px;
      }
      
      .challan-amount-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        font-size: 11px;
      }
      
      .challan-amount-row.total {
        border-top: 2px solid #065f46;
        margin-top: 8px;
        padding-top: 8px;
        font-weight: bold;
        font-size: 13px;
      }
      
      .challan-amount-label {
        color: #4b5563;
      }
      
      .challan-amount-value {
        font-weight: bold;
        color: #1f2937;
      }
      
      .challan-amount-value.positive {
        color: #059669;
      }
      
      .challan-amount-value.negative {
        color: #dc2626;
      }
      
      .challan-summary-box {
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        border: 2px solid #f59e0b;
        border-radius: 8px;
        padding: 15px;
        margin-top: 15px;
      }
      
      .challan-summary-title {
        font-size: 12px;
        font-weight: bold;
        color: #92400e;
        margin-bottom: 10px;
        text-transform: uppercase;
      }
      
      .challan-summary-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        border-bottom: 1px dashed #f59e0b;
      }
      
      .challan-summary-row:last-child {
        border-bottom: none;
        padding-top: 10px;
        margin-top: 5px;
        border-top: 2px solid #f59e0b;
      }
      
      .challan-summary-label {
        font-size: 12px;
        color: #78350f;
      }
      
      .challan-summary-value {
        font-size: 14px;
        font-weight: bold;
        color: #92400e;
      }
      
      .challan-summary-row:last-child .challan-summary-label,
      .challan-summary-row:last-child .challan-summary-value {
        font-size: 16px;
      }
      
      .challan-status-section {
        border: 2px solid #065f46;
        border-top: none;
        padding: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f9fafb;
      }
      
      .challan-status-badge {
        padding: 8px 20px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
      }
      
      .challan-status-badge.pending {
        background: #fef3c7;
        color: #92400e;
        border: 2px solid #f59e0b;
      }
      
      .challan-status-badge.partial {
        background: #dbeafe;
        color: #1e40af;
        border: 2px solid #3b82f6;
      }
      
      .challan-status-badge.completed {
        background: #d1fae5;
        color: #065f46;
        border: 2px solid #10b981;
      }
      
      .challan-footer-block {
        border: 2px solid #065f46;
        border-top: none;
        padding: 12px;
        font-size: 10px;
      }
      
      .challan-disclaimer-text {
        font-size: 9px;
        line-height: 1.5;
        color: #4b5563;
        border-top: 1px solid #065f46;
        padding-top: 10px;
        margin-top: 10px;
      }
      
      .challan-signature-block {
        display: flex;
        justify-content: space-between;
        margin-top: 20px;
        padding-top: 15px;
      }
      
      .challan-signature-area {
        text-align: center;
        min-width: 150px;
      }
      
      .challan-signature-line {
        border-top: 1px solid #1a1a2e;
        padding-top: 5px;
        font-size: 10px;
        font-weight: bold;
      }
      
      .challan-signature-company {
        font-size: 9px;
        color: #065f46;
        font-weight: bold;
      }
      
      .challan-notes-section {
        border: 2px solid #065f46;
        border-top: none;
        padding: 10px;
        background: #fffbeb;
      }
      
      .challan-notes-title {
        font-size: 10px;
        font-weight: bold;
        color: #92400e;
        margin-bottom: 5px;
      }
      
      .challan-notes-content {
        font-size: 12px;
        color: #78350f;
        font-style: italic;
      }
      
      @media print {
        body * { visibility: hidden; }
        #challanViewModal, #challanViewModal * { visibility: visible; }
        #challanViewModal {
          position: absolute;
          left: 0; top: 0;
          width: 100%;
          background: white !important;
          display: block !important;
        }
        .challan-modal-toolbar { display: none !important; }
        .challan-modal-container { box-shadow: none; border-radius: 0; max-height: none; }
        .challan-document-wrapper { padding: 0; background: white; }
        .challan-document { width: 100%; border: 2px solid #000; box-shadow: none; margin: 0; padding: 8mm; }
      }
      
      @media (max-width: 768px) {
        .challan-document { width: 100%; font-size: 10px; padding: 5mm; }
        .challan-company-title { font-size: 18px; }
        .challan-main-grid { grid-template-columns: 1fr; }
        .challan-grid-col { border-right: none; border-bottom: 1px solid #065f46; }
        .challan-amount-grid { grid-template-columns: 1fr; }
      }
    </style>
  `;

  // ==================== MODAL HTML ====================
  const CHALLAN_MODAL_HTML = `
    <div id="challanViewModal">
      <div class="challan-modal-container">
        <div class="challan-modal-toolbar">
          <div class="challan-modal-title">
            <span>📋</span>
            <span>Challan Document - </span>
            <span id="challanModalNumber"></span>
          </div>
          <div class="challan-modal-actions">
            <button class="challan-modal-btn print-btn" onclick="window.printChallanDocument()">
              <span>🖨️</span> Print Challan
            </button>
            <button class="challan-modal-btn close-btn" onclick="window.closeChallanViewModal()">
              <span>✕</span> Close
            </button>
          </div>
        </div>
        <div class="challan-document-wrapper">
          <div class="challan-document" id="challanDocContent"></div>
        </div>
      </div>
    </div>
  `;

  // ==================== HELPER FUNCTIONS ====================
  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) { return dateStr; }
  }

  function formatCurrency(amount) {
    const num = parseFloat(amount || 0);
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function getStatusClass(status) {
    if (!status) return 'pending';
    const s = status.toLowerCase();
    if (s.includes('complete') || s.includes('paid')) return 'completed';
    if (s.includes('partial')) return 'partial';
    return 'pending';
  }

  // ==================== GENERATE CHALLAN DOCUMENT ====================
  function generateChallanDocument(data) {
    // Calculate values
    const totalAmount = parseFloat(data.truckRate || 0);
    const advance = parseFloat(data.advancePaidToOwner || 0);
    const commission = parseFloat(data.commission || 0);
    const hammali = parseFloat(data.hammaliCharges || 0);
    const otherDeductions = parseFloat(data.otherDeductions || 0);
    const challanDeductions = parseFloat(data.challanDeductions || 0);
    const totalDeductions = commission + hammali + otherDeductions + challanDeductions;
    const balanceAmount = parseFloat(data.balanceAmount || (totalAmount - advance));
    const remainingBalance = parseFloat(data.remainingBalance || (balanceAmount - totalDeductions));
    
    // Get linked LR numbers
    let linkedLRs = [];
    if (data.linkedLRNumbers) {
      if (Array.isArray(data.linkedLRNumbers)) {
        linkedLRs = data.linkedLRNumbers;
      } else if (typeof data.linkedLRNumbers === 'string') {
        linkedLRs = data.linkedLRNumbers.split(',').map(lr => lr.trim()).filter(lr => lr);
      }
    }
    
    const statusClass = getStatusClass(data.status);
    
    return `
      <div class="challan-header">
        <div class="challan-header-phones">
          <div>📱 Mob.: 94250 52481</div>
          <div>☎ Off.: 94797 24818 / 94798 24814</div>
        </div>
        <div class="challan-company-block">
          <div class="challan-logo-company-row">
            <div class="challan-logo-box">
              <div class="challan-logo-map">🇮🇳</div>
              <div class="challan-logo-label">SGFC</div>
            </div>
            <div>
              <div class="challan-company-title">SOUTH GUJRAT FREIGHT CARRIER</div>
              <div class="challan-company-hindi">≡ साउथ गुजरात फ्रेट केरियर ≡</div>
            </div>
          </div>
          <div class="challan-company-addr">851/1/2, Kelod Kartal, 6 Lane Highway, Near Tejaji Nagar, INDORE (M.P)</div>
        </div>
      </div>
      
      <div class="challan-title-banner">
        🚚 TRUCK OWNER CHALLAN 🚚
      </div>
      
      <div class="challan-main-grid">
        <div class="challan-grid-col">
          <div class="challan-copy-badge">OFFICE COPY</div>
          <div class="challan-field-row">
            <div class="challan-field-label">Challan No.</div>
            <div class="challan-field-value">${data.challanNumber || ''}</div>
          </div>
          <div class="challan-field-row">
            <div class="challan-field-label">Challan Date</div>
            <div class="challan-field-value">${formatDate(data.challanDate || data.date)}</div>
          </div>
          <div class="challan-field-row">
            <div class="challan-field-label">D.R. Date</div>
            <div class="challan-field-value">${formatDate(data.dailyRegisterDate)}</div>
          </div>
        </div>
        <div class="challan-grid-col">
          <div class="challan-field-row">
            <div class="challan-field-label">Truck No.</div>
            <div class="challan-field-value">${data.truckNumber || ''}</div>
          </div>
          <div class="challan-field-row">
            <div class="challan-field-label">Truck Owner</div>
            <div class="challan-field-value">${data.truckOwner || ''}</div>
          </div>
          <div class="challan-field-row">
            <div class="challan-field-label">Driver Name</div>
            <div class="challan-field-value">${data.driverName || ''}</div>
          </div>
        </div>
      </div>
      
      ${linkedLRs.length > 0 ? `
      <div class="challan-lr-section">
        <div class="challan-lr-title">📄 Linked LR Numbers</div>
        <div class="challan-lr-list">
          ${linkedLRs.map(lr => `<span class="challan-lr-badge">${lr}</span>`).join('')}
        </div>
      </div>
      ` : ''}
      
      <div class="challan-route-section">
        <span class="challan-route-city">${data.from || 'N/A'}</span>
        <span class="challan-route-arrow">➜</span>
        <span class="challan-route-city">${data.to || 'N/A'}</span>
      </div>
      
      <table class="challan-details-table">
        <thead>
          <tr>
            <th style="width: 20%;">Actual Weight</th>
            <th style="width: 20%;">Charged Weight</th>
            <th style="width: 20%;">Rate/Tonne</th>
            <th style="width: 20%;">Total Amount</th>
            <th style="width: 20%;">Advance</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="challan-value">${data.actualWeight || '-'} MT</span></td>
            <td><span class="challan-value">${data.weight || '-'} MT</span></td>
            <td><span class="challan-value">${formatCurrency(data.ratePerTonne || 0)}</span></td>
            <td><span class="challan-value">${formatCurrency(totalAmount)}</span></td>
            <td><span class="challan-value">${formatCurrency(advance)}</span></td>
          </tr>
        </tbody>
      </table>
      
      <div class="challan-amount-section">
        <div class="challan-amount-grid">
          <div class="challan-amount-box">
            <div class="challan-amount-box-title">💰 Amount Breakdown</div>
            <div class="challan-amount-box-content">
              <div class="challan-amount-row">
                <span class="challan-amount-label">Total Truck Amount:</span>
                <span class="challan-amount-value">${formatCurrency(totalAmount)}</span>
              </div>
              <div class="challan-amount-row">
                <span class="challan-amount-label">Advance Paid:</span>
                <span class="challan-amount-value negative">- ${formatCurrency(advance)}</span>
              </div>
              <div class="challan-amount-row total">
                <span class="challan-amount-label">Balance Amount:</span>
                <span class="challan-amount-value">${formatCurrency(balanceAmount)}</span>
              </div>
            </div>
          </div>
          
          <div class="challan-amount-box">
            <div class="challan-amount-box-title">📉 Deductions</div>
            <div class="challan-amount-box-content">
              <div class="challan-amount-row">
                <span class="challan-amount-label">Commission:</span>
                <span class="challan-amount-value negative">${formatCurrency(commission)}</span>
              </div>
              <div class="challan-amount-row">
                <span class="challan-amount-label">Hammali Charges:</span>
                <span class="challan-amount-value negative">${formatCurrency(hammali)}</span>
              </div>
              <div class="challan-amount-row">
                <span class="challan-amount-label">Other Deductions:</span>
                <span class="challan-amount-value negative">${formatCurrency(otherDeductions)}</span>
              </div>
              <div class="challan-amount-row">
                <span class="challan-amount-label">Challan Deductions:</span>
                <span class="challan-amount-value negative">${formatCurrency(challanDeductions)}</span>
              </div>
              <div class="challan-amount-row total">
                <span class="challan-amount-label">Total Deductions:</span>
                <span class="challan-amount-value negative">${formatCurrency(totalDeductions)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="challan-summary-box">
          <div class="challan-summary-title">💵 Payment Summary</div>
          <div class="challan-summary-row">
            <span class="challan-summary-label">Total Truck Amount:</span>
            <span class="challan-summary-value">${formatCurrency(totalAmount)}</span>
          </div>
          <div class="challan-summary-row">
            <span class="challan-summary-label">Less: Advance Paid:</span>
            <span class="challan-summary-value">- ${formatCurrency(advance)}</span>
          </div>
          <div class="challan-summary-row">
            <span class="challan-summary-label">Less: Total Deductions:</span>
            <span class="challan-summary-value">- ${formatCurrency(totalDeductions)}</span>
          </div>
          <div class="challan-summary-row">
            <span class="challan-summary-label">REMAINING BALANCE TO PAY:</span>
            <span class="challan-summary-value" style="color: #065f46; font-size: 20px;">${formatCurrency(remainingBalance)}</span>
          </div>
        </div>
      </div>
      
      <div class="challan-status-section">
        <div>
          <strong>Payment Status:</strong>
        </div>
        <div class="challan-status-badge ${statusClass}">
          ${data.status || 'Pending'}
        </div>
      </div>
      
      ${data.notes ? `
      <div class="challan-notes-section">
        <div class="challan-notes-title">📝 Notes:</div>
        <div class="challan-notes-content">${data.notes}</div>
      </div>
      ` : ''}
      
      <div class="challan-footer-block">
        <div class="challan-signature-block">
          <div class="challan-signature-area">
            <div style="height: 40px;"></div>
            <div class="challan-signature-line">Truck Owner / Driver</div>
          </div>
          <div class="challan-signature-area">
            <div style="height: 40px;"></div>
            <div class="challan-signature-line">Received By</div>
          </div>
          <div class="challan-signature-area">
            <div style="height: 40px;"></div>
            <div class="challan-signature-line">Authorised Signatory</div>
            <div class="challan-signature-company">For: SOUTH GUJRAT FREIGHT CARRIER</div>
          </div>
        </div>
        
        <div class="challan-disclaimer-text">
          <strong>Terms & Conditions:</strong><br>
          1. Payment will be made after receiving all original documents.<br>
          2. Any discrepancy should be reported within 24 hours.<br>
          3. This challan is subject to Indore jurisdiction.<br>
          <strong>Generated on: ${new Date().toLocaleString('en-IN')}</strong>
        </div>
      </div>
    `;
  }

  // ==================== PUBLIC FUNCTIONS ====================
  
  window.showChallanViewModal = function(challanData) {
    if (!document.getElementById('challanViewModal')) { initChallanViewSystem(); }
    document.getElementById('challanModalNumber').textContent = challanData.challanNumber || '';
    document.getElementById('challanDocContent').innerHTML = generateChallanDocument(challanData);
    document.getElementById('challanViewModal').classList.add('show');
    document.body.style.overflow = 'hidden';
  };

  window.closeChallanViewModal = function() {
    var modal = document.getElementById('challanViewModal');
    if (modal) { modal.classList.remove('show'); document.body.style.overflow = ''; }
  };

  window.printChallanDocument = function() { window.print(); };

  // ==================== FIXED FUNCTIONS - Use allRecords ====================
  
  /**
   * View Challan Document
   * Uses allRecords array with __backendId
   */
  window.viewChallanDocument = function(id) {
    console.log('viewChallanDocument called with ID:', id);
    
    // Check if allRecords exists (global variable in dashboard-main.js)
    if (typeof allRecords !== 'undefined') {
      var entry = allRecords.find(function(r) { 
        return r.__backendId === id && r.type === 'challan_book'; 
      });
      if (entry) { 
        console.log('✅ Found Challan:', entry.challanNumber);
        
        // Try to get truck owner info from trucks master
        if (typeof allRecords !== 'undefined' && entry.truckNumber) {
          var truck = allRecords.find(function(r) {
            return r.type === 'truck' && r.truckNumber === entry.truckNumber;
          });
          if (truck) {
            entry.truckOwner = truck.truckOwner || '';
            entry.driverName = truck.driverName || '';
          }
        }
        
        showChallanViewModal(entry); 
        return;
      }
    }
    
    // Fallback: Try appData structure (legacy)
    if (typeof appData !== 'undefined' && appData.challan_book) {
      var legacyEntry = appData.challan_book.find(function(e) { return e.id === id; });
      if (legacyEntry) { 
        showChallanViewModal(legacyEntry); 
        return;
      }
    }
    
    console.error('❌ Challan not found with ID:', id);
    alert('Challan document not found. Please refresh the page and try again.');
  };

  /**
   * Print Challan Document
   * Uses allRecords array with __backendId
   */
  window.printChallanDocumentById = function(id) {
    console.log('printChallanDocumentById called with ID:', id);
    
    // Check if allRecords exists
    if (typeof allRecords !== 'undefined') {
      var entry = allRecords.find(function(r) { 
        return r.__backendId === id && r.type === 'challan_book'; 
      });
      if (entry) { 
        console.log('✅ Found Challan for printing:', entry.challanNumber);
        
        // Try to get truck owner info
        if (typeof allRecords !== 'undefined' && entry.truckNumber) {
          var truck = allRecords.find(function(r) {
            return r.type === 'truck' && r.truckNumber === entry.truckNumber;
          });
          if (truck) {
            entry.truckOwner = truck.truckOwner || '';
            entry.driverName = truck.driverName || '';
          }
        }
        
        showChallanViewModal(entry);
        setTimeout(function() { window.print(); }, 500);
        return;
      }
    }
    
    console.error('❌ Challan not found for printing:', id);
    alert('Challan document not found. Please refresh the page and try again.');
  };

  // ==================== INITIALIZATION ====================
  function initChallanViewSystem() {
    if (!document.getElementById('challan-document-styles')) {
      document.head.insertAdjacentHTML('beforeend', CHALLAN_STYLES);
    }
    if (!document.getElementById('challanViewModal')) {
      document.body.insertAdjacentHTML('beforeend', CHALLAN_MODAL_HTML);
    }
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { closeChallanViewModal(); }
    });
    var modal = document.getElementById('challanViewModal');
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === this) { closeChallanViewModal(); }
      });
    }
    console.log('✅ Challan Document View System initialized');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChallanViewSystem);
  } else {
    initChallanViewSystem();
  }

  console.log('📋 Challan Document View Module loaded - viewChallanDocument() and printChallanDocumentById() ready');

})();
