// ============================================================================
// QUICK BOOKS ACCOUNTING SYSTEM
// Ultra-Simple with Dashboard Integration
// ============================================================================

// Global variables
let db;
let allDashboardRecords = [];
let currentUser = null;

// Financial Year dates
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
  console.log('QuickBooks Database initialized');
}

// ============================================================================
// LOAD DASHBOARD DATA
// ============================================================================

async function loadDashboardData() {
  try {
    // Access existing dashboard database
    const dashDB = new Dexie('FreightCarrierDB');
    await dashDB.open();
    
    // Get all records from dashboard
    const table = dashDB.table('records');
    allDashboardRecords = await table.toArray();
    
    console.log(`Loaded ${allDashboardRecords.length} records from dashboard`);
    return allDashboardRecords;
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showMessage('Could not load dashboard data', 'error');
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
    showMessage('Data synced successfully!', 'success');
    
    // Refresh current tab
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) {
      const tabName = activeTab.getAttribute('onclick').match(/'(.+?)'/)[1];
      switchTab(tabName);
    }
  } catch (error) {
    console.error('Sync error:', error);
    showMessage('Sync failed. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

// ============================================================================
// TAB SWITCHING
// ============================================================================

function switchTab(tabName) {
  // Update active tab
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('onclick').includes(tabName)) {
      btn.classList.add('active');
    }
  });
  
  // Load tab content
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
        <p class="text-3xl font-bold text-gray-800">₹${stats.totalAssets.toLocaleString()}</p>
        <p class="text-xs text-gray-500 mt-1">As on today</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-gray-600">Total Income</h3>
          <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <p class="text-3xl font-bold text-gray-800">₹${stats.totalIncome.toLocaleString()}</p>
        <p class="text-xs text-gray-500 mt-1">Current FY</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-gray-600">Total Expenses</h3>
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/>
          </svg>
        </div>
        <p class="text-3xl font-bold text-gray-800">₹${stats.totalExpenses.toLocaleString()}</p>
        <p class="text-xs text-gray-500 mt-1">Current FY</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-gray-600">Net Profit</h3>
          <svg class="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
          </svg>
        </div>
        <p class="text-3xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}">₹${Math.abs(stats.netProfit).toLocaleString()}</p>
        <p class="text-xs text-gray-500 mt-1">Current FY</p>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <button onclick="openExpenseModal()" class="flex flex-col items-center p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition">
          <svg class="w-8 h-8 text-orange-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          <span class="text-sm font-medium text-gray-700">Add Expense</span>
        </button>

        <button onclick="openBankTransactionModal()" class="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
          <svg class="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          <span class="text-sm font-medium text-gray-700">Bank Entry</span>
        </button>

        <button onclick="openAssetModal()" class="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition">
          <svg class="w-8 h-8 text-purple-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          <span class="text-sm font-medium text-gray-700">Add Asset</span>
        </button>

        <button onclick="switchTab('balance-sheet')" class="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition">
          <svg class="w-8 h-8 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
          <span class="text-sm font-medium text-gray-700">Balance Sheet</span>
        </button>

        <button onclick="switchTab('pl-statement')" class="flex flex-col items-center p-4 bg-teal-50 hover:bg-teal-100 rounded-lg transition">
          <svg class="w-8 h-8 text-teal-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
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
  
  // Load recent activity
  loadRecentActivity();
}

// ============================================================================
// CALCULATE STATISTICS
// ============================================================================

async function calculateStats() {
  const stats = {
    totalAssets: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0
  };
  
  try {
    // Get opening balance
    const openingBalances = await db.openingBalance.toArray();
    
    // Calculate from dashboard data - Income
    const lrs = allDashboardRecords.filter(r => 
      (r.type === 'booking_lr' || r.type === 'non_booking_lr') &&
      r.lrType !== 'To Pay'
    );
    
    lrs.forEach(lr => {
      const amount = lr.billAmount || lr.companyRate || lr.freightAmount || 0;
      stats.totalIncome += amount;
    });
    
    // Expenses from dashboard (challans)
    const challans = allDashboardRecords.filter(r => r.type === 'challan_book');
    challans.forEach(ch => {
      stats.totalExpenses += ch.truckRate || 0;
    });
    
    // Expenses from our system
    const expenses = await db.expenses.toArray();
    expenses.forEach(exp => {
      stats.totalExpenses += exp.amount || 0;
    });
    
    // Calculate assets
    let cashBank = 0;
    let receivables = 0;
    
    openingBalances.forEach(ob => {
      if (ob.accountType === 'asset') {
        cashBank += ob.amount || 0;
      }
    });
    
    // Calculate receivables from dashboard
    const companies = {};
    lrs.forEach(lr => {
      const company = lr.companyName || lr.consignorName || lr.consigneeName || lr.partyName;
      if (company) {
        const amount = lr.billAmount || lr.companyRate || lr.freightAmount || 0;
        companies[company] = (companies[company] || 0) + amount;
      }
    });
    
    // Subtract payments
    const payments = allDashboardRecords.filter(r => r.type === 'payment_transaction');
    payments.forEach(p => {
      if (p.paymentType === 'Advance from Company' || p.paymentType === 'Balance from Company') {
        const company = p.companyName;
        if (company && companies[company]) {
          companies[company] -= (p.paymentAmount || 0);
        }
      }
    });
    
    Object.values(companies).forEach(val => {
      if (val > 0) receivables += val;
    });
    
    stats.totalAssets = cashBank + receivables;
    stats.netProfit = stats.totalIncome - stats.totalExpenses;
    
  } catch (error) {
    console.error('Error calculating stats:', error);
  }
  
  return stats;
}

// ============================================================================
// RECENT ACTIVITY
// ============================================================================

async function loadRecentActivity() {
  const container = document.getElementById('recentActivity');
  
  try {
    const expenses = await db.expenses.orderBy('createdAt').reverse().limit(5).toArray();
    const bankTxns = await db.bankTransactions.orderBy('createdAt').reverse().limit(5).toArray();
    
    const activities = [
      ...expenses.map(e => ({...e, activityType: 'expense'})),
      ...bankTxns.map(b => ({...b, activityType: 'bank'}))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);
    
    if (activities.length === 0) {
      container.innerHTML = '<p class="text-gray-500 text-center py-8">No recent activity</p>';
      return;
    }
    
    container.innerHTML = `
      <div class="space-y-3">
        ${activities.map(activity => `
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
            <div class="flex items-center gap-3">
              ${activity.activityType === 'expense' ? `
                <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                  </svg>
                </div>
              ` : `
                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                </div>
              `}
              <div>
                <p class="font-medium text-gray-800">
                  ${activity.activityType === 'expense' ? activity.category : activity.bank}
                </p>
                <p class="text-sm text-gray-500">
                  ${activity.activityType === 'expense' ? activity.paidTo : activity.party} • ${formatDate(activity.date)}
                </p>
              </div>
            </div>
            <div class="text-right">
              <p class="font-bold ${activity.activityType === 'expense' || activity.type === 'Debit' ? 'text-red-600' : 'text-green-600'}">
                ₹${activity.amount.toLocaleString()}
              </p>
              <p class="text-xs text-gray-500">${activity.activityType === 'expense' ? activity.paymentMode : activity.type}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    console.error('Error loading recent activity:', error);
    container.innerHTML = '<p class="text-red-500 text-center py-8">Error loading activity</p>';
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function showMessage(message, type = 'info') {
  // Simple toast message
  const toast = document.createElement('div');
  toast.className = `fixed top-20 right-6 px-6 py-4 rounded-lg shadow-lg z-50 alert alert-${type === 'error' ? 'error' : 'success'}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

window.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  const user = localStorage.getItem('sgfc_user');
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  
  currentUser = JSON.parse(user);
  
  // Initialize database
  await initDB();
  
  // Load dashboard data
  await loadDashboardData();
  
  // Load default tab
  switchTab('dashboard');
});
