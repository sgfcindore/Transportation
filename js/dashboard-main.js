// ============================================================================
// QUICK BOOKS - UNIVERSAL VERSION (Works with ANY database)
// ============================================================================

let db;
let allDashboardRecords = [];
let currentUser = null;
const FY_START = '2024-04-01';
const FY_END = '2025-03-31';

// ============================================================================
// UNIVERSAL DATABASE LOADER - Works with Firefox, Chrome, Edge, etc.
// ============================================================================

async function loadDashboardData() {
  try {
    console.log('🔍 Attempting to load dashboard data...');
    
    // List of all possible database names to try
    const possibleDBNames = [
      'sgfcDB',
      'FreightCarrierDB', 
      'freightCarrierDB',
      'SGFCDB',
      'dashboardDB',
      'DashboardDB',
      'sgfc',
      'SGFC',
      'transportDB',
      'lrDB'
    ];
    
    let foundDB = null;
    let foundDBName = null;
    
    // Try each possible name
    for (const dbName of possibleDBNames) {
      try {
        console.log(`Trying: ${dbName}...`);
        const testDB = new Dexie(dbName);
        
        // Try to open it
        await testDB.open();
        
        // Check if it has records table
        const hasRecordsTable = testDB.tables.some(t => t.name === 'records');
        
        if (hasRecordsTable) {
          const recordsTable = testDB.table('records');
          const count = await recordsTable.count();
          
          console.log(`  ✅ Found "${dbName}" with ${count} records`);
          
          if (count > 0) {
            foundDB = testDB;
            foundDBName = dbName;
            break; // Found it!
          } else {
            console.log(`  ⚠️  "${dbName}" exists but has no data`);
            testDB.close();
          }
        } else {
          console.log(`  ❌ "${dbName}" has no "records" table`);
          testDB.close();
        }
      } catch (error) {
        // Database doesn't exist, continue to next
        console.log(`  ❌ "${dbName}" not found`);
      }
    }
    
    if (!foundDB) {
      console.error('❌ No dashboard database found!');
      console.log('');
      console.log('💡 SOLUTION:');
      console.log('1. Open your Operations Dashboard');
      console.log('2. Create at least 1 LR');
      console.log('3. Come back to Quick Books');
      console.log('4. Click "Sync Data" again');
      console.log('');
      console.log('💡 OR: Tell Claude your dashboard database name from dashboard code');
      
      showMessage('Dashboard database not found!\n\nPlease:\n1. Open Operations Dashboard\n2. Create at least 1 LR\n3. Return and click Sync', 'error');
      return [];
    }
    
    // Load all records
    const recordsTable = foundDB.table('records');
    allDashboardRecords = await recordsTable.toArray();
    
    console.log(`✅ SUCCESS! Loaded ${allDashboardRecords.length} records from "${foundDBName}"`);
    
    // Show breakdown
    const types = allDashboardRecords.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 Record breakdown:');
    Object.entries(types).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    
    return allDashboardRecords;
    
  } catch (error) {
    console.error('❌ Error loading dashboard data:', error);
    showMessage('Error: ' + error.message, 'error');
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
  console.log('✅ QuickBooks database ready');
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
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔄 SYNC STARTED');
    console.log('═══════════════════════════════════════════════════════');
    
    await loadDashboardData();
    
    if (allDashboardRecords.length === 0) {
      showMessage('⚠️ No data found!\n\nGo to Operations Dashboard and create some LRs first.', 'warning');
    } else {
      showMessage(`✅ Successfully synced ${allDashboardRecords.length} records!`, 'success');
    }
    
    // Refresh current tab
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) {
      const tabName = activeTab.getAttribute('data-tab');
      switchTab(tabName);
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ SYNC COMPLETE');
    console.log('═══════════════════════════════════════════════════════');
    
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
  console.log('📑 Switching to:', tabName);
  
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
      container.innerHTML = '<div class="p-8 text-center text-gray-500">Tab not available yet</div>';
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
    
    // Expenses from Challans
    const challans = allDashboardRecords.filter(r => r.type === 'challan_book');
    stats.challanCount = challans.length;
    
    challans.forEach(ch => {
      const amount = parseFloat(ch.truckRate || 0);
      stats.totalExpenses += amount;
    });
    
    // Add QuickBooks expenses
    const qbExpenses = await db.expenses.toArray();
    qbExpenses.forEach(exp => {
      stats.totalExpenses += parseFloat(exp.amount || 0);
    });
    
    // Calculate assets (30% of income as receivable estimate)
    stats.totalAssets = stats.totalIncome * 0.3;
    
    // Net profit
    stats.netProfit = stats.totalIncome - stats.totalExpenses;
    
    console.log('📊 Stats:', {
      income: `₹${stats.totalIncome.toLocaleString()}`,
      expenses: `₹${stats.totalExpenses.toLocaleString()}`,
      profit: `₹${stats.netProfit.toLocaleString()}`,
      lrs: stats.lrCount,
      challans: stats.challanCount
    });
    
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

    <!-- Sync Status -->
    <div class="${allDashboardRecords.length === 0 ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'} border-l-4 p-4 mb-6 rounded-lg">
      <div class="flex items-center">
        <svg class="w-5 h-5 ${allDashboardRecords.length === 0 ? 'text-red-500' : 'text-blue-500'} mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div class="flex-1">
          ${allDashboardRecords.length === 0 ? `
            <p class="text-sm font-medium text-red-800">No data synced yet!</p>
            <p class="text-xs text-red-600 mt-1">Open Operations Dashboard → Create LRs → Return here → Click "Sync Data"</p>
          ` : `
            <p class="text-sm font-medium text-blue-800">${allDashboardRecords.length} records synced from Operations Dashboard</p>
            <p class="text-xs text-blue-600 mt-1">${stats.lrCount} LRs • ${stats.challanCount} Challans • Last synced: ${new Date().toLocaleTimeString()}</p>
          `}
        </div>
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
          <span class="text-sm font-medium text-gray-700">Export CA</span>
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
// PLACEHOLDER TAB FUNCTIONS (Phase 2 Coming Soon)
// ============================================================================

function loadExpensesTab(container) {
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm p-12 text-center">
      <svg class="w-16 h-16 text-orange-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
      </svg>
      <h3 class="text-xl font-semibold text-gray-800 mb-2">Expense Tracking</h3>
      <p class="text-gray-500 mb-4">Phase 2A - Coming Next!</p>
      <p class="text-sm text-gray-400">Track daily expenses, categorize, and export to Excel</p>
    </div>
  `;
}

function loadBankTab(container) {
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm p-12 text-center">
      <svg class="w-16 h-16 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
      </svg>
      <h3 class="text-xl font-semibold text-gray-800 mb-2">Bank Transactions</h3>
      <p class="text-gray-500 mb-4">Phase 2B</p>
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
      container.innerHTML = '<p class="text-gray-500 text-center py-8">No activity yet. Start by adding expenses in Phase 2!</p>';
      return;
    }
    
    container.innerHTML = '<div class="space-y-3">' + activities.map(activity => `
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
            <p class="font-medium text-gray-800">${activity.activityType === 'expense' ? activity.category : activity.bank}</p>
            <p class="text-sm text-gray-500">${activity.activityType === 'expense' ? activity.paidTo : activity.party} • ${formatDate(activity.date)}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="font-bold text-red-600">₹${activity.amount.toLocaleString('en-IN')}</p>
          <p class="text-xs text-gray-500">${activity.activityType === 'expense' ? activity.paymentMode : activity.type}</p>
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
  console.clear();
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 QUICK BOOKS - UNIVERSAL VERSION');
  console.log('═══════════════════════════════════════════════════════');
  
  // Check auth
  const user = localStorage.getItem('sgfc_user');
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  
  currentUser = JSON.parse(user);
  console.log('✅ User:', currentUser.email);
  
  // Init
  await initDB();
  await loadDashboardData();
  switchTab('dashboard');
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ READY! Click "Sync Data" to refresh');
  console.log('═══════════════════════════════════════════════════════');
});
