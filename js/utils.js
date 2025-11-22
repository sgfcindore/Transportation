/**
 * Utility Functions for SGFC Dashboard
 * Version 2.0 - Fixed and Enhanced
 */

/**
 * Format date to DD-MM-YYYY with proper null handling
 */
function formatDate(dateStr) {
  if (!dateStr || dateStr === 'null' || dateStr === 'undefined' || dateStr === '') {
    return 'N/A';
  }
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

/**
 * Format currency to Indian format
 */
function formatCurrency(amount) {
  const num = window.safeParseFloat ? window.safeParseFloat(amount, 0) : parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * Format number to Indian format with commas
 */
function formatNumber(num) {
  const n = window.safeParseFloat ? window.safeParseFloat(num, 0) : parseFloat(num) || 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);
}

/**
 * Convert number to words (Indian numbering system) - FIXED VERSION
 * Now handles decimals (paise), proper plurals, and edge cases
 */
function numberToWords(num) {
  if (num === 0 || num === '0') return 'Zero Only';
  if (!num || num === null || num === undefined) return 'Zero Only';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  // Handle decimals
  const parts = String(num).split('.');
  const integerPart = parseInt(parts[0]) || 0;
  const decimalPart = parts[1] ? parseInt(parts[1].padEnd(2, '0').substring(0, 2)) : 0;
  
  function convertTwoDigit(n) {
    if (n < 10) return ones[n];
    if (n >= 10 && n < 20) return teens[n - 10];
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
  }
  
  function convertThreeDigit(n) {
    if (n === 0) return '';
    if (n < 100) return convertTwoDigit(n);
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertTwoDigit(n % 100) : '');
  }
  
  function convertNumber(n) {
    if (n === 0) return '';
    if (n < 1000) return convertThreeDigit(n);
    
    if (n < 100000) {
      const thousands = Math.floor(n / 1000);
      const remainder = n % 1000;
      return convertTwoDigit(thousands) + ' Thousand' + (remainder !== 0 ? ' ' + convertThreeDigit(remainder) : '');
    }
    
    if (n < 10000000) {
      const lakhs = Math.floor(n / 100000);
      const remainder = n % 100000;
      return convertTwoDigit(lakhs) + (lakhs > 1 ? ' Lakhs' : ' Lakh') + (remainder !== 0 ? ' ' + convertNumber(remainder) : '');
    }
    
    const crores = Math.floor(n / 10000000);
    const remainder = n % 10000000;
    return convertTwoDigit(crores) + (crores > 1 ? ' Crores' : ' Crore') + (remainder !== 0 ? ' ' + convertNumber(remainder) : '');
  }
  
  let result = convertNumber(integerPart);
  
  // Add decimal part (paise)
  if (decimalPart > 0) {
    result += ' and ' + convertTwoDigit(decimalPart) + ' Paise';
  }
  
  return (result || 'Zero') + ' Only';
}

/**
 * Calculate profit with proper null handling
 */
function calculateProfit(record) {
  if (!record) return 0;
  
  const freightAmount = window.safeParseFloat(record.freightAmount, 0);
  const dieselExpense = window.safeParseFloat(record.dieselExpense, 0);
  const toll = window.safeParseFloat(record.toll, 0);
  const driverExpense = window.safeParseFloat(record.driverExpense, 0);
  const otherExpense = window.safeParseFloat(record.otherExpense, 0);
  
  const totalExpenses = dieselExpense + toll + driverExpense + otherExpense;
  const profit = freightAmount - totalExpenses;
  
  return parseFloat(profit.toFixed(2));
}

/**
 * Calculate total expenses
 */
function calculateTotalExpenses(record) {
  if (!record) return 0;
  
  const dieselExpense = window.safeParseFloat(record.dieselExpense, 0);
  const toll = window.safeParseFloat(record.toll, 0);
  const driverExpense = window.safeParseFloat(record.driverExpense, 0);
  const otherExpense = window.safeParseFloat(record.otherExpense, 0);
  
  const total = dieselExpense + toll + driverExpense + otherExpense;
  return parseFloat(total.toFixed(2));
}

/**
 * Generate unique ID
 */
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Generate invoice number
 */
function generateInvoiceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
}

/**
 * Debounce function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Deep clone object
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  
  const clonedObj = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj;
}

/**
 * Check if object is empty
 */
function isEmpty(obj) {
  if (obj === null || obj === undefined) return true;
  if (typeof obj === 'string') return obj.trim().length === 0;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}

/**
 * Sort array of objects by key
 */
function sortByKey(array, key, ascending = true) {
  return array.sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal === bVal) return 0;
    
    if (ascending) {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
}

/**
 * Filter array of objects by search term
 */
function filterBySearch(array, searchTerm, keys) {
  if (!searchTerm || searchTerm.trim() === '') return array;
  
  const term = searchTerm.toLowerCase().trim();
  
  return array.filter(item => {
    return keys.some(key => {
      const value = item[key];
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(term);
    });
  });
}

/**
 * Group array by key
 */
function groupBy(array, key) {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
}

/**
 * Calculate sum of array values by key
 */
function sumByKey(array, key) {
  return array.reduce((sum, item) => {
    const value = window.safeParseFloat ? window.safeParseFloat(item[key], 0) : parseFloat(item[key]) || 0;
    return sum + value;
  }, 0);
}

/**
 * Get date range (start and end of day)
 */
function getDateRange(dateStr) {
  const date = new Date(dateStr);
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));
  return { start: startOfDay, end: endOfDay };
}

/**
 * Get month range
 */
function getMonthRange(year, month) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
  return { start: startOfMonth, end: endOfMonth };
}

/**
 * Validate form data
 */
function validateFormData(data, rules) {
  const errors = {};
  
  for (const field in rules) {
    const value = data[field];
    const rule = rules[field];
    
    if (rule.required && (value === null || value === undefined || value === '')) {
      errors[field] = `${rule.label || field} is required`;
      continue;
    }
    
    if (rule.type === 'email' && value && !window.validateEmail(value)) {
      errors[field] = `${rule.label || field} must be a valid email`;
    }
    
    if (rule.type === 'phone' && value && !window.validatePhone(value)) {
      errors[field] = `${rule.label || field} must be a valid phone number`;
    }
    
    if (rule.type === 'number' && value !== null && value !== undefined && value !== '') {
      if (!window.validateNumber(value, rule.min, rule.max)) {
        errors[field] = `${rule.label || field} must be a valid number`;
        if (rule.min !== undefined) errors[field] += ` (min: ${rule.min})`;
        if (rule.max !== undefined) errors[field] += ` (max: ${rule.max})`;
      }
    }
    
    if (rule.minLength && value && value.length < rule.minLength) {
      errors[field] = `${rule.label || field} must be at least ${rule.minLength} characters`;
    }
    
    if (rule.maxLength && value && value.length > rule.maxLength) {
      errors[field] = `${rule.label || field} must be at most ${rule.maxLength} characters`;
    }
    
    if (rule.pattern && value && !rule.pattern.test(value)) {
      errors[field] = `${rule.label || field} format is invalid`;
    }
    
    if (rule.custom && typeof rule.custom === 'function') {
      const customError = rule.custom(value, data);
      if (customError) {
        errors[field] = customError;
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Show validation errors
 */
function showValidationErrors(errors) {
  const errorMessages = Object.values(errors).join('\n');
  if (window.showToast) {
    window.showToast(errorMessages, 'error', 5000);
  } else {
    alert(errorMessages);
  }
}

/**
 * Export utilities to window
 */
if (typeof window !== 'undefined') {
  window.utils = {
    formatDate,
    formatCurrency,
    formatNumber,
    numberToWords,
    calculateProfit,
    calculateTotalExpenses,
    generateUniqueId,
    generateInvoiceNumber,
    debounce,
    throttle,
    deepClone,
    isEmpty,
    sortByKey,
    filterBySearch,
    groupBy,
    sumByKey,
    getDateRange,
    getMonthRange,
    validateFormData,
    showValidationErrors
  };
}
