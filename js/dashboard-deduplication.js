/**
 * DUPLICATION FIX MODULE - CORRECTED VERSION
 * Prevents duplicate LR numbers, challans, and records
 * Add this file AFTER dashboard-main.js
 */

(function() {
  'use strict';
  
  console.log('🔧 Loading duplication prevention module (CORRECTED)...');
  
  /**
   * Track form submissions to prevent double-clicks
   */
  const submittingForms = new Map(); // Changed to Map to track timestamp
  
  /**
   * Prevent double form submissions
   */
  function preventDoubleSubmit(formId) {
    const now = Date.now();
    const lastSubmit = submittingForms.get(formId);
    
    // If submitted within last 2 seconds, block it
    if (lastSubmit && (now - lastSubmit) < 2000) {
      console.warn('⚠️ Form already submitting (within 2s):', formId);
      return false; // Prevent submission
    }
    
    submittingForms.set(formId, now);
    return true; // Allow submission
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
      if (record.type === 'challan_book') {
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
   * CRITICAL: Intercept at the SDK level to prevent duplicate creates
   */
  if (window.dataSdk && window.dataSdk.create) {
    const originalCreate = window.dataSdk.create;
    let lastCreateCall = { data: null, timestamp: 0 };
    
    window.dataSdk.create = async function(data) {
      const now = Date.now();
      const dataStr = JSON.stringify(data);
      
      // Check if this is a duplicate call within 1 second with same data
      if (lastCreateCall.data === dataStr && (now - lastCreateCall.timestamp) < 1000) {
        console.warn('🚫 DUPLICATE CREATE BLOCKED:', data.type);
        return { isOk: false, error: 'Duplicate creation prevented' };
      }
      
      lastCreateCall = { data: dataStr, timestamp: now };
      console.log('✅ Creating record:', data.type);
      return await originalCreate.call(this, data);
    };
    console.log('✅ SDK create() wrapped to prevent duplicates');
  }
  
  /**
   * Add validation before form submission
   */
  window.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      
      // Daily Register Form - Add duplicate check
      const dailyRegisterForm = document.getElementById('dailyRegisterForm');
      if (dailyRegisterForm) {
        dailyRegisterForm.addEventListener('submit', function(e) {
          const formId = 'dailyRegisterForm';
          if (!preventDoubleSubmit(formId)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            console.warn('🚫 Daily Register: Double submit prevented');
            return false;
          }
        }, true); // Use capture phase to run BEFORE other handlers
        console.log('✅ Daily Register form: Duplicate prevention active');
      }
      
      // Booking LR Form - Add LR number check
      const lrForm = document.getElementById('lrForm');
      if (lrForm) {
        lrForm.addEventListener('submit', function(e) {
          const formId = 'lrForm';
          
          // Check for double submit
          if (!preventDoubleSubmit(formId)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            console.warn('🚫 Booking LR: Double submit prevented');
            return false;
          }
          
          // Check for duplicate LR number
          const formData = new FormData(e.target);
          const lrNumber = formData.get('lrNumber');
          const isEditing = window.editingLRId || e.target.dataset.editingId;
          
          if (!isEditing && lrNumber && window.checkLRNumberExists(lrNumber)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            alert(`⚠️ DUPLICATE LR NUMBER!\n\nLR Number "${lrNumber}" already exists.\n\nPlease use a different LR number.`);
            submittingForms.delete(formId); // Allow retry
            return false;
          }
        }, true);
        console.log('✅ Booking LR form: Duplicate prevention active');
      }
      
      // Non-Booking LR Form
      const nonBookingLRForm = document.getElementById('nonBookingLRForm');
      if (nonBookingLRForm) {
        nonBookingLRForm.addEventListener('submit', function(e) {
          const formId = 'nonBookingLRForm';
          
          if (!preventDoubleSubmit(formId)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            console.warn('🚫 Non-Booking LR: Double submit prevented');
            return false;
          }
          
          const formData = new FormData(e.target);
          const lrNumber = formData.get('lrNumber');
          const isEditing = window.editingNonBookingLRId || e.target.dataset.editingId;
          
          if (!isEditing && lrNumber && window.checkLRNumberExists(lrNumber)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            alert(`⚠️ DUPLICATE LR NUMBER!\n\nLR Number "${lrNumber}" already exists.\n\nPlease use a different LR number.`);
            submittingForms.delete(formId);
            return false;
          }
        }, true);
        console.log('✅ Non-Booking LR form: Duplicate prevention active');
      }
      
      // Challan Form
      const challanForm = document.getElementById('challanBookForm');
      if (challanForm) {
        challanForm.addEventListener('submit', function(e) {
          const formId = 'challanBookForm';
          
          if (!preventDoubleSubmit(formId)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            console.warn('🚫 Challan: Double submit prevented');
            return false;
          }
          
          const formData = new FormData(e.target);
          const challanNumber = formData.get('challanNumber');
          const isEditing = window.editingChallanId || e.target.dataset.editingId;
          
          if (!isEditing && challanNumber && window.checkChallanNumberExists(challanNumber)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            alert(`⚠️ DUPLICATE CHALLAN NUMBER!\n\nChallan Number "${challanNumber}" already exists.\n\nPlease use a different challan number.`);
            submittingForms.delete(formId);
            return false;
          }
        }, true);
        console.log('✅ Challan form: Duplicate prevention active');
      }
      
      // Billing Form
      const billingForm = document.getElementById('billingForm');
      if (billingForm) {
        billingForm.addEventListener('submit', function(e) {
          const formId = 'billingForm';
          
          if (!preventDoubleSubmit(formId)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            console.warn('🚫 Billing: Double submit prevented');
            return false;
          }
          
          const formData = new FormData(e.target);
          const billNumber = formData.get('billNumber');
          
          if (billNumber && window.checkBillNumberExists(billNumber)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            alert(`⚠️ DUPLICATE BILL NUMBER!\n\nBill Number "${billNumber}" already exists.\n\nPlease use a different bill number.`);
            submittingForms.delete(formId);
            return false;
          }
        }, true);
        console.log('✅ Billing form: Duplicate prevention active');
      }
      
    }, 1500); // Wait 1.5 seconds for main file to initialize
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
      // Add duplicate check to LR number fields (try multiple possible IDs)
      const lrFields = ['lrNumber', 'bookingLrNumber', 'nonBookingLrNumber'];
      lrFields.forEach(id => addDuplicateCheckToField(id, window.checkLRNumberExists));
      
      // Add duplicate check to Challan number field
      addDuplicateCheckToField('challanNumber', window.checkChallanNumberExists);
      
      // Add duplicate check to Bill number field
      addDuplicateCheckToField('billNumber', window.checkBillNumberExists);
      
      console.log('✅ Duplicate detection added to form fields');
    }, 2000);
  });
  
  /**
   * Disable submit buttons during submission (global)
   */
  document.addEventListener('submit', function(e) {
    if (e.target.tagName === 'FORM') {
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn && !submitBtn.disabled) {
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        
        // Add loading indicator if not present
        if (!originalText.includes('loading-spinner')) {
          submitBtn.innerHTML = '<span class="loading-spinner inline-block mr-2">⏳</span>Submitting...';
        }
        
        // Re-enable after 5 seconds (fallback)
        setTimeout(() => {
          if (submitBtn.disabled) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
          }
        }, 5000);
      }
    }
  }, true); // Use capture to run early
  
  console.log('✅ Duplication prevention module loaded successfully! (CORRECTED)');
  
})();
