// ==================== PROFESSIONAL LR VIEW SYSTEM ====================
// File: js/lr-document-view.js
// FIXED VERSION - Works with allRecords array
// Add this file to your project and include it in dashboard.html
// <script src="js/lr-document-view.js"></script>

(function() {
  'use strict';

  // ==================== STYLES ====================
  const LR_STYLES = `
    <style id="lr-document-styles">
      @import url('https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi&display=swap');
      
      #lrViewModal {
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
      
      #lrViewModal.show {
        display: flex;
      }
      
      .lr-modal-container {
        background: #f5f5f5;
        border-radius: 12px;
        box-shadow: 0 25px 80px rgba(0,0,0,0.5);
        max-width: 900px;
        width: 100%;
        max-height: 95vh;
        overflow: auto;
      }
      
      .lr-modal-toolbar {
        background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
        padding: 15px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: sticky;
        top: 0;
        z-index: 10;
        border-radius: 12px 12px 0 0;
      }
      
      .lr-modal-title {
        color: #fff;
        font-size: 18px;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .lr-modal-actions {
        display: flex;
        gap: 10px;
      }
      
      .lr-modal-btn {
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
      
      .lr-modal-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
      }
      
      .lr-modal-btn.print-btn {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: #fff;
      }
      
      .lr-modal-btn.close-btn {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: #fff;
      }
      
      .lr-document-wrapper {
        padding: 25px;
        display: flex;
        justify-content: center;
        background: #e5e7eb;
      }
      
      .lr-document {
        width: 210mm;
        min-height: auto;
        padding: 10mm;
        background: #fff;
        font-family: 'Arial', sans-serif;
        font-size: 11px;
        color: #1a1a2e;
        border: 2px solid #1a1a2e;
        box-shadow: 0 15px 50px rgba(0,0,0,0.25);
      }
      
      .lr-header {
        border: 2px solid #1a1a2e;
        margin-bottom: 0;
      }
      
      .lr-header-phones {
        display: flex;
        justify-content: space-between;
        padding: 8px 15px;
        border-bottom: 1px solid #1a1a2e;
        font-size: 11px;
        font-weight: bold;
      }
      
      .lr-company-block {
        text-align: center;
        padding: 12px 15px;
        background: linear-gradient(180deg, #fff 0%, #f8f9fa 100%);
      }
      
      .lr-logo-company-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 20px;
        margin-bottom: 8px;
      }
      
      .lr-logo-box {
        width: 60px;
        height: 60px;
        border: 2px solid #1a1a2e;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #fff;
        position: relative;
      }
      
      .lr-logo-map {
        font-size: 28px;
        line-height: 1;
      }
      
      .lr-logo-label {
        font-size: 9px;
        font-weight: bold;
        color: #c41e3a;
        margin-top: 2px;
      }
      
      .lr-company-title {
        font-size: 26px;
        font-weight: bold;
        color: #c41e3a;
        text-transform: uppercase;
        letter-spacing: 2px;
        text-shadow: 1px 1px 0 rgba(0,0,0,0.1);
      }
      
      .lr-company-hindi {
        font-family: 'Tiro Devanagari Hindi', serif;
        font-size: 15px;
        color: #1a1a2e;
        margin: 4px 0;
      }
      
      .lr-company-addr {
        font-size: 12px;
        font-weight: 600;
        color: #1a1a2e;
        margin-top: 5px;
      }
      
      .lr-main-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        border: 2px solid #1a1a2e;
        border-top: none;
      }
      
      .lr-grid-col {
        padding: 10px;
        border-right: 1px solid #1a1a2e;
      }
      
      .lr-grid-col:last-child {
        border-right: none;
      }
      
      .lr-gst-section {
        margin-bottom: 12px;
      }
      
      .lr-gst-title {
        font-size: 10px;
        font-weight: bold;
        color: #c41e3a;
        margin-bottom: 4px;
      }
      
      .lr-gstin-row {
        display: flex;
        margin-top: 6px;
      }
      
      .lr-gstin-cell {
        width: 15px;
        height: 20px;
        border: 1px solid #1a1a2e;
        text-align: center;
        font-size: 10px;
        font-weight: bold;
        line-height: 20px;
        background: #fff;
      }
      
      .lr-copy-banner {
        background: linear-gradient(135deg, #1a1a2e 0%, #2d3748 100%);
        color: #fff;
        padding: 8px;
        font-size: 12px;
        font-weight: bold;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 2px;
        margin: -10px -10px 10px -10px;
      }
      
      .lr-insurance-block {
        font-size: 9px;
        text-align: center;
        line-height: 1.4;
      }
      
      .lr-insurance-heading {
        font-weight: bold;
        text-decoration: underline;
        margin-bottom: 3px;
        font-size: 10px;
      }
      
      .lr-pan-badge {
        background: linear-gradient(135deg, #c41e3a 0%, #9f1239 100%);
        color: #fff;
        padding: 4px 12px;
        font-size: 10px;
        font-weight: bold;
        display: inline-block;
        margin-top: 10px;
        border-radius: 3px;
      }
      
      .lr-field-row {
        display: flex;
        margin-bottom: 8px;
        align-items: center;
      }
      
      .lr-field-label {
        font-size: 11px;
        font-weight: bold;
        width: 60px;
        color: #1a1a2e;
      }
      
      .lr-field-value {
        flex: 1;
        border-bottom: 1px solid #1a1a2e;
        padding: 3px 8px;
        font-size: 14px;
        font-weight: bold;
        color: #00008b;
        font-family: 'Segoe Script', 'Bradley Hand', 'Comic Sans MS', cursive;
        min-height: 22px;
      }
      
      .lr-parties-block {
        border: 2px solid #1a1a2e;
        border-top: none;
        padding: 12px;
      }
      
      .lr-party-row {
        display: flex;
        margin-bottom: 8px;
        align-items: center;
      }
      
      .lr-party-label {
        font-size: 11px;
        font-weight: bold;
        width: 100px;
        color: #1a1a2e;
      }
      
      .lr-party-value {
        flex: 1;
        border-bottom: 1px solid #1a1a2e;
        padding: 3px 8px;
        font-size: 14px;
        font-weight: bold;
        color: #00008b;
        font-family: 'Segoe Script', 'Bradley Hand', 'Comic Sans MS', cursive;
        min-height: 24px;
      }
      
      .lr-consignment-box {
        border: 1px solid #1a1a2e;
        padding: 4px;
        margin-top: 8px;
        font-size: 9px;
        text-align: center;
        background: #fafafa;
      }
      
      .lr-goods-table {
        width: 100%;
        border-collapse: collapse;
        border: 2px solid #1a1a2e;
        border-top: none;
      }
      
      .lr-goods-table th {
        background: linear-gradient(180deg, #f0f0f0 0%, #e5e5e5 100%);
        border: 1px solid #1a1a2e;
        padding: 8px 5px;
        font-size: 10px;
        font-weight: bold;
        text-align: center;
        color: #1a1a2e;
      }
      
      .lr-goods-table td {
        border: 1px solid #1a1a2e;
        padding: 10px 6px;
        font-size: 12px;
        text-align: center;
        vertical-align: top;
      }
      
      .lr-goods-value {
        font-family: 'Segoe Script', 'Bradley Hand', 'Comic Sans MS', cursive;
        color: #00008b;
        font-size: 15px;
        font-weight: bold;
      }
      
      .lr-type-badges {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      
      .lr-type-badge {
        padding: 5px 8px;
        font-size: 9px;
        font-weight: bold;
        border: 2px solid;
        text-align: center;
        text-transform: uppercase;
      }
      
      .lr-type-badge.billed {
        border-color: #c41e3a;
        color: #c41e3a;
        background: #fff;
      }
      
      .lr-type-badge.topay {
        border-color: #1a1a2e;
        color: #1a1a2e;
        background: #f5f5f5;
      }
      
      .lr-type-badge.selected {
        background: linear-gradient(135deg, #c41e3a 0%, #9f1239 100%);
        color: #fff;
        border-color: #c41e3a;
      }
      
      .lr-charges-grid {
        font-size: 9px;
        width: 100%;
        border-collapse: collapse;
      }
      
      .lr-charges-grid td {
        padding: 2px 4px;
        border: 1px solid #1a1a2e;
      }
      
      .lr-charges-grid .val {
        text-align: right;
        font-weight: bold;
      }
      
      .lr-weight-box {
        border: 1px solid #1a1a2e;
        padding: 4px;
        margin-top: 8px;
        font-size: 9px;
        text-align: center;
        background: #fafafa;
      }
      
      .lr-footer-block {
        border: 2px solid #1a1a2e;
        border-top: none;
        padding: 10px;
        font-size: 10px;
      }
      
      .lr-footer-fields {
        display: flex;
        gap: 25px;
        margin-bottom: 8px;
        flex-wrap: wrap;
      }
      
      .lr-footer-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .lr-footer-item-label {
        font-weight: bold;
      }
      
      .lr-footer-item-value {
        border-bottom: 1px solid #1a1a2e;
        min-width: 80px;
        padding: 2px 6px;
      }
      
      .lr-disclaimer-text {
        font-size: 9px;
        line-height: 1.4;
        color: #333;
        border-top: 1px solid #1a1a2e;
        padding-top: 8px;
        margin-top: 8px;
      }
      
      .lr-signature-block {
        display: flex;
        justify-content: flex-end;
        margin-top: 15px;
      }
      
      .lr-signature-area {
        text-align: center;
        min-width: 180px;
      }
      
      .lr-signature-line {
        border-top: 1px solid #1a1a2e;
        padding-top: 5px;
        font-size: 10px;
        font-weight: bold;
      }
      
      .lr-signature-company {
        font-size: 9px;
        color: #c41e3a;
        font-weight: bold;
      }
      
      @media print {
        body * { visibility: hidden; }
        #lrViewModal, #lrViewModal * { visibility: visible; }
        #lrViewModal {
          position: absolute;
          left: 0; top: 0;
          width: 100%;
          background: white !important;
          display: block !important;
        }
        .lr-modal-toolbar { display: none !important; }
        .lr-modal-container { box-shadow: none; border-radius: 0; max-height: none; }
        .lr-document-wrapper { padding: 0; background: white; }
        .lr-document { width: 100%; border: 1px solid #000; box-shadow: none; margin: 0; padding: 8mm; }
      }
      
      @media (max-width: 768px) {
        .lr-document { width: 100%; font-size: 10px; padding: 5mm; }
        .lr-company-title { font-size: 18px; }
        .lr-main-grid { grid-template-columns: 1fr; }
        .lr-grid-col { border-right: none; border-bottom: 1px solid #1a1a2e; }
      }
    </style>
  `;

  // ==================== MODAL HTML ====================
  const LR_MODAL_HTML = `
    <div id="lrViewModal">
      <div class="lr-modal-container">
        <div class="lr-modal-toolbar">
          <div class="lr-modal-title">
            <span>📄</span>
            <span>LR Document - </span>
            <span id="lrModalNumber"></span>
          </div>
          <div class="lr-modal-actions">
            <button class="lr-modal-btn print-btn" onclick="window.printLRDocument()">
              <span>🖨️</span> Print LR
            </button>
            <button class="lr-modal-btn close-btn" onclick="window.closeLRViewModal()">
              <span>✕</span> Close
            </button>
          </div>
        </div>
        <div class="lr-document-wrapper">
          <div class="lr-document" id="lrDocContent"></div>
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
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function generateGSTBoxes(gstNumber) {
    let html = '';
    const chars = (gstNumber || '').toUpperCase().split('');
    for (let i = 0; i < 15; i++) {
      html += '<div class="lr-gstin-cell">' + (chars[i] || '') + '</div>';
    }
    return html;
  }

  // ==================== GENERATE LR DOCUMENT ====================
  function generateLRDocument(data) {
    const lrType = data.lrType || data.paymentCategory || 'To Be Billed';
    const isToPay = lrType.toLowerCase().includes('to pay');
    
    // Calculate rate per tonne if not provided
    let ratePerTonne = data.ratePerTonne || '';
    if (!ratePerTonne && data.weight && data.weight > 0) {
      const totalAmount = parseFloat(data.companyRate || data.freightAmount || 0);
      const weight = parseFloat(data.weight);
      if (weight > 0) {
        ratePerTonne = (totalAmount / weight).toFixed(2);
      }
    }
    
    return '<div class="lr-header"><div class="lr-header-phones"><div>Mob.: 94250 52481</div><div>☎ Off.: 94797 24818 / 94798 24814</div></div><div class="lr-company-block"><div class="lr-logo-company-row"><div class="lr-logo-box"><div class="lr-logo-map">🇮🇳</div><div class="lr-logo-label">SGFC</div></div><div><div class="lr-company-title">SOUTH GUJRAT FREIGHT CARRIER</div><div class="lr-company-hindi">≡ साउथ गुजरात फ्रेट केरियर ≡</div></div></div><div class="lr-company-addr">851/1/2, Kelod Kartal, 6 Lane Highway, Near Tejaji Nagar, INDORE (M.P)</div></div></div><div class="lr-main-grid"><div class="lr-grid-col"><div class="lr-gst-section"><div class="lr-gst-title">GSTIN No.: 23ABZPN6880F1Z1</div></div><div class="lr-gst-section"><div class="lr-gst-title">Consignor GSTIN No.:</div><div class="lr-gstin-row">' + generateGSTBoxes(data.consignorGST) + '</div></div><div class="lr-gst-section"><div class="lr-gst-title">Consignee GSTIN No.:</div><div class="lr-gstin-row">' + generateGSTBoxes(data.consigneeGST) + '</div></div></div><div class="lr-grid-col"><div class="lr-copy-banner">CONSIGNOR COPY</div><div class="lr-insurance-block"><div class="lr-insurance-heading">AT OWNER\'S RISK</div><div class="lr-insurance-heading">INSURANCE</div><div style="margin-top:8px;font-size:8px;line-height:1.3;">The Customer has stated that<br>He has insured the consignment OR<br>He has not insured the consignment<br>Company ................................<br>Policy No ............... Date ............<br>Amount ............... Risk ...............</div><div style="margin-top:10px;border-top:1px solid #1a1a2e;padding-top:8px;"><strong>Shipment No.</strong></div><div class="lr-pan-badge">PAN NO. ABZPN 6880F</div></div></div><div class="lr-grid-col"><div class="lr-field-row"><div class="lr-field-label">Truck No.</div><div class="lr-field-value">' + (data.truckNumber || '') + '</div></div><div class="lr-field-row"><div class="lr-field-label">Date</div><div class="lr-field-value">' + formatDate(data.lrDate || data.date) + '</div></div><div class="lr-field-row"><div class="lr-field-label">LR No.</div><div class="lr-field-value">' + (data.lrNumber || '') + '</div></div><div class="lr-field-row"><div class="lr-field-label">From</div><div class="lr-field-value">' + (data.from || '') + '</div></div><div class="lr-field-row"><div class="lr-field-label">To</div><div class="lr-field-value">' + (data.to || '') + '</div></div></div></div><div class="lr-parties-block"><div class="lr-party-row"><div class="lr-party-label">Consignor M/s.</div><div class="lr-party-value">' + (data.consignorName || data.partyName || '') + (data.consignorAddress ? ', ' + data.consignorAddress : '') + '</div><div class="lr-consignment-box"><div style="font-size:10px;margin-bottom:5px;">Consignment No.</div><div style="font-size:14px;color:#00008b;font-weight:bold;"></div></div></div><div class="lr-party-row"><div class="lr-party-label">Consignee M/s.</div><div class="lr-party-value">' + (data.consigneeName || '') + (data.consigneeAddress ? ', ' + data.consigneeAddress : '') + '</div></div><div class="lr-party-row"><div class="lr-party-label">Party Name</div><div class="lr-party-value">' + (data.partyName || data.companyName || '') + '</div></div></div><table class="lr-goods-table"><thead><tr><th style="width:60px;">No. of<br>Packages</th><th style="width:170px;">Description (Said to Contain)</th><th style="width:70px;">Weight</th><th style="width:60px;">Rate</th><th style="width:80px;">TO PAY<br>Rs.</th><th style="width:100px;">FREIGHT<br>P. &nbsp;&nbsp;&nbsp; Rs.</th><th style="width:80px;">PAID<br>P.</th></tr></thead><tbody><tr><td><div class="lr-goods-value">' + (data.quantity || '') + '</div><div style="font-size:10px;margin-top:3px;">Bags</div></td><td><div class="lr-goods-value">' + (data.productName || '') + '</div></td><td><div class="lr-goods-value">' + (data.actualWeight || data.weight || '') + '</div><div class="lr-weight-box"><strong>Charged Weight</strong><br><span class="lr-goods-value">' + (data.weight || '') + ' MT</span></div></td><td><div class="lr-goods-value">' + ratePerTonne + '</div></td><td><div class="lr-goods-value">' + (isToPay ? formatCurrency(data.companyRate || data.freightAmount || 0) : '') + '</div></td><td><table class="lr-charges-grid"><tr><td>A.O.C</td><td class="val"></td></tr><tr><td>Risk Ch.</td><td class="val"></td></tr><tr><td>Hammali</td><td class="val">' + (data.hammaliCharges || '') + '</td></tr><tr><td>St. Ch.</td><td class="val"></td></tr><tr><td>Or. Ch.</td><td class="val">' + (data.otherDeductions || '') + '</td></tr><tr style="border-top:2px solid #1a1a2e;"><td><strong>TOTAL</strong></td><td class="val"><strong>' + formatCurrency(data.companyRate || data.freightAmount || 0) + '</strong></td></tr></table></td><td><div class="lr-type-badges"><div class="lr-type-badge billed ' + (!isToPay ? 'selected' : '') + '">TO BE<br>BILLED</div><div class="lr-type-badge topay ' + (isToPay ? 'selected' : '') + '">TO<br>PAY</div></div></td></tr></tbody></table><div class="lr-footer-block"><div class="lr-footer-fields"><div class="lr-footer-item"><span class="lr-footer-item-label">Party Inv./D.O. No.</span><span class="lr-footer-item-value"></span></div><div class="lr-footer-item"><span class="lr-footer-item-label">Charged upto</span><span class="lr-footer-item-value"></span></div><div class="lr-footer-item"><span class="lr-footer-item-label">Value Rs.</span><span class="lr-footer-item-value"></span></div></div><div class="lr-disclaimer-text">Claim enquiries complaints refer to our Indore Office only. This G.C. issued. Subject to the conditions overleaf & Indore Jurisdiction.<br><strong>L.R. Must reach back within 15 days of unloading Failure of P.O.D Submission on time will lead to penalty Rs. 50/- Per day.</strong></div><div class="lr-signature-block"><div class="lr-signature-area"><div style="height:35px;"></div><div class="lr-signature-line">Authorised Signatory</div><div class="lr-signature-company">For: SOUTH GUJRAT FREIGHT CARRIER</div></div></div></div>';
  }

  // ==================== PUBLIC FUNCTIONS ====================
  
  window.showLRViewModal = function(lrData) {
    if (!document.getElementById('lrViewModal')) { initLRViewSystem(); }
    document.getElementById('lrModalNumber').textContent = lrData.lrNumber || '';
    document.getElementById('lrDocContent').innerHTML = generateLRDocument(lrData);
    document.getElementById('lrViewModal').classList.add('show');
    document.body.style.overflow = 'hidden';
  };

  window.closeLRViewModal = function() {
    var modal = document.getElementById('lrViewModal');
    if (modal) { modal.classList.remove('show'); document.body.style.overflow = ''; }
  };

  window.printLRDocument = function() { window.print(); };

  // ==================== FIXED FUNCTIONS - Use allRecords ====================
  
  /**
   * View Booking LR Document
   * FIXED: Now uses allRecords array with __backendId
   */
  window.viewBookingLRDocument = function(id) {
    // Check if allRecords exists (global variable in dashboard-main.js)
    if (typeof allRecords !== 'undefined') {
      var entry = allRecords.find(function(r) { 
        return r.__backendId === id && r.type === 'booking_lr'; 
      });
      if (entry) { 
        console.log('✅ Found Booking LR:', entry.lrNumber);
        showLRViewModal(entry); 
        return;
      }
    }
    
    // Fallback: Try appData structure (legacy)
    if (typeof appData !== 'undefined' && appData.booking_lr) {
      var legacyEntry = appData.booking_lr.find(function(e) { return e.id === id; });
      if (legacyEntry) { 
        showLRViewModal(legacyEntry); 
        return;
      }
    }
    
    console.error('❌ Booking LR not found with ID:', id);
    alert('LR document not found. Please refresh the page and try again.');
  };

  /**
   * View Non-Booking LR Document
   * FIXED: Now uses allRecords array with __backendId
   */
  window.viewNonBookingLRDocument = function(id) {
    // Check if allRecords exists (global variable in dashboard-main.js)
    if (typeof allRecords !== 'undefined') {
      var entry = allRecords.find(function(r) { 
        return r.__backendId === id && r.type === 'non_booking_lr'; 
      });
      if (entry) { 
        console.log('✅ Found Non-Booking LR:', entry.lrNumber);
        showLRViewModal(entry); 
        return;
      }
    }
    
    // Fallback: Try appData structure (legacy)
    if (typeof appData !== 'undefined' && appData.non_booking_lr) {
      var legacyEntry = appData.non_booking_lr.find(function(e) { return e.id === id; });
      if (legacyEntry) { 
        showLRViewModal(legacyEntry); 
        return;
      }
    }
    
    console.error('❌ Non-Booking LR not found with ID:', id);
    alert('LR document not found. Please refresh the page and try again.');
  };

  // ==================== INITIALIZATION ====================
  function initLRViewSystem() {
    if (!document.getElementById('lr-document-styles')) {
      document.head.insertAdjacentHTML('beforeend', LR_STYLES);
    }
    if (!document.getElementById('lrViewModal')) {
      document.body.insertAdjacentHTML('beforeend', LR_MODAL_HTML);
    }
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { closeLRViewModal(); }
    });
    var modal = document.getElementById('lrViewModal');
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === this) { closeLRViewModal(); }
      });
    }
    console.log('✅ LR Document View System initialized');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLRViewSystem);
  } else {
    initLRViewSystem();
  }

  console.log('📄 LR Document View Module loaded - viewBookingLRDocument() and viewNonBookingLRDocument() ready');

})();
