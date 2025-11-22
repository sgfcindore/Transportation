/**
 * DUPLICATION FIX MODULE
 * Prevents duplicate LR numbers, challans, and records
 * Add this file AFTER dashboard-fixes.js
 */

(function() {
  'use strict';
  
  console.log('🔧 Loading duplication prevention module...');
  
  /**
   * Track form submissions to prevent double-clicks
   */
  const submittingForms = new Set();
  
  /**
   * Prevent double form submissions
   */
  function preventDoubleSubmit(formId) {
    if (submittingForms.has(formId)) {
      console.warn('⚠️ Form already submitting:', formId);
      return false; // Prevent submission
    }
    submittingForms.add(formId);
    return true; // Allow submission
  }
  
  /**
   * Allow form to be submitted again
   */
  function allowFormResubmit(formId) {
    submittingForms.delete(formId);
  }
  
  /**
   * Check if LR number already exists
   */
  window.checkLRNumberExists = function(lrNumber, excludeId = null) {
    if (!lrNumber || !window.allRecords) return false;
    
    const normalized = lrNumber.trim().toUpperCase();
    
    return window.allRecords.some(record => {
      // Check both booking and non-booking LRs
      if ((record.type === 'booking_lr' || record.type === 'non_booking_lr')) {
        const recordLR = (record.lrNumber || '').trim().toUpperCase();
        const isSameLR = recordLR === normalized;
        const isDifferentRecord = record.__backendId !== excludeId;
        return isSameLR && isDifferentRecord;
      }
      return false;
    });
  };
  
  /**
   * Check if Challan number already exists
   */
  window.checkChallanNumberExists = function(challanNumber, excludeId = null) {
    if (!challanNumber || !window.allRecords) return false;
    
    const normalized = challanNumber.trim().toUpperCase();
    
    return window.allRecords.some(record => {
      if (record.type === 'challan') {
        const recordChallan = (record.challanNumber || '').trim().toUpperCase();
        const isSameChallan = recordChallan === normalized;
        const isDifferentRecord = record.__backendId !== excludeId;
        return isSameChallan && isDifferentRecord;
      }
      return false;
    });
  };
  
  /**
   * Check if Bill number already exists
   */
  window.checkBillNumberExists = function(billNumber, excludeId = null) {
    if (!billNumber || !window.allRecords) return false;
    
    const normalized = billNumber.trim().toUpperCase();
    
    return window.allRecords.some(record => {
      if (record.type === 'billing') {
        const recordBill = (record.billNumber || '').trim().toUpperCase();
        const isSameBill = recordBill === normalized;
        const isDifferentRecord = record.__backendId !== excludeId;
        return isSameBill && isDifferentRecord;
      }
      return false;
    });
  };
  
  /**
   * Enhanced Firebase listener setup (prevent multiple listeners)
   */
  let firebaseListenerSetup = false;
  const originalSetupFirebaseListener = window.setupFirebaseListener;
  
  if (originalSetupFirebaseListener) {
    window.setupFirebaseListener = function() {
      if (firebaseListenerSetup) {
        console.warn('⚠️ Firebase listener already setup, skipping duplicate setup');
        return;
      }
      firebaseListenerSetup = true;
      originalSetupFirebaseListener();
      console.log('✅ Firebase listener setup (duplication prevented)');
    };
  }
  
  /**
   * Wrap form submit handlers to prevent double submissions
   */
  function wrapFormHandler(originalHandler, formName) {
    return async function(e) {
      e.preventDefault();
      
      const formId = e.target.id || formName;
      
      // Prevent double submission
      if (!preventDoubleSubmit(formId)) {
        console.warn('⚠️ Duplicate submission prevented for:', formId);
        return;
      }
      
      try {
        // Call original handler
        await originalHandler.call(this, e);
      } finally {
        // Always allow resubmit after completion (success or error)
        setTimeout(() => allowFormResubmit(formId), 1000);
      }
    };
  }
  
  /**
   * Override LR submission handlers
   */
  window.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      // Wrap Booking LR submit
      const lrForm = document.getElementById('lrForm');
      if (lrForm && window.handleLRSubmit) {
        const originalLRSubmit = window.handleLRSubmit;
        window.handleLRSubmit = async function(e) {
          e.preventDefault();
          
          // Get LR number
          const formData = new FormData(e.target);
          const lrNumber = formData.get('lrNumber');
          const isEditing = e.target.dataset.editingId;
          
          // Check for duplicate LR number (only for new LRs)
          if (!isEditing && lrNumber) {
            if (window.checkLRNumberExists(lrNumber)) {
              alert(`⚠️ DUPLICATE LR NUMBER!\n\nLR Number "${lrNumber}" already exists in the system.\n\nPlease use a different LR number.`);
              return;
            }
          }
          
          // Prevent double submission
          if (!preventDoubleSubmit('lrForm')) {
            return;
          }
          
          try {
            await originalLRSubmit.call(this, e);
          } finally {
            setTimeout(() => allowFormResubmit('lrForm'), 1000);
          }
        };
        
        // Re-attach the wrapped handler
        lrForm.removeEventListener('submit', window.handleLRSubmit);
        lrForm.addEventListener('submit', window.handleLRSubmit);
        console.log('✅ Booking LR form protected from duplicates');
      }
      
      // Wrap Non-Booking LR submit
      const nonBookingLRForm = document.getElementById('nonBookingLRForm');
      if (nonBookingLRForm && window.handleNonBookingLRSubmit) {
        const originalNonBookingSubmit = window.handleNonBookingLRSubmit;
        window.handleNonBookingLRSubmit = async function(e) {
          e.preventDefault();
          
          // Get LR number
          const formData = new FormData(e.target);
          const lrNumber = formData.get('lrNumber');
          const isEditing = e.target.dataset.editingId;
          
          // Check for duplicate LR number (only for new LRs)
          if (!isEditing && lrNumber) {
            if (window.checkLRNumberExists(lrNumber)) {
              alert(`⚠️ DUPLICATE LR NUMBER!\n\nLR Number "${lrNumber}" already exists in the system.\n\nPlease use a different LR number.`);
              return;
            }
          }
          
          // Prevent double submission
          if (!preventDoubleSubmit('nonBookingLRForm')) {
            return;
          }
          
          try {
            await originalNonBookingSubmit.call(this, e);
          } finally {
            setTimeout(() => allowFormResubmit('nonBookingLRForm'), 1000);
          }
        };
        
        // Re-attach the wrapped handler
        nonBookingLRForm.removeEventListener('submit', window.handleNonBookingLRSubmit);
        nonBookingLRForm.addEventListener('submit', window.handleNonBookingLRSubmit);
        console.log('✅ Non-Booking LR form protected from duplicates');
      }
      
      // Wrap Challan submit
      const challanForm = document.getElementById('challanForm');
      if (challanForm && window.handleChallanBookSubmit) {
        const originalChallanSubmit = window.handleChallanBookSubmit;
        window.handleChallanBookSubmit = async function(e) {
          e.preventDefault();
          
          // Get challan number
          const formData = new FormData(e.target);
          const challanNumber = formData.get('challanNumber');
          const isEditing = e.target.dataset.editingId;
          
          // Check for duplicate challan number (only for new challans)
          if (!isEditing && challanNumber) {
            if (window.checkChallanNumberExists(challanNumber)) {
              alert(`⚠️ DUPLICATE CHALLAN NUMBER!\n\nChallan Number "${challanNumber}" already exists in the system.\n\nPlease use a different challan number.`);
              return;
            }
          }
          
          // Prevent double submission
          if (!preventDoubleSubmit('challanForm')) {
            return;
          }
          
          try {
            await originalChallanSubmit.call(this, e);
          } finally {
            setTimeout(() => allowFormResubmit('challanForm'), 1000);
          }
        };
        
        // Re-attach the wrapped handler
        challanForm.removeEventListener('submit', window.handleChallanBookSubmit);
        challanForm.addEventListener('submit', window.handleChallanBookSubmit);
        console.log('✅ Challan form protected from duplicates');
      }
      
      // Wrap Billing submit
      const billingForm = document.getElementById('billingForm');
      if (billingForm && window.handleBillingSubmit) {
        const originalBillingSubmit = window.handleBillingSubmit;
        window.handleBillingSubmit = async function(e) {
          e.preventDefault();
          
          // Get bill number
          const formData = new FormData(e.target);
          const billNumber = formData.get('billNumber');
          
          // Check for duplicate bill number
          if (billNumber) {
            if (window.checkBillNumberExists(billNumber)) {
              alert(`⚠️ DUPLICATE BILL NUMBER!\n\nBill Number "${billNumber}" already exists in the system.\n\nPlease use a different bill number.`);
              return;
            }
          }
          
          // Prevent double submission
          if (!preventDoubleSubmit('billingForm')) {
            return;
          }
          
          try {
            await originalBillingSubmit.call(this, e);
          } finally {
            setTimeout(() => allowFormResubmit('billingForm'), 1000);
          }
        };
        
        // Re-attach the wrapped handler
        billingForm.removeEventListener('submit', window.handleBillingSubmit);
        billingForm.addEventListener('submit', window.handleBillingSubmit);
        console.log('✅ Billing form protected from duplicates');
      }
      
      // Wrap Daily Register submit
      const dailyRegisterForm = document.getElementById('dailyRegisterForm');
      if (dailyRegisterForm && window.handleDailyRegisterSubmit) {
        const originalDailySubmit = window.handleDailyRegisterSubmit;
        window.handleDailyRegisterSubmit = wrapFormHandler(originalDailySubmit, 'dailyRegisterForm');
        
        // Re-attach the wrapped handler
        dailyRegisterForm.removeEventListener('submit', window.handleDailyRegisterSubmit);
        dailyRegisterForm.addEventListener('submit', window.handleDailyRegisterSubmit);
        console.log('✅ Daily Register form protected from duplicates');
      }
      
    }, 2000); // Wait 2 seconds for everything to load
  });
  
  /**
   * Add visual feedback when checking for duplicates
   */
  function addDuplicateCheckToField(fieldId, checkFunction) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    field.addEventListener('blur', function() {
      const value = this.value.trim();
      if (!value) return;
      
      if (checkFunction(value)) {
        this.style.borderColor = '#dc2626';
        this.style.backgroundColor = '#fee2e2';
        
        // Show warning
        let warning = this.nextElementSibling;
        if (!warning || !warning.classList.contains('duplicate-warning')) {
          warning = document.createElement('div');
          warning.className = 'duplicate-warning text-red-600 text-sm mt-1';
          this.parentNode.insertBefore(warning, this.nextSibling);
        }
        warning.textContent = '⚠️ This number already exists!';
      } else {
        this.style.borderColor = '';
        this.style.backgroundColor = '';
        
        // Remove warning
        const warning = this.nextElementSibling;
        if (warning && warning.classList.contains('duplicate-warning')) {
          warning.remove();
        }
      }
    });
  }
  
  /**
   * Setup duplicate check on input fields
   */
  window.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      // Add duplicate check to LR number fields
      addDuplicateCheckToField('lrNumber', window.checkLRNumberExists);
      
      // Add duplicate check to Challan number field
      addDuplicateCheckToField('challanNumber', window.checkChallanNumberExists);
      
      // Add duplicate check to Bill number field
      addDuplicateCheckToField('billNumber', window.checkBillNumberExists);
      
      console.log('✅ Duplicate detection added to form fields');
    }, 2000);
  });
  
  /**
   * Disable submit buttons during submission
   */
  document.addEventListener('submit', function(e) {
    if (e.target.tagName === 'FORM') {
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn && !submitBtn.disabled) {
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner inline-block mr-2"></span>Submitting...';
        
        // Re-enable after 3 seconds (fallback)
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }, 3000);
      }
    }
  }, true);
  
  console.log('✅ Duplication prevention module loaded successfully!');
  
})();
