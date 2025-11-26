// ============================================================================
// QUICK BOOKS - PHASE 2A: EXPENSE TRACKING COMPLETE
// ============================================================================

let db;
let allDashboardRecords = [];
let currentUser = null;
const FY_START = '2024-04-01';
const FY_END = '2025-03-31';

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

async function initDB() {
  db = new Dexie('QuickBooksDB');
  
  db.version(1).stores({
    expenses: '++id, date, category, amount, paidTo, paymentMode, billNo, notes, createdAt',
    bankTransactions: '++id, date, bank, type, amount, party, purpose, reference, createdAt',
    assets: '++id, name, category, purchaseDate, purchasePrice, depRate, currentValue, createdAt',
    openingBalance: '++id, accountType, accountName, amount, date',
    settings: 'key, value'
  });
  
  await db.open();
  console.log('✅ QuickBooks database ready');
}

// ============================================================================
// LOAD DASHBOARD DATA
// ============================================================================

async function loadDashboardData() {
  try {
    console.log('🔍 Loading dashboard data...');
    
    const possibleDBNames = [
      'sgfcDB', 'FreightCarrierDB', 'freightCarrierDB',
      'SGFCDB', 'dashboardDB', 'DashboardDB',
      'sgfc', 'SGFC', 'transportDB', 'lrDB'
    ];
    
    let foundDB = null;
    
    for (const dbName of possibleDBNames) {
      try {
        const testDB = new Dexie(dbName);
        await testDB.open();
        
        if (testDB.tables.some(t => t.name === 'records')) {
          const recordsTable = testDB.table('records');
          const count = await recordsTable.count();
          
          if (count > 0) {
            foundDB = testDB;
            allDashboardRecords = await recordsTable.toArray();
            console.log(`✅ Loaded ${allDashboardRecords.length} records from "${dbName}"`);
            break;
          }
        }
        testDB.close();
      } catch (error) {
        // Continue to next database
      }
    }
    
    if (!foundDB) {
      console.log('⚠️ No dashboard database found');
      allDashboardRecords = [];
    }
    
    return allDashboardRecords;
    
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    return [];
  }
}

// ============================================================================
// SYNC WITH DASHBOARD
// ============================================================================

async function syncWithDashboard() {
  const btn = document.getElementById('syncBtn');
  const originalHTML = btn.innerHTML;
  
  btn.disabled = true;
  btn.innerHTML = '<div class="loading-spinner"></div> Syncing...';
  
  try {
    await loadDashboardData();
    
    if (allDashboardRecords.length === 0) {
      showMessage('No data found in dashboard', 'warning');
    } else {
      showMessage(`Synced ${allDashboardRecords.length} records successfully!`, 'success');
    }
    
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) {
      const tabName = activeTab.getAttribute('data-tab');
      switchTab(tabName);
    }
  } catch (error) {
    console.error('Sync error:', error);
    showMessage('Sync failed', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

// ============================================================================
// TAB SWITCHING
// ============================================================================

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    }
  });
  
  const container = document.getElementById('tabContents');
  
  switch(tabName) {
    case 'dashboard':
      loadDashboardTab(container);
      break;
    case 'expenses':
      loadExpensesTab(container);
      break;
    case 'bank':
      loadBankTab(container);
      break;
    case 'balance-sheet':
      loadBalanceSheetTab(container);
      break;
    case 'pl-statement':
      loadPLTab(container);
      break;
    case 'assets':
      loadAssetsTab(container);
      break;
    case 'export':
      loadExportTab(container);
      break;
    case 'settings':
      loadSettingsTab(container);
      break;
  }
}

// ============================================================================
// CALCULATE STATISTICS
// ============================================================================

async function calculateStats() {
  const stats = {
    totalAssets: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    lrCount: 0,
    challanCount: 0
  };
  
  try {
    // Income from LRs
    const lrs = allDashboardRecords.filter(r => {
      const isLR = (r.type === 'booking_lr' || r.type === 'non_booking_lr');
      const isNotToPay = r.lrType !== 'To Pay';
      return isLR && isNotToPay;
    });
    
    stats.lrCount = lrs.length;
    lrs.forEach(lr => {
      stats.totalIncome += parseFloat(lr.billAmount || lr.companyRate || lr.freightAmount || 0);
    });
    
    // Expenses from Challans
    const challans = allDashboardRecords.filter(r => r.type === 'challan_book');
    stats.challanCount = challans.length;
    challans.forEach(ch => {
      stats.totalExpenses += parseFloat(ch.truckRate || 0);
    });
    
    // Add QuickBooks expenses
    const qbExpenses = await db.expenses.toArray();
    qbExpenses.forEach(exp => {
      stats.totalExpenses += parseFloat(exp.amount || 0);
    });
    
    stats.totalAssets = stats.totalIncome * 0.3;
    stats.netProfit = stats.totalIncome - stats.totalExpenses;
    
  } catch (error) {
    console.error('Error calculating stats:', error);
  }
  
  return stats;
}

// ============================================================================
// DASHBOARD TAB
// ============================================================================

async function loadDashboardTab(container) {
  const stats = await calculateStats();
  
  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-gray-600">Total Assets</h3>
          <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
          </svg>
        </div>
        <p class="text-3xl font-bold text-gray-800">₹${stats.totalAssets.toLocaleString('en-IN')}</p>
        <p class="text-xs text-gray-500 mt-1">As on today</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-gray-600">Total Income</h3>
          <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <p class="text-3xl font-bold text-gray-800">₹${stats.totalIncome.toLocaleString('en-IN')}</p>
        <p class="text-xs text-gray-500 mt-1">FY 2024-25 • ${stats.lrCount} LRs</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-gray-600">Total Expenses</h3>
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/>
          </svg>
        </div>
        <p class="text-3xl font-bold text-gray-800">₹${stats.totalExpenses.toLocaleString('en-IN')}</p>
        <p class="text-xs text-gray-500 mt-1">FY 2024-25 • ${stats.challanCount} Challans</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-gray-600">Net Profit</h3>
          <svg class="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
          </svg>
        </div>
        <p class="text-3xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}">
          ${stats.netProfit >= 0 ? '₹' : '-₹'}${Math.abs(stats.netProfit).toLocaleString('en-IN')}
        </p>
        <p class="text-xs text-gray-500 mt-1">FY 2024-25</p>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <button onclick="openExpenseModal()" class="flex flex-col items-center p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition">
          <svg class="w-8 h-8 text-orange-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          <span class="text-sm font-medium text-gray-700">Add Expense</span>
        </button>

        <button onclick="switchTab('expenses')" class="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
          <svg class="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <span class="text-sm font-medium text-gray-700">View Expenses</span>
        </button>

        <button onclick="openBankTransactionModal()" class="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition">
          <svg class="w-8 h-8 text-purple-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
          <span class="text-sm font-medium text-gray-700">Bank Entry</span>
        </button>

        <button onclick="switchTab('balance-sheet')" class="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition">
          <svg class="w-8 h-8 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
          <span class="text-sm font-medium text-gray-700">Balance Sheet</span>
        </button>

        <button onclick="switchTab('pl-statement')" class="flex flex-col items-center p-4 bg-teal-50 hover:bg-teal-100 rounded-lg transition">
          <svg class="w-8 h-8 text-teal-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          <span class="text-sm font-medium text-gray-700">P&L</span>
        </button>

        <button onclick="switchTab('export')" class="flex flex-col items-center p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition">
          <svg class="w-8 h-8 text-indigo-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
          </svg>
          <span class="text-sm font-medium text-gray-700">Export</span>
        </button>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="bg-white rounded-xl shadow-sm p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
      <div id="recentActivity"></div>
    </div>
  `;
  
  loadRecentActivity();
}

// ============================================================================
// EXPENSES TAB - PHASE 2A ✅
// ============================================================================

async function loadExpensesTab(container) {
  const expenses = await db.expenses.toArray();
  expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Calculate totals by category
  const categoryTotals = {};
  expenses.forEach(exp => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  });
  
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Expense Tracking</h2>
          <p class="text-sm text-gray-500 mt-1">Track all your business expenses</p>
        </div>
        <button onclick="openExpenseModal()" class="btn btn-primary">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          Add Expense
        </button>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
          <p class="text-sm text-orange-600 font-medium mb-1">Total Expenses</p>
          <p class="text-2xl font-bold text-orange-900">₹${totalExpenses.toLocaleString('en-IN')}</p>
          <p class="text-xs text-orange-600 mt-1">${expenses.length} transactions</p>
        </div>

        <div class="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
          <p class="text-sm text-blue-600 font-medium mb-1">This Month</p>
          <p class="text-2xl font-bold text-blue-900">₹${expenses.filter(e => {
            const expDate = new Date(e.date);
            const now = new Date();
            return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
          }).reduce((sum, e) => sum + e.amount, 0).toLocaleString('en-IN')}</p>
          <p class="text-xs text-blue-600 mt-1">${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
        </div>

        <div class="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
          <p class="text-sm text-purple-600 font-medium mb-1">Top Category</p>
          <p class="text-2xl font-bold text-purple-900">${Object.keys(categoryTotals).length > 0 ? Object.entries(categoryTotals).sort((a,b) => b[1] - a[1])[0][0] : 'None'}</p>
          <p class="text-xs text-purple-600 mt-1">${Object.keys(categoryTotals).length} categories</p>
        </div>
      </div>
      
      <!-- Expenses Table -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Paid To</th>
              <th>Payment Mode</th>
              <th>Bill No</th>
              <th class="text-right">Amount</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${expenses.length === 0 ? `
              <tr>
                <td colspan="7" class="empty-state">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                  </svg>
                  <p>No expenses added yet</p>
                  <small>Click "Add Expense" to start tracking your business expenses</small>
                </td>
              </tr>
            ` : expenses.map(exp => `
              <tr>
                <td>${formatDate(exp.date)}</td>
                <td><span class="badge badge-info">${exp.category}</span></td>
                <td>${exp.paidTo}</td>
                <td>${exp.paymentMode}</td>
                <td>${exp.billNo || '-'}</td>
                <td class="text-right amount negative">₹${exp.amount.toLocaleString('en-IN')}</td>
                <td class="text-center">
                  <button onclick="editExpense(${exp.id})" class="btn-icon btn-secondary btn-sm" title="Edit">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button onclick="deleteExpense(${exp.id})" class="btn-icon btn-danger btn-sm ml-2" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ============================================================================
// EXPENSE MODAL
// ============================================================================

function openExpenseModal(expenseId = null) {
  const isEdit = expenseId !== null;
  
  const modalHTML = `
    <div class="modal-overlay" onclick="if(event.target===this) closeModal()">
      <div class="modal-container">
        <div class="modal-header">
          <h2 class="modal-title">${isEdit ? 'Edit' : 'Add'} Expense</h2>
          <button class="modal-close" onclick="closeModal()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <form id="expenseForm" onsubmit="saveExpense(event, ${expenseId})">
            <div class="form-group">
              <label class="form-label required">Date</label>
              <input type="date" id="expenseDate" class="form-input" required value="${new Date().toISOString().split('T')[0]}" max="${new Date().toISOString().split('T')[0]}">
            </div>
            
            <div class="form-group">
              <label class="form-label required">Category</label>
              <select id="expenseCategory" class="form-select" required>
                <option value="">Select Category</option>
                <option value="Office Rent">Office Rent</option>
                <option value="Staff Salaries">Staff Salaries</option>
                <option value="Fuel & Diesel">Fuel & Diesel</option>
                <option value="Vehicle Maintenance">Vehicle Maintenance</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Telephone & Internet">Telephone & Internet</option>
                <option value="Electricity">Electricity</option>
                <option value="Professional Fees">Professional Fees (CA, Lawyer)</option>
                <option value="Insurance">Insurance</option>
                <option value="Bank Charges">Bank Charges</option>
                <option value="Repairs & Maintenance">Repairs & Maintenance</option>
                <option value="Printing & Stationery">Printing & Stationery</option>
                <option value="Travel Expenses">Travel Expenses</option>
                <option value="Miscellaneous">Miscellaneous</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label required">Amount</label>
              <input type="number" id="expenseAmount" class="form-input" required min="0" step="0.01" placeholder="Enter amount">
            </div>
            
            <div class="form-group">
              <label class="form-label required">Paid To</label>
              <input type="text" id="expensePaidTo" class="form-input" required placeholder="Vendor/Party name">
            </div>
            
            <div class="form-group">
              <label class="form-label required">Payment Mode</label>
              <select id="expensePaymentMode" class="form-select" required>
                <option value="">Select Mode</option>
                <option value="Cash">Cash</option>
                <option value="Bank - HDFC">Bank - HDFC</option>
                <option value="Bank - ICICI">Bank - ICICI</option>
                <option value="Bank - SBI">Bank - SBI</option>
                <option value="Cheque">Cheque</option>
                <option value="Online Transfer">Online Transfer</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Bill Number</label>
              <input type="text" id="expenseBillNo" class="form-input" placeholder="Invoice/Bill number (optional)">
            </div>
            
            <div class="form-group">
              <label class="form-label">Notes</label>
              <textarea id="expenseNotes" class="form-textarea" placeholder="Additional notes (optional)" rows="3"></textarea>
            </div>
            
            <div class="modal-footer">
              <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Save Expense
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('modalContainer').innerHTML = modalHTML;
  
  if (isEdit) {
    loadExpenseData(expenseId);
  }
}

// ============================================================================
// LOAD EXPENSE DATA FOR EDITING
// ============================================================================

async function loadExpenseData(id) {
  try {
    const expense = await db.expenses.get(id);
    if (expense) {
      document.getElementById('expenseDate').value = expense.date;
      document.getElementById('expenseCategory').value = expense.category;
      document.getElementById('expenseAmount').value = expense.amount;
      document.getElementById('expensePaidTo').value = expense.paidTo;
      document.getElementById('expensePaymentMode').value = expense.paymentMode;
      document.getElementById('expenseBillNo').value = expense.billNo || '';
      document.getElementById('expenseNotes').value = expense.notes || '';
    }
  } catch (error) {
    console.error('Error loading expense:', error);
    showMessage('Error loading expense data', 'error');
  }
}

// ============================================================================
// SAVE EXPENSE
// ============================================================================

async function saveExpense(event, expenseId) {
  event.preventDefault();
  
  const expenseData = {
    date: document.getElementById('expenseDate').value,
    category: document.getElementById('expenseCategory').value,
    amount: parseFloat(document.getElementById('expenseAmount').value),
    paidTo: document.getElementById('expensePaidTo').value,
    paymentMode: document.getElementById('expensePaymentMode').value,
    billNo: document.getElementById('expenseBillNo').value,
    notes: document.getElementById('expenseNotes').value,
    updatedAt: new Date().toISOString()
  };
  
  try {
    if (expenseId) {
      await db.expenses.update(expenseId, expenseData);
      showMessage('Expense updated successfully!', 'success');
    } else {
      expenseData.createdAt = new Date().toISOString();
      await db.expenses.add(expenseData);
      showMessage('Expense added successfully!', 'success');
    }
    
    closeModal();
    switchTab('expenses');
  } catch (error) {
    console.error('Error saving expense:', error);
    showMessage('Error saving expense', 'error');
  }
}

// ============================================================================
// EDIT EXPENSE
// ============================================================================

function editExpense(id) {
  openExpenseModal(id);
}

// ============================================================================
// DELETE EXPENSE
// ============================================================================

async function deleteExpense(id) {
  if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
    return;
  }
  
  try {
    await db.expenses.delete(id);
    showMessage('Expense deleted successfully!', 'success');
    switchTab('expenses');
  } catch (error) {
    console.error('Error deleting expense:', error);
    showMessage('Error deleting expense', 'error');
  }
}

// ============================================================================
// CLOSE MODAL
// ============================================================================

function closeModal() {
  document.getElementById('modalContainer').innerHTML = '';
}

// ============================================================================
// PLACEHOLDER TAB FUNCTIONS (Coming in Phase 2B, 2C, etc.)
// ============================================================================

function loadBankTab(container) {
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm p-12 text-center">
      <svg class="w-16 h-16 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
      </svg>
      <h3 class="text-xl font-semibold text-gray-800 mb-2">Bank Transactions</h3>
      <p class="text-gray-500 mb-4">Phase 2B - Coming Next!</p>
      <p class="text-sm text-gray-400">Track transactions across 3 bank accounts</p>
    </div>
  `;
}

function loadBalanceSheetTab(container) {
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm p-12 text-center">
      <svg class="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
      </svg>
      <h3 class="text-xl font-semibold text-gray-800 mb-2">Balance Sheet</h3>
      <p class="text-gray-500 mb-4">Phase 2C</p>
      <p class="text-sm text-gray-400">Auto-generated with opening balance setup</p>
    </div>
  `;
}

function loadPLTab(container) {
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm p-12 text-center">
      <svg class="w-16 h-16 text-teal-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
      <h3 class="text-xl font-semibold text-gray-800 mb-2">P&L Statement</h3>
      <p class="text-gray-500 mb-4">Phase 2D</p>
      <p class="text-sm text-gray-400">Auto-calculated from all transactions</p>
    </div>
  `;
}

function loadAssetsTab(container) {
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm p-12 text-center">
      <svg class="w-16 h-16 text-purple-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
      </svg>
      <h3 class="text-xl font-semibold text-gray-800 mb-2">Fixed Assets</h3>
      <p class="text-gray-500 mb-4">Phase 2E</p>
      <p class="text-sm text-gray-400">Track assets with auto-depreciation</p>
    </div>
  `;
}

function loadExportTab(container) {
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm p-12 text-center">
      <svg class="w-16 h-16 text-indigo-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
      </svg>
      <h3 class="text-xl font-semibold text-gray-800 mb-2">Export to Excel</h3>
      <p class="text-gray-500 mb-4">Phase 2E</p>
      <p class="text-sm text-gray-400">One-click export for CA with all reports</p>
    </div>
  `;
}

function loadSettingsTab(container) {
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm p-12 text-center">
      <svg class="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
      <h3 class="text-xl font-semibold text-gray-800 mb-2">Settings</h3>
      <p class="text-gray-500 mb-4">Phase 2F</p>
      <p class="text-sm text-gray-400">Opening balance setup and preferences</p>
    </div>
  `;
}

function openBankTransactionModal() {
  showMessage('Bank transactions coming in Phase 2B!', 'info');
}

function openAssetModal() {
  showMessage('Asset management coming in Phase 2E!', 'info');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function loadRecentActivity() {
  const container = document.getElementById('recentActivity');
  
  try {
    const expenses = await db.expenses.orderBy('createdAt').reverse().limit(10).toArray();
    
    if (expenses.length === 0) {
      container.innerHTML = '<p class="text-gray-500 text-center py-8">No recent activity. Start by adding expenses!</p>';
      return;
    }
    
    container.innerHTML = '<div class="space-y-3">' + expenses.map(exp => `
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer" onclick="editExpense(${exp.id})">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
          </div>
          <div>
            <p class="font-medium text-gray-800">${exp.category}</p>
            <p class="text-sm text-gray-500">${exp.paidTo} • ${formatDate(exp.date)}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="font-bold text-red-600">₹${exp.amount.toLocaleString('en-IN')}</p>
          <p class="text-xs text-gray-500">${exp.paymentMode}</p>
        </div>
      </div>
    `).join('') + '</div>';
  } catch (error) {
    console.error('Error loading activity:', error);
    container.innerHTML = '<p class="text-gray-500 text-center py-8">No activity yet</p>';
  }
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

function showMessage(message, type = 'info') {
  const toast = document.createElement('div');
  const colors = {
    error: 'bg-red-100 border-red-500 text-red-700',
    warning: 'bg-yellow-100 border-yellow-500 text-yellow-700',
    info: 'bg-blue-100 border-blue-500 text-blue-700',
    success: 'bg-green-100 border-green-500 text-green-700'
  };
  
  toast.className = `fixed top-20 right-6 px-6 py-4 rounded-lg shadow-lg z-50 border-l-4 ${colors[type]} max-w-md`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

window.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Quick Books - Phase 2A: Expense Tracking');
  
  const user = localStorage.getItem('sgfc_user');
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  
  currentUser = JSON.parse(user);
  await initDB();
  await loadDashboardData();
  switchTab('dashboard');
  
  console.log('✅ Ready! Expense tracking is now available.');
});
