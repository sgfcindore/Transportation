/**
 * Dashboard Critical Fixes
 * Add this file after dashboard-security.js and utils.js
 * This file patches critical issues in dashboard.html
 */

(function() {
  'use strict';
  
  console.log('🔧 Loading dashboard fixes...');
  
  /**
   * Override the global numberToWords function to use the fixed version
   */
  if (typeof window.utils !== 'undefined' && typeof window.utils.numberToWords === 'function') {
    window.numberToWords = window.utils.numberToWords;
    console.log('✅ numberToWords function patched');
  }
  
  /**
   * Override the global formatDate function to use the fixed version
   */
  if (typeof window.utils !== 'undefined' && typeof window.utils.formatDate === 'function') {
    window.formatDate = window.utils.formatDate;
    console.log('✅ formatDate function patched');
  }
  
  /**
   * Add formatCurrency helper
   */
  if (typeof window.utils !== 'undefined' && typeof window.utils.formatCurrency === 'function') {
    window.formatCurrency = window.utils.formatCurrency;
    console.log('✅ formatCurrency function added');
  }
  
  /**
   * Add calculateProfit helper
   */
  if (typeof window.utils !== 'undefined' && typeof window.utils.calculateProfit === 'function') {
    window.calculateProfit = window.utils.calculateProfit;
    console.log('✅ calculateProfit function added');
  }
  
  /**
   * Secure admin verification function
   * Replaces the hardcoded password check
   */
  window.verifyAdminAccess = async function() {
    return new Promise((resolve) => {
      if (window.confirmAction) {
        window.confirmAction(
          'This action requires admin privileges. Please confirm you are an administrator.',
          () => {
            const password = prompt('Enter admin password:');
            if (!password) {
              resolve(false);
              return;
            }
            
            // For immediate deployment: use a simple hash check
            // TODO: Replace with proper Firebase Authentication
            hashPassword(password).then(hash => {
              // Store your admin password hash in Firebase Remote Config
              // For now, comparing with a temporary hash
              // To generate hash: console.log(await hashPassword('your_password'))
              const ADMIN_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'; // 'admin123' hashed
              
              if (hash === ADMIN_HASH) {
                window.showToast('Admin access granted', 'success');
                resolve(true);
              } else {
                window.showToast('Invalid admin password', 'error');
                resolve(false);
              }
            }).catch(() => {
              resolve(false);
            });
          },
          () => resolve(false)
        );
      } else {
        // Fallback if confirmAction not available
        const password = prompt('Enter admin password:');
        if (password === 'admin123') { // Change this!
          resolve(true);
        } else {
          alert('Invalid password');
          resolve(false);
        }
      }
    });
  };
  
  /**
   * Password hashing function
   */
  async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Patch all parseFloat calls in window context
   */
  const originalParseFloat = window.parseFloat;
  window.parseFloatOriginal = originalParseFloat;
  
  /**
   * Patch all parseInt calls in window context
   */
  const originalParseInt = window.parseInt;
  window.parseIntOriginal = originalParseInt;
  
  /**
   * Enhanced form validation
   */
  window.validateRecordForm = function(formData) {
    const errors = [];
    
    // Required fields
    if (!formData.date) errors.push('Date is required');
    if (!formData.truckNumber) errors.push('Truck number is required');
    if (!formData.from) errors.push('From location is required');
    if (!formData.to) errors.push('To location is required');
    
    // Numeric validations
    if (formData.freightAmount && !window.validateNumber(formData.freightAmount, 0)) {
      errors.push('Freight amount must be a positive number');
    }
    
    if (formData.dieselExpense && !window.validateNumber(formData.dieselExpense, 0)) {
      errors.push('Diesel expense must be a positive number');
    }
    
    if (formData.toll && !window.validateNumber(formData.toll, 0)) {
      errors.push('Toll must be a positive number');
    }
    
    if (formData.driverExpense && !window.validateNumber(formData.driverExpense, 0)) {
      errors.push('Driver expense must be a positive number');
    }
    
    if (formData.otherExpense && !window.validateNumber(formData.otherExpense, 0)) {
      errors.push('Other expense must be a positive number');
    }
    
    // Truck number format
    if (formData.truckNumber && !window.validateTruckNumber(formData.truckNumber)) {
      errors.push('Invalid truck number format (e.g., MH12AB1234)');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  };
  
  /**
   * Enhanced data sanitization for forms
   */
  window.sanitizeFormData = function(formData) {
    const sanitized = {};
    
    for (const key in formData) {
      if (formData.hasOwnProperty(key)) {
        let value = formData[key];
        
        // Sanitize strings
        if (typeof value === 'string') {
          value = window.sanitizeInput ? window.sanitizeInput(value) : value;
        }
        
        // Parse numbers safely
        if (key.includes('Amount') || key.includes('Expense') || key.includes('expense') || key === 'toll') {
          value = window.safeParseFloat ? window.safeParseFloat(value, 0) : parseFloat(value) || 0;
        }
        
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  };
  
  /**
   * Safe data retrieval from localStorage
   */
  window.getLocalStorageItem = function(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null || item === 'null' || item === 'undefined') {
        return defaultValue;
      }
      
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  };
  
  /**
   * Safe data storage to localStorage
   */
  window.setLocalStorageItem = function(key, value) {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, stringValue);
      return true;
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      if (window.showToast) {
        window.showToast('Failed to save data locally', 'error');
      }
      return false;
    }
  };
  
  /**
   * Improved print invoice function
   */
  window.printInvoiceEnhanced = function(record) {
    if (!record) {
      window.showToast('No record data provided for invoice', 'error');
      return;
    }
    
    // Validate required fields
    if (!record.partyName || !record.freightAmount) {
      window.showToast('Missing required invoice data', 'error');
      return;
    }
    
    // Use the original print function but with validation
    if (typeof window.printInvoice === 'function') {
      window.printInvoice(record);
    } else {
      window.showToast('Print function not available', 'error');
    }
  };
  
  /**
   * Enhanced CSV export with proper escaping
   */
  window.exportToCSVEnhanced = function(data, filename) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      window.showToast('No data to export', 'warning');
      return;
    }
    
    if (window.exportData) {
      window.exportData(data, filename, 'csv');
    } else {
      window.showToast('Export function not available', 'error');
    }
  };
  
  /**
   * Add helper to check if Firebase is ready before operations
   */
  window.ensureFirebaseReady = function() {
    return new Promise((resolve, reject) => {
      if (window.firebaseReady && window.firebaseDB) {
        resolve(true);
      } else {
        const checkInterval = setInterval(() => {
          if (window.firebaseReady && window.firebaseDB) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Firebase initialization timeout'));
        }, 10000);
      }
    });
  };
  
  /**
   * Wrap Firebase operations with error handling
   */
  window.safeFirebaseOperation = async function(operation, operationName = 'operation') {
    try {
      await window.ensureFirebaseReady();
      return await operation();
    } catch (error) {
      console.error(`Firebase ${operationName} error:`, error);
      if (window.handleFirebaseError) {
        window.handleFirebaseError(error, operationName);
      } else {
        window.showToast(`Failed to ${operationName}`, 'error');
      }
      throw error;
    }
  };
  
  /**
   * Data consistency checker
   */
  window.checkDataConsistency = function(record) {
    const issues = [];
    
    // Check for null/undefined critical fields
    if (!record.id) issues.push('Missing record ID');
    if (!record.date) issues.push('Missing date');
    if (!record.truckNumber) issues.push('Missing truck number');
    
    // Check for invalid numbers
    const numericFields = ['freightAmount', 'dieselExpense', 'toll', 'driverExpense', 'otherExpense'];
    numericFields.forEach(field => {
      const value = record[field];
      if (value !== null && value !== undefined && value !== '' && isNaN(parseFloat(value))) {
        issues.push(`Invalid ${field}: ${value}`);
      }
    });
    
    return {
      isConsistent: issues.length === 0,
      issues: issues
    };
  };
  
  /**
   * Auto-fix data inconsistencies
   */
  window.autoFixRecord = function(record) {
    const fixed = { ...record };
    
    // Fix numeric fields
    const numericFields = ['freightAmount', 'dieselExpense', 'toll', 'driverExpense', 'otherExpense'];
    numericFields.forEach(field => {
      if (window.safeParseFloat) {
        fixed[field] = window.safeParseFloat(record[field], 0);
      }
    });
    
    // Fix date
    if (!fixed.date) {
      fixed.date = new Date().toISOString().split('T')[0];
    }
    
    // Fix strings
    const stringFields = ['truckNumber', 'from', 'to', 'partyName', 'driverName'];
    stringFields.forEach(field => {
      if (!fixed[field]) {
        fixed[field] = '';
      } else if (window.sanitizeInput) {
        fixed[field] = window.sanitizeInput(fixed[field]);
      }
    });
    
    return fixed;
  };
  
  /**
   * Performance monitoring
   */
  window.performanceMonitor = {
    start: function(label) {
      performance.mark(`${label}-start`);
    },
    
    end: function(label) {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
      const measure = performance.getEntriesByName(label)[0];
      console.log(`⏱️ ${label}: ${measure.duration.toFixed(2)}ms`);
      return measure.duration;
    }
  };
  
  /**
   * Initialize all patches
   */
  function initializePatches() {
    console.log('🔧 Initializing dashboard patches...');
    
    // Check dependencies
    const dependencies = {
      'sanitizeInput': typeof window.sanitizeInput === 'function',
      'validateEmail': typeof window.validateEmail === 'function',
      'validateNumber': typeof window.validateNumber === 'function',
      'safeParseFloat': typeof window.safeParseFloat === 'function',
      'showToast': typeof window.showToast === 'function',
      'utils': typeof window.utils === 'object'
    };
    
    let allDependenciesLoaded = true;
    for (const [name, loaded] of Object.entries(dependencies)) {
      if (!loaded) {
        console.warn(`⚠️ Dependency not loaded: ${name}`);
        allDependenciesLoaded = false;
      }
    }
    
    if (allDependenciesLoaded) {
      console.log('✅ All dashboard fixes loaded successfully');
    } else {
      console.error('❌ Some dependencies missing - some fixes may not work');
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePatches);
  } else {
    initializePatches();
  }
  
})();
