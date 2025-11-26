// ============================================================================
// QUICK BOOKS - BETTER DATABASE DETECTION
// ============================================================================

let db;
let allDashboardRecords = [];
let currentUser = null;
const FY_START = '2024-04-01';
const FY_END = '2025-03-31';

// ============================================================================
// IMPROVED DATABASE DETECTION
// ============================================================================

async function loadDashboardData() {
  try {
    console.log('🔍 Searching for dashboard database...');
    
    // Get ALL databases in browser
    const databases = await indexedDB.databases();
    console.log('📊 Found databases:', databases.map(d => d.name));
    
    let dashDB = null;
    let dbName = null;
    
    // Try each database to find one with 'records' table
    for (const dbInfo of databases) {
      try {
        console.log(`Trying database: ${dbInfo.name}...`);
        const testDB = new Dexie(dbInfo.name);
        await testDB.open();
        
        // Check if it has records table
        const tableNames = testDB.tables.map(t => t.name);
        console.log(`  Tables in ${dbInfo.name}:`, tableNames);
        
        if (tableNames.includes('records')) {
          // Check if it has data
          const recordsTable = testDB.table('records');
          const count = await recordsTable.count();
          console.log(`  ✅ Found 'records' table with ${count} records`);
          
          if (count > 0) {
            dashDB = testDB;
            dbName = dbInfo.name;
            console.log(`🎯 Using database: ${dbName}`);
            break;
          }
        }
        
        testDB.close();
      } catch (error) {
        console.log(`  ❌ Error with ${dbInfo.name}:`, error.message);
      }
    }
    
    if (!dashDB) {
      console.error('❌ No dashboard database found with records');
      showMessage('Dashboard database not found. Please:\n1. Open Operations Dashboard\n2. Create at least 1 LR\n3. Come back and click Sync', 'error');
      return [];
    }
    
    // Get all records
    const table = dashDB.table('records');
    allDashboardRecords = await table.toArray();
    
    console.log(`✅ SUCCESS! Loaded ${allDashboardRecords.length} records from ${dbName}`);
    
    // Show record types for debugging
    const types = [...new Set(allDashboardRecords.map(r => r.type))];
    console.log('Record types found:', types);
    
    // Show sample counts
    const lrCount = allDashboardRecords.filter(r => r.type === 'booking_lr' || r.type === 'non_booking_lr').length;
    const challanCount = allDashboardRecords.filter(r => r.type === 'challan_book').length;
    console.log(`📊 LRs: ${lrCount}, Challans: ${challanCount}`);
    
    return allDashboardRecords;
    
  } catch (error) {
    console.error('❌ Error loading dashboard data:', error);
    showMessage('Error loading data: ' + error.message, 'error');
    return [];
  }
}

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
  console.log('✅ QuickBooks database initialized');
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
    console.log('🔄 Starting sync...');
    await loadDashboardData();
    
    if (allDashboardRecords.length === 0) {
      showMessage('⚠️ No data found! Please create some LRs in Operations Dashboard first.', 'warning');
    } else {
      showMessage(`✅ Synced ${allDashboardRecords.length} records successfully!`, 'success');
    }
    
    // Refresh current tab
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) {
      const tabName = activeTab.getAttribute('data-tab');
      switchTab(tabName);
    }
  } catch (error) {
    console.error('❌ Sync error:', error);
    showMessage('Sync failed: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

// ============================================================================
// TAB SWITCHING
// ============================================================================

function switchTab(tabName) {
  console.log('📑 Switching to tab:', tabName);
  
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
    default:
      container.innerHTML = '<div class="p-8 text-center text-gray-500">Tab content not available yet</div>';
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
    console.log('📊 Calculating stats from', allDashboardRecords.length, 'records');
    
    // Income from LRs (exclude To Pay)
    const lrs = allDashboardRecords.filter(r => {
      const isLR = (r.type === 'booking_lr' || r.type === 'non_booking_lr');
      const isNotToPay = r.lrType !== 'To Pay';
      return isLR && isNotToPay;
    });
    
    stats.lrCount = lrs.length;
    
    lrs.forEach(lr => {
      const amount = parseFloat(lr.billAmount || lr.companyRate || lr.freightAmount || 0);
      stats.totalIncome += amount;
    });
    
    console.log(`💰 Income: ₹${stats.totalIncome.toLocaleString()} from ${stats.lrCount} LRs`);
    
    // Expenses from Challans
    const challans = allDashboardRecords.filter(r => r.type === 'challan_book');
    stats.challanCount = challans.length;
    
    challans.forEach(ch => {
      const amount = parseFloat(ch.truckRate || 0);
      stats.totalExpenses += amount;
    });
    
    console.log(`💸 Expenses: ₹${stats.totalExpenses.toLocaleString()} from ${stats.challanCount} Challans`);
    
    // Add expenses from QuickBooks
    const qbExpenses = await db.expenses.toArray();
    qbExpenses.forEach(exp => {
      stats.totalExpenses += parseFloat(exp.amount || 0);
    });
    
    if (qbExpenses.length > 0) {
      console.log(`💸 Additional expenses: ₹${qbExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString()} from QuickBooks`);
    }
    
    // Simple assets calculation (30% of income as receivable)
    stats.totalAssets = stats.totalIncome * 0.3;
    
    // Net profit
    stats.netProfit = stats.totalIncome - stats.totalExpenses;
    
    console.log(`📈 Net Profit: ₹${stats.netProfit.toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Error calculating stats:', error);
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
        <p class="text-xs text-gray-500 mt-1">Current FY (${stats.lrCount} LRs)</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-gray-600">Total Expenses</h3>
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/>
          </svg>
        </div>
        <p class="text-3xl font-bold text-gray-800">₹${stats.totalExpenses.toLocaleString()}</p>
        <p class="text-xs text-gray-500 mt-1">Current FY (${stats.challanCount} Challans)</p>
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

    <!-- Data Status Info -->
    <div class="${allDashboardRecords.length === 0 ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'} border-l-4 p-4 mb-6 rounded">
      <div class="flex items-center">
        <svg class="w-5 h-5 ${allDashboardRecords.length === 0 ? 'text-red-500' : 'text-blue-500'} mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-sm ${allDashboardRecords.length === 0 ? 'text-red-700' : 'text-blue-700'}">
          ${allDashboardRecords.length === 0 ? 
            '<strong>No data synced yet!</strong> Go to Operations Dashboard, create some LRs, then click "Sync Data"' :
            `<strong>${allDashboardRecords.length} records</strong> synced from Operations Dashboard • ${stats.lrCount} LRs, ${stats.challanCount} Challans`
          }
        </p>
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
  
  loadRecentActivity();
}

// ============================================================================
// PLACEHOLDER FUNCTIONS FOR OTHER TABS
// ============================================================================

function loadExpensesTab(container) {
  container.innerHTML = '<div class="bg-white rounded-xl shadow-sm p-8 text-center"><p class="text-gray-500 text-lg mb-4">Expenses Tab</p><p class="text-sm text-gray-400">Phase 2A - Coming next!</p></div>';
}

function loadBankTab(container) {
  container.innerHTML = '<div class="bg-white rounded-xl shadow-sm p-8 text-center"><p class="text-gray-500 text-lg mb-4">Bank Transactions</p><p class="text-sm text-gray-400">Phase 2B</p></div>';
}

function loadBalanceSheetTab(container) {
  container.innerHTML = '<div class="bg-white rounded-xl shadow-sm p-8 text-center"><p class="text-gray-500 text-lg mb-4">Balance Sheet</p><p class="text-sm text-gray-400">Phase 2C</p></div>';
}

function loadPLTab(container) {
  container.innerHTML = '<div class="bg-white rounded-xl shadow-sm p-8 text-center"><p class="text-gray-500 text-lg mb-4">P&L Statement</p><p class="text-sm text-gray-400">Phase 2D</p></div>';
}

function loadAssetsTab(container) {
  container.innerHTML = '<div class="bg-white rounded-xl shadow-sm p-8 text-center"><p class="text-gray-500 text-lg mb-4">Fixed Assets</p><p class="text-sm text-gray-400">Phase 2E</p></div>';
}

function loadExportTab(container) {
  container.innerHTML = '<div class="bg-white rounded-xl shadow-sm p-8 text-center"><p class="text-gray-500 text-lg mb-4">Export to Excel</p><p class="text-sm text-gray-400">Phase 2E</p></div>';
}

function loadSettingsTab(container) {
  container.innerHTML = '<div class="bg-white rounded-xl shadow-sm p-8 text-center"><p class="text-gray-500 text-lg mb-4">Settings & Opening Balance</p><p class="text-sm text-gray-400">Phase 2F</p></div>';
}

function openExpenseModal() {
  showMessage('Expense tracking coming in Phase 2A!', 'info');
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
    const expenses = await db.expenses.orderBy('createdAt').reverse().limit(5).toArray();
    const bankTxns = await db.bankTransactions.orderBy('createdAt').reverse().limit(5).toArray();
    
    const activities = [
      ...expenses.map(e => ({...e, activityType: 'expense'})),
      ...bankTxns.map(b => ({...b, activityType: 'bank'}))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);
    
    if (activities.length === 0) {
      container.innerHTML = '<p class="text-gray-500 text-center py-8">No recent activity. Start by adding expenses or bank transactions!</p>';
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
    container.innerHTML = '<p class="text-gray-500 text-center py-8">No activity yet</p>';
  }
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function showMessage(message, type = 'info') {
  const toast = document.createElement('div');
  const bgColor = type === 'error' ? 'bg-red-100 border-red-500 text-red-700' : 
                  type === 'warning' ? 'bg-yellow-100 border-yellow-500 text-yellow-700' :
                  type === 'info' ? 'bg-blue-100 border-blue-500 text-blue-700' :
                  'bg-green-100 border-green-500 text-green-700';
  
  toast.className = `fixed top-20 right-6 px-6 py-4 rounded-lg shadow-lg z-50 border-l-4 ${bgColor} max-w-md`;
  toast.style.whiteSpace = 'pre-line';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

window.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Quick Books initializing...');
  console.log('═══════════════════════════════════════════════════════');
  
  // Check authentication
  const user = localStorage.getItem('sgfc_user');
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  
  currentUser = JSON.parse(user);
  console.log('✅ User authenticated:', currentUser.email);
  
  // Initialize database
  await initDB();
  
  // Load dashboard data
  await loadDashboardData();
  
  // Load default tab
  switchTab('dashboard');
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Quick Books loaded successfully!');
  console.log('💡 TIP: Click "Sync Data" to refresh data from dashboard');
});
