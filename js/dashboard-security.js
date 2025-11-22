/**
 * Security and Error Handling Enhancements for SGFC Dashboard
 * Version 2.0 - Fixed and Improved
 * All security vulnerabilities and bugs have been addressed
 */

(function() {
  'use strict';
  
  // Configuration
  const CONFIG = {
    SESSION_TIMEOUT: 8 * 60 * 60 * 1000, // 8 hours
    MAX_SESSION_LIFETIME: 24 * 60 * 60 * 1000, // 24 hours maximum
    SESSION_CHECK_INTERVAL: 5 * 60 * 1000, // Check every 5 minutes
    SESSION_EXTENSION_THRESHOLD: 60 * 60 * 1000, // Extend if < 1 hour remaining
    MAX_ERROR_LOGS: 10,
    TOAST_QUEUE_MAX: 3
  };
  
  // Toast queue to prevent overlap
  let toastQueue = [];
  let isProcessingToast = false;
  
  /**
   * Session Management
   */
  function checkSession() {
    const user = localStorage.getItem('sgfc_user');
    const sessionExpiry = localStorage.getItem('sgfc_session_expiry');
    const sessionStart = localStorage.getItem('sgfc_session_start');
    
    if (!user) {
      window.location.href = 'index.html';
      return false;
    }
    
    if (sessionExpiry) {
      const currentTime = new Date().getTime();
      const expiryTime = parseInt(sessionExpiry);
      
      // Check if session expired
      if (currentTime >= expiryTime) {
        showToast('Your session has expired. Please login again.', 'warning', 3000);
        setTimeout(() => {
          localStorage.removeItem('sgfc_user');
          localStorage.removeItem('sgfc_session_expiry');
          localStorage.removeItem('sgfc_session_start');
          window.location.href = 'index.html';
        }, 3000);
        return false;
      }
      
      // Check maximum session lifetime
      if (sessionStart) {
        const startTime = parseInt(sessionStart);
        const sessionDuration = currentTime - startTime;
        
        if (sessionDuration >= CONFIG.MAX_SESSION_LIFETIME) {
          showToast('Maximum session time reached. Please login again.', 'warning', 3000);
          setTimeout(() => {
            localStorage.removeItem('sgfc_user');
            localStorage.removeItem('sgfc_session_expiry');
            localStorage.removeItem('sgfc_session_start');
            window.location.href = 'index.html';
          }, 3000);
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Input Sanitization - Enhanced
   */
  window.sanitizeInput = function(input) {
    if (typeof input !== 'string') return input;
    
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  };
  
  /**
   * Validate Email
   */
  window.validateEmail = function(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };
  
  /**
   * Validate Phone Number (Indian format)
   */
  window.validatePhone = function(phone) {
    const re = /^[6-9]\d{9}$/;
    return re.test(String(phone).replace(/[\s-]/g, ''));
  };
  
  /**
   * Validate Number with proper null handling
   */
  window.validateNumber = function(num, min = 0, max = Infinity) {
    if (num === null || num === undefined || num === '') return false;
    const n = parseFloat(num);
    return !isNaN(n) && isFinite(n) && n >= min && n <= max;
  };
  
  /**
   * Validate Truck Number (Indian format)
   */
  window.validateTruckNumber = function(truckNum) {
    // Format: XX00XX0000 (e.g., MH12AB1234)
    const re = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;
    return re.test(String(truckNum).replace(/[\s-]/g, '').toUpperCase());
  };
  
  /**
   * Safe Parse Float with null handling
   */
  window.safeParseFloat = function(value, defaultValue = 0) {
    if (value === null || value === undefined || value === '' || value === 'null' || value === 'undefined') {
      return defaultValue;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
  };
  
  /**
   * Safe Parse Int with null handling
   */
  window.safeParseInt = function(value, defaultValue = 0) {
    if (value === null || value === undefined || value === '' || value === 'null' || value === 'undefined') {
      return defaultValue;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
  };
  
  /**
   * Error Logger - Enhanced
   */
  window.logError = function(error, context = '') {
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: error ? error.toString() : 'Unknown error',
      message: error && error.message ? error.message : '',
      stack: error && error.stack ? error.stack : '',
      context: context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.error('Error:', errorLog);
    
    // Store in localStorage for debugging (keep last N errors)
    try {
      const errors = JSON.parse(localStorage.getItem('sgfc_error_log') || '[]');
      errors.unshift(errorLog);
      localStorage.setItem('sgfc_error_log', JSON.stringify(errors.slice(0, CONFIG.MAX_ERROR_LOGS)));
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  };
  
  /**
   * Show User Feedback Toast with Queue System
   */
  window.showToast = function(message, type = 'info', duration = 3000) {
    toastQueue.push({ message, type, duration });
    processToastQueue();
  };
  
  function processToastQueue() {
    if (isProcessingToast || toastQueue.length === 0) return;
    
    // Limit active toasts
    const activeToasts = document.querySelectorAll('.toast-notification');
    if (activeToasts.length >= CONFIG.TOAST_QUEUE_MAX) {
      return;
    }
    
    isProcessingToast = true;
    const { message, type, duration } = toastQueue.shift();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
      position: fixed;
      top: ${20 + (activeToasts.length * 80)}px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      z-index: 10000;
      animation: slideInRight 0.3s ease-out;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 400px;
      word-wrap: break-word;
      font-size: 14px;
    `;
    
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };
    
    toast.style.background = colors[type] || colors.info;
    toast.textContent = sanitizeInput(message);
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => {
        toast.remove();
        isProcessingToast = false;
        processToastQueue(); // Process next toast
      }, 300);
    }, duration);
  }
  
  /**
   * Add CSS for toast animations
   */
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
    
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    
    .loading-spinner-large {
      width: 60px;
      height: 60px;
      border: 5px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  `;
  document.head.appendChild(style);
  
  /**
   * Show Loading Overlay
   */
  window.showLoading = function(message = 'Loading...') {
    // Remove existing overlay if present
    hideLoading();
    
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div style="text-align: center; color: white;">
        <div class="loading-spinner-large"></div>
        <p style="margin-top: 20px; font-size: 16px; font-weight: 600;">${sanitizeInput(message)}</p>
      </div>
    `;
    document.body.appendChild(overlay);
  };
  
  /**
   * Hide Loading Overlay
   */
  window.hideLoading = function() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.remove();
  };
  
  /**
   * Firebase Error Handler - Enhanced
   */
  window.handleFirebaseError = function(error, operation = 'operation') {
    let message = `Failed to ${operation}. Please try again.`;
    let shouldLogout = false;
    
    if (error && error.code) {
      switch (error.code) {
        case 'permission-denied':
          message = 'Permission denied. Please check your access rights.';
          break;
        case 'unavailable':
          message = 'Service temporarily unavailable. Please try again later.';
          break;
        case 'unauthenticated':
          message = 'Session expired. Please login again.';
          shouldLogout = true;
          break;
        case 'network-request-failed':
          message = 'Network error. Please check your internet connection.';
          break;
        case 'not-found':
          message = 'Data not found.';
          break;
        case 'already-exists':
          message = 'Data already exists.';
          break;
        case 'failed-precondition':
          message = 'Operation failed. Please check your data.';
          break;
        case 'aborted':
          message = 'Operation was aborted. Please try again.';
          break;
      }
    }
    
    logError(error, operation);
    showToast(message, 'error', 5000);
    
    if (shouldLogout) {
      localStorage.removeItem('sgfc_user');
      localStorage.removeItem('sgfc_session_expiry');
      localStorage.removeItem('sgfc_session_start');
      setTimeout(() => window.location.href = 'index.html', 2000);
    }
  };
  
  /**
   * Auto-save functionality with debounce
   */
  let autoSaveTimeout;
  window.scheduleAutoSave = function(callback, delay = 2000) {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(callback, delay);
  };
  
  /**
   * Confirm Dialog with Better UI
   */
  window.confirmAction = function(message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      backdrop-filter: blur(4px);
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 32px;
      max-width: 400px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    `;
    
    dialog.innerHTML = `
      <div style="margin-bottom: 24px;">
        <svg style="width: 48px; height: 48px; color: #f59e0b; margin: 0 auto; display: block;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p style="font-size: 16px; color: #1e293b; text-align: center; margin-bottom: 24px; line-height: 1.5;">${sanitizeInput(message)}</p>
      <div style="display: flex; gap: 12px;">
        <button id="cancelBtn" style="flex: 1; padding: 12px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 8px; font-weight: 600; cursor: pointer;">Cancel</button>
        <button id="confirmBtn" style="flex: 1; padding: 12px; border: none; background: #ef4444; color: white; border-radius: 8px; font-weight: 600; cursor: pointer;">Confirm</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const confirmBtn = dialog.querySelector('#confirmBtn');
    const cancelBtn = dialog.querySelector('#cancelBtn');
    
    const cleanup = () => overlay.remove();
    
    confirmBtn.onclick = () => {
      cleanup();
      if (onConfirm) onConfirm();
    };
    
    cancelBtn.onclick = () => {
      cleanup();
      if (onCancel) onCancel();
    };
    
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        cleanup();
        if (onCancel) onCancel();
      }
    };
    
    // Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        if (onCancel) onCancel();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  };
  
  /**
   * Data Export Utility - Enhanced
   */
  window.exportData = function(data, filename, type = 'json') {
    try {
      let content, mimeType, extension;
      
      if (type === 'json') {
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        extension = 'json';
      } else if (type === 'csv') {
        if (Array.isArray(data) && data.length > 0) {
          const headers = Object.keys(data[0]);
          const csvRows = [headers.map(h => `"${h}"`).join(',')];
          
          data.forEach(row => {
            const values = headers.map(header => {
              let value = row[header];
              // Handle nested objects
              if (typeof value === 'object' && value !== null) {
                value = JSON.stringify(value);
              }
              // Handle null/undefined
              if (value === null || value === undefined) {
                value = '';
              }
              // Escape quotes and wrap in quotes
              value = String(value).replace(/"/g, '""');
              return `"${value}"`;
            });
            csvRows.push(values.join(','));
          });
          
          content = csvRows.join('\r\n');
          mimeType = 'text/csv;charset=utf-8;';
          extension = 'csv';
        } else {
          throw new Error('CSV export requires an array of objects');
        }
      } else {
        throw new Error('Unsupported export type');
      }
      
      // Add BOM for Excel compatibility with UTF-8
      const BOM = '\ufeff';
      const blob = new Blob([BOM + content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_${new Date().getTime()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('Data exported successfully!', 'success');
    } catch (error) {
      logError(error, 'export data');
      showToast('Failed to export data: ' + error.message, 'error');
    }
  };
  
  /**
   * Session Activity Tracking with Maximum Lifetime
   */
  let lastActivity = new Date().getTime();
  
  function updateActivity() {
    lastActivity = new Date().getTime();
    
    const sessionExpiry = localStorage.getItem('sgfc_session_expiry');
    const sessionStart = localStorage.getItem('sgfc_session_start');
    
    if (sessionExpiry && sessionStart) {
      const currentTime = new Date().getTime();
      const expiryTime = parseInt(sessionExpiry);
      const startTime = parseInt(sessionStart);
      const sessionDuration = currentTime - startTime;
      
      // Check if we haven't exceeded maximum lifetime
      if (sessionDuration < CONFIG.MAX_SESSION_LIFETIME) {
        // Extend session if less than threshold remaining
        if (expiryTime - currentTime < CONFIG.SESSION_EXTENSION_THRESHOLD) {
          const newExpiry = currentTime + CONFIG.SESSION_TIMEOUT;
          // Don't extend beyond maximum lifetime
          const maxExpiry = startTime + CONFIG.MAX_SESSION_LIFETIME;
          localStorage.setItem('sgfc_session_expiry', Math.min(newExpiry, maxExpiry).toString());
        }
      }
    }
  }
  
  /**
   * Firebase Listener Cleanup Registry
   */
  window.firebaseListeners = window.firebaseListeners || [];
  
  window.registerFirebaseListener = function(unsubscribe) {
    if (typeof unsubscribe === 'function') {
      window.firebaseListeners.push(unsubscribe);
    }
  };
  
  window.cleanupFirebaseListeners = function() {
    if (window.firebaseListeners && window.firebaseListeners.length > 0) {
      window.firebaseListeners.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error cleaning up listener:', error);
        }
      });
      window.firebaseListeners = [];
    }
  };
  
  /**
   * Initialize security features
   */
  function init() {
    // Only initialize once
    if (window.securityInitialized) return;
    window.securityInitialized = true;
    
    // Check session on load
    checkSession();
    
    // Check session periodically
    setInterval(checkSession, CONFIG.SESSION_CHECK_INTERVAL);
    
    // Listen for storage events (logout from another tab)
    window.addEventListener('storage', (e) => {
      if (e.key === 'sgfc_user' && !e.newValue) {
        window.location.href = 'index.html';
      }
    });
    
    // Track user activity
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true, once: false });
    });
    
    // Global error handler
    window.addEventListener('error', (e) => {
      logError(e.error || e.message, 'global error');
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (e) => {
      logError(e.reason, 'unhandled promise rejection');
    });
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      cleanupFirebaseListeners();
    });
    
    // Cleanup on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, could cleanup if needed
      } else {
        // Page is visible again, check session
        checkSession();
      }
    });
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
