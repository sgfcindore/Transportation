    const defaultConfig = {
      company_title: "South Gujrat Freight Carrier"
    };

    let allRecords = [];
    let filteredRecords = [];
    let recordToDelete = null;
    
    // Calculation functions for total amounts
    function calculateLRTotal() {
      const weight = parseFloat(document.getElementById('lrWeight')?.value) || 0;
      const ratePerTonne = parseFloat(document.getElementById('lrRatePerTonne')?.value) || 0;
      const totalAmount = weight * ratePerTonne;
      const totalField = document.getElementById('lrTotalAmount');
      if (totalField) {
        totalField.value = totalAmount.toFixed(2);
      }
    }
    
    function calculateNonBookingLRTotal() {
      const weight = parseFloat(document.getElementById('nbLrWeight')?.value) || 0;
      const ratePerTonne = parseFloat(document.getElementById('nbLrRatePerTonne')?.value) || 0;
      const totalAmount = weight * ratePerTonne;
      const totalField = document.getElementById('nbLrTotalAmount');
      if (totalField) {
        totalField.value = totalAmount.toFixed(2);
      }
    }
    
    function calculateChallanTotal() {
      const weight = parseFloat(document.getElementById('challanWeight')?.value) || 0;
      const ratePerTonne = parseFloat(document.getElementById('challanRatePerTonne')?.value) || 0;
      const totalAmount = weight * ratePerTonne;
      const totalField = document.getElementById('challanTotalAmount');
      if (totalField) {
        totalField.value = totalAmount.toFixed(2);
      }
      // Also calculate balance amount when total changes
      calculateChallanBalanceAmount();
    }

    function calculateChallanBalanceAmount() {
      const totalAmount = parseFloat(document.getElementById('challanTotalAmount')?.value) || 0;
      const advance = parseFloat(document.getElementById('challanAdvance')?.value) || 0;
      
      // Balance Amount to Pay = Total Truck Amount - Advance
      const balanceAmount = totalAmount - advance;
      
      const balanceField = document.getElementById('challanBalanceAmount');
      if (balanceField) {
        balanceField.value = Math.max(0, balanceAmount).toFixed(2);
      }
      
      // Also calculate remaining balance when balance amount changes
      calculateChallanRemainingBalance();
    }

    function calculateChallanRemainingBalance() {
      const balanceAmount = parseFloat(document.getElementById('challanBalanceAmount')?.value) || 0;
      const deductions = parseFloat(document.getElementById('challanDeductions')?.value) || 0;
      const commission = parseFloat(document.getElementById('challanCommission')?.value) || 0;
      const hammaliCharges = parseFloat(document.getElementById('challanHammaliCharges')?.value) || 0;
      const otherDeductions = parseFloat(document.getElementById('challanOtherDeductions')?.value) || 0;
      const commissionDeducted = document.getElementById('commissionDeductedInChallan')?.checked || false;
      
      // Remaining Balance = Balance Amount - (Challan Deductions + Commission (if deducted) + Hammali Charges + Other Deductions)
      let remainingBalance = balanceAmount - deductions - hammaliCharges - otherDeductions;
      
      if (commissionDeducted) {
        remainingBalance -= commission;
      }
      
      const remainingField = document.getElementById('challanRemainingBalance');
      if (remainingField) {
        remainingField.value = Math.max(0, remainingBalance).toFixed(2);
      }
    }

    const dataHandler = {
      onDataChanged(data) {
        allRecords = data;
        // Initialize filteredRecords with only daily_register entries to avoid duplicates
        filteredRecords = data.filter(r => r.type === 'daily_register');
        updateUI();
      }
    };

    // Create Data SDK - Cloud-only storage (Firebase)
    window.dataSdk = {
      async create(data) {
        try {
          // Wait for Firebase to be ready
          if (!window.firebaseReady || !window.firebaseDB) {
            throw new Error('Firebase not ready. Please wait for connection.');
          }
          
          // Save to Firebase first
          const firebaseId = await saveToFirebase(data);
          if (!firebaseId) {
            throw new Error('Failed to save to Firebase');
          }
          
          // Set IDs
          data.__firebaseId = firebaseId;
          data.__backendId = firebaseId;
          
          // DON'T add to local array here - let Firebase real-time listener handle it
          // This prevents duplicates when the onSnapshot listener fires
          // The record will be added by the listener in setupFirebaseListener()
          
          // Update UI (the listener will trigger another update, but that's okay)
          updateUI();
          
          console.log('✅ Record created in cloud:', firebaseId);
          return { isOk: true, data };
        } catch (error) {
          console.error('❌ Error creating record:', error);
          alert('Failed to save: ' + error.message + '\nPlease check your internet connection.');
          return { isOk: false, error };
        }
      },
      
      async update(record) {
        try {
          // Wait for Firebase to be ready
          if (!window.firebaseReady || !window.firebaseDB) {
            throw new Error('Firebase not ready. Please wait for connection.');
          }
          
          // Ensure the record has a Firebase ID
          if (!record.__firebaseId) {
            // Try to find the existing record in allRecords to get the Firebase ID
            const existingRecord = allRecords.find(r => r.__backendId === record.__backendId);
            if (existingRecord && existingRecord.__firebaseId) {
              record.__firebaseId = existingRecord.__firebaseId;
            } else {
              throw new Error('Record has no Firebase ID. Please refresh the page and try again.');
            }
          }
          
          await updateInFirebase(record.__firebaseId, record);
          
          // Update in local array (in-memory only, for UI)
          const index = allRecords.findIndex(r => r.__backendId === record.__backendId);
          if (index >= 0) {
            allRecords[index] = record;
          }
          
          // Update UI
          updateUI();
          
          console.log('✅ Record updated in cloud:', record.__firebaseId);
          return { isOk: true, data: record };
        } catch (error) {
          console.error('❌ Error updating record:', error);
          alert('Failed to update: ' + error.message + '\nPlease check your internet connection.');
          return { isOk: false, error };
        }
      },
      
      async delete(record) {
        try {
          // Wait for Firebase to be ready
          if (!window.firebaseReady || !window.firebaseDB) {
            throw new Error('Firebase not ready. Please wait for connection.');
          }
          
          // Delete from Firebase
          if (!record.__firebaseId) {
            throw new Error('Record has no Firebase ID');
          }
          
          // If deleting an LR or Challan, check if we need to reset the daily entry status
          if ((record.type === 'booking_lr' || record.type === 'non_booking_lr' || record.type === 'challan_book') && record.dailyEntryId) {
            const dailyEntry = allRecords.find(r => r.__backendId === record.dailyEntryId);
            if (dailyEntry) {
              // Check if there are any other LRs/Challans linked to this daily entry
              const otherLinkedRecords = allRecords.filter(r => 
                r.__backendId !== record.__backendId && 
                (r.type === 'booking_lr' || r.type === 'non_booking_lr' || r.type === 'challan_book') && 
                r.dailyEntryId === record.dailyEntryId
              );
              
              // If no other records are linked, reset the status to Pending
              if (otherLinkedRecords.length === 0) {
                dailyEntry.status = 'Pending';
                // Update the daily entry in Firebase
                try {
                  await updateInFirebase(dailyEntry.__firebaseId, dailyEntry);
                  console.log('✅ Daily entry status reset to Pending');
                } catch (err) {
                  console.error('⚠️ Failed to reset daily entry status:', err);
                }
              }
            }
          }
          
          await deleteFromFirebase(record.__firebaseId);
          
          // Remove from local array (in-memory only, for UI)
          allRecords = allRecords.filter(r => r.__backendId !== record.__backendId);
          
          // Update UI
          updateUI();
          
          console.log('✅ Record deleted from cloud:', record.__firebaseId);
          return { isOk: true };
        } catch (error) {
          console.error('❌ Error deleting record:', error);
          alert('Failed to delete: ' + error.message + '\nPlease check your internet connection.');
          return { isOk: false, error };
        }
      }
    };

    async function init() {
      // Initialize with empty data - will load from Firebase
      allRecords = [];
      filteredRecords = [];

      // Set company title
      const title = defaultConfig.company_title;
      const companyTitleElem = document.getElementById('companyTitle');
      if (companyTitleElem) {
        companyTitleElem.textContent = title;
      }

      setupEventListeners();
      setupTabs();
      updateUI();
      
      // Initialize Firebase sync immediately
      console.log('🔄 Initializing cloud sync...');
      initFirebaseSync();
    }
    
    // Function to toggle Add Daily Register form visibility
    function toggleAddDailyRegisterForm() {
      const formSection = document.getElementById('dailyRegisterFormSection');
      const toggleBtn = document.getElementById('toggleDailyFormBtn');
      
      if (formSection.classList.contains('hidden')) {
        formSection.classList.remove('hidden');
        toggleBtn.textContent = '✖️ Cancel';
        toggleBtn.classList.remove('btn-primary');
        toggleBtn.classList.add('btn-secondary');
        formSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        formSection.classList.add('hidden');
        toggleBtn.textContent = '➕ Add New Entry';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-primary');
        document.getElementById('dailyRegisterForm').reset();
        cancelEditDailyRegister();
      }
    }
    
    // Function to toggle Add Booking LR form visibility
    function toggleAddBookingLRForm() {
      const formSection = document.getElementById('bookingLRFormSection');
      const toggleBtn = document.getElementById('toggleBookingLRBtn');
      
      if (formSection.classList.contains('hidden')) {
        formSection.classList.remove('hidden');
        toggleBtn.textContent = '✖️ Cancel';
        toggleBtn.classList.remove('btn-primary');
        toggleBtn.classList.add('btn-secondary');
        formSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        formSection.classList.add('hidden');
        toggleBtn.textContent = '➕ Create New LR';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-primary');
        document.getElementById('lrForm').reset();
        cancelEditBookingLR();
      }
    }
    
    // Function to handle LR Type field changes
    function toggleLRTypeFields() {
      const lrType = document.getElementById('lrTypeSelect').value;
      const lrTypeHint = document.getElementById('lrTypeHint');
      
      if (lrType === 'To Pay') {
        lrTypeHint.textContent = '⚠️ To Pay: Transaction at destination - No billing, payments, or LR received/sent tracking';
        lrTypeHint.classList.add('text-orange-600', 'font-semibold');
      } else if (lrType === 'To Be Billed') {
        lrTypeHint.textContent = '✅ To Be Billed: Normal workflow - Billing and payment tracking enabled';
        lrTypeHint.classList.remove('text-orange-600', 'font-semibold');
        lrTypeHint.classList.add('text-green-600');
      } else {
        lrTypeHint.textContent = 'Select the LR billing type';
        lrTypeHint.classList.remove('text-orange-600', 'text-green-600', 'font-semibold');
      }
    }
    
    // Function to toggle Add Challan form visibility
    function toggleAddChallanForm() {
      const formSection = document.getElementById('challanFormSection');
      const toggleBtn = document.getElementById('toggleChallanBtn');
      
      if (formSection.classList.contains('hidden')) {
        formSection.classList.remove('hidden');
        toggleBtn.textContent = '✖️ Cancel';
        toggleBtn.classList.remove('btn-primary');
        toggleBtn.classList.add('btn-secondary');
        formSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        formSection.classList.add('hidden');
        toggleBtn.textContent = '➕ Add Challan Entry';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-primary');
        document.getElementById('challanBookForm').reset();
      }
    }
    
    // Function to toggle Add Non-Booking LR form visibility
    function toggleAddNonBookingLRForm() {
      const formSection = document.getElementById('nonBookingLRFormSection');
      const toggleBtn = document.getElementById('toggleNonBookingLRBtn');
      
      if (formSection.classList.contains('hidden')) {
        formSection.classList.remove('hidden');
        toggleBtn.textContent = '✖️ Cancel';
        toggleBtn.classList.remove('btn-primary');
        toggleBtn.classList.add('btn-secondary');
        formSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        formSection.classList.add('hidden');
        toggleBtn.textContent = '➕ Add Non-Booking LR';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-primary');
        document.getElementById('nonBookingLRForm').reset();
      }
    }
    
    // Function for Booking LR Type
    function toggleBookingLRTypeFields() {
      const lrType = document.getElementById('bookingLRTypeSelect').value;
      const lrTypeHint = document.getElementById('bookingLRTypeHint');
      
      if (lrType === 'To Pay') {
        lrTypeHint.textContent = '⚠️ To Pay: No billing/payment tracking. Transaction handled at destination.';
        lrTypeHint.classList.add('text-orange-600', 'font-semibold');
      } else {
        lrTypeHint.textContent = '✅ Standard LR with full billing and payment workflow';
        lrTypeHint.classList.remove('text-orange-600', 'font-semibold');
        lrTypeHint.classList.add('text-green-600');
      }
    }
    
    // Function for Non-Booking LR Type
    function toggleNonBookingLRTypeFields() {
      const lrType = document.getElementById('nonBookingLRTypeSelect').value;
      const lrTypeHint = document.getElementById('nonBookingLRTypeHint');
      
      if (lrType === 'To Pay') {
        lrTypeHint.textContent = '⚠️ To Pay: No billing/payment tracking. Transaction handled at destination.';
        lrTypeHint.classList.add('text-orange-600', 'font-semibold');
      } else {
        lrTypeHint.textContent = '✅ Standard LR with full billing and payment workflow';
        lrTypeHint.classList.remove('text-orange-600', 'font-semibold');
        lrTypeHint.classList.add('text-green-600');
      }
    }

    // Firebase Cloud Sync Functions
    async function syncDataToCloud() {
      // Cloud-only mode - no localStorage
      if (window.firebaseReady && window.firebaseDB) {
        try {
          console.log('☁️ Data is synced via Firebase real-time listener');
          // Real-time listener keeps data in sync automatically
          // Individual record operations use saveToFirebase, updateInFirebase, deleteFromFirebase
        } catch (error) {
          console.error('Error syncing to Firebase:', error);
        }
      } else {
        console.warn('⚠️ Firebase not available - cannot save data');
      }
    }
    
    async function initFirebaseSync() {
      if (!window.firebaseReady || !window.firebaseDB) {
        console.log('⏳ Waiting for Firebase...');
        updateCloudStatus('⏳ Connecting...', 'yellow');
        setTimeout(initFirebaseSync, 1000);
        return;
      }
      
      console.log('🔄 Starting Firebase sync...');
      updateCloudStatus('🔄 Syncing...', 'blue');
      
      try {
        // Load data from Firebase
        await loadFromFirebase();
        
        // Set up real-time listener for changes from other devices
        setupFirebaseListener();
        
        console.log('✅ Firebase sync active');
        updateCloudStatus('☁️ Cloud Sync Active', 'green');
      } catch (error) {
        console.error('❌ Firebase sync error:', error);
        updateCloudStatus('❌ Offline Mode', 'red');
      }
    }
    
    function updateCloudStatus(message, color) {
      const statusEl = document.getElementById('cloudStatus');
      if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = `ml-2 text-xs ${color === 'green' ? 'text-green-200' : color === 'yellow' ? 'text-yellow-200' : color === 'blue' ? 'text-blue-200' : 'text-red-200'}`;
      }
    }

    async function loadFromFirebase() {
      try {
        const { db, collection, getDocs } = window.firebaseDB;
        const querySnapshot = await getDocs(collection(db, 'records'));
        
        const firebaseRecords = [];
        querySnapshot.forEach((doc) => {
          firebaseRecords.push({
            __firebaseId: doc.id,
            __backendId: doc.id,
            ...doc.data()
          });
        });
        
        if (firebaseRecords.length > 0) {
          // Load from cloud (Firebase is the only source of truth)
          allRecords = firebaseRecords;
          // Initialize filteredRecords with only daily_register entries to avoid duplicates
          filteredRecords = allRecords.filter(r => r.type === 'daily_register');
          
          updateUI();
          console.log(`📥 Loaded ${firebaseRecords.length} records from cloud`);
        } else {
          console.log('📭 No records in cloud yet');
        }
      } catch (error) {
        console.error('❌ Error loading from Firebase:', error);
        alert('Failed to load data from cloud. Please check your internet connection.');
      }
    }

    function setupFirebaseListener() {
      try {
        const { db, collection, onSnapshot } = window.firebaseDB;
        
        onSnapshot(collection(db, 'records'), (snapshot) => {
          let needsUpdate = false;
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = {
                __firebaseId: change.doc.id,
                __backendId: change.doc.id,
                ...change.doc.data()
              };
              
              // Check if record already exists (prevent duplicates)
              const index = allRecords.findIndex(r => r.__firebaseId === change.doc.id || r.__backendId === change.doc.id);
              if (index === -1) {
                // Only add if it doesn't exist
                allRecords.push(data);
                needsUpdate = true;
              }
            } else if (change.type === 'modified') {
              const data = {
                __firebaseId: change.doc.id,
                __backendId: change.doc.id,
                ...change.doc.data()
              };
              
              const index = allRecords.findIndex(r => r.__firebaseId === change.doc.id || r.__backendId === change.doc.id);
              if (index >= 0) {
                allRecords[index] = data;
                needsUpdate = true;
              }
            } else if (change.type === 'removed') {
              const originalLength = allRecords.length;
              allRecords = allRecords.filter(r => r.__firebaseId !== change.doc.id && r.__backendId !== change.doc.id);
              if (allRecords.length !== originalLength) {
                needsUpdate = true;
              }
            }
          });
          
          if (needsUpdate) {
            // Initialize filteredRecords with only daily_register entries to avoid duplicates
            filteredRecords = allRecords.filter(r => r.type === 'daily_register');
            // Cloud-only mode - no localStorage
            updateUI();
          }
        });
        
        console.log('🔔 Real-time cloud sync enabled');
      } catch (error) {
        console.error('Error setting up Firebase listener:', error);
      }
    }

    async function saveToFirebase(record) {
      if (!window.firebaseReady || !window.firebaseDB) {
        throw new Error('Firebase not ready. Please wait for cloud connection.');
      }
      
      try {
        const { db, collection, addDoc } = window.firebaseDB;
        const docRef = await addDoc(collection(db, 'records'), record);
        console.log('☁️ Saved to cloud:', docRef.id);
        return docRef.id;
      } catch (error) {
        console.error('❌ Error saving to Firebase:', error);
        throw error;
      }
    }

    async function deleteFromFirebase(firebaseId) {
      if (!window.firebaseReady || !window.firebaseDB || !firebaseId) {
        return;
      }
      
      try {
        const { db, doc, deleteDoc } = window.firebaseDB;
        await deleteDoc(doc(db, 'records', firebaseId));
        console.log('☁️ Deleted from cloud:', firebaseId);
      } catch (error) {
        console.error('Error deleting from Firebase:', error);
      }
    }

    async function updateInFirebase(firebaseId, updates) {
      if (!window.firebaseReady || !window.firebaseDB || !firebaseId) {
        return;
      }
      
      try {
        const { db, doc, updateDoc } = window.firebaseDB;
        await updateDoc(doc(db, 'records', firebaseId), updates);
        console.log('☁️ Updated in cloud:', firebaseId);
      } catch (error) {
        console.error('Error updating Firebase:', error);
      }
    }

    function setupTabs() {
      const tabButtons = document.querySelectorAll('.tab-button');
      const tabContents = document.querySelectorAll('.tab-content');

      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          const tabName = button.dataset.tab;
          
          tabButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
          
          tabContents.forEach(content => {
            content.classList.add('hidden');
            if (content.id === `${tabName}-tab`) {
              content.classList.remove('hidden');
            }
          });

          if (tabName === 'lr-creation') {
            populateDailyEntrySelect();
            populateConsignorConsigneeSelects();
          } else if (tabName === 'non-booking-lr') {
            populateDailyEntryNonBookingSelect();
          } else if (tabName === 'challan-book') {
            populateDailyForChallanSelect();
          } else if (tabName === 'lr-received') {
            populateLRSelect();
            populateLRForDeductionSelect();
            updateDeductionsUI();
          } else if (tabName === 'billing') {
            populateReceivedLRSelect();
            populateLRSelects();
            populateBilledLRSelect();
          } else if (tabName === 'payment-tracking') {
            updatePaymentTrackingUI();
          } else if (tabName === 'reports') {
            applyFilters();
          } else if (tabName === 'deductions') {
            updateDeductionsUI();
          } else if (tabName === 'profit-loss') {
            calculateProfitLoss();
          } else if (tabName === 'masters') {
            // Masters tab - no additional setup needed
          } else if (tabName === 'staff-ledger') {
            updateStaffLedgerUI();
          }
        });
      });
    }

    function updateLiveDateTime() {
      const now = new Date();
      const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      const formatted = now.toLocaleString('en-US', options);
      const dateTimeElem = document.getElementById('liveDateTime');
      if (dateTimeElem) {
        dateTimeElem.textContent = formatted;
      }
    }

    function setupEventListeners() {
      // Update clock every second
      updateLiveDateTime();
      setInterval(updateLiveDateTime, 1000);

      // Action buttons
      document.getElementById('saveDataBtn').addEventListener('click', handleSaveData);
      document.getElementById('backupDataBtn').addEventListener('click', handleBackupData);
      document.getElementById('restoreDataBtn').addEventListener('click', handleRestoreData);
      document.getElementById('logoutBtn').addEventListener('click', handleLogout);
      document.getElementById('restoreFileInput').addEventListener('change', handleRestoreFileSelect);
      document.getElementById('mastersBtn').addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        document.getElementById('masters-tab').classList.remove('hidden');
      });

      document.getElementById('dailyRegisterForm').addEventListener('submit', handleDailyRegisterSubmit);
      document.getElementById('addLRForm').addEventListener('submit', handleAddLRSubmit);
      document.getElementById('lrForm').addEventListener('submit', handleLRSubmit);
      
      // Deduction adjustment type handler
      const deductionAdjustmentSelect = document.getElementById('deductionAdjustmentType');
      if (deductionAdjustmentSelect) {
        deductionAdjustmentSelect.addEventListener('change', function(e) {
          const partialField = document.getElementById('partialAmountField');
          if (e.target.value === 'Partial') {
            partialField.classList.remove('hidden');
          } else {
            partialField.classList.add('hidden');
          }
        });
      }
      document.getElementById('nonBookingLRForm').addEventListener('submit', handleNonBookingLRSubmit);
      document.getElementById('lrReceivedForm').addEventListener('submit', handleLRReceivedSubmit);
      document.getElementById('deductionForm').addEventListener('submit', handleDeductionSubmit);
      document.getElementById('challanBookForm').addEventListener('submit', handleChallanBookSubmit);
      document.getElementById('billingForm').addEventListener('submit', handleBillingSubmit);
      
      // Multiple LR handling for billing
      const addLRBtn = document.getElementById('addLRBtn');
      if (addLRBtn) {
        addLRBtn.addEventListener('click', function() {
          addNewLRItem();
        });
      }
      
      // Initialize LR options for the first item
      populateLRSelects();
      
      document.getElementById('lrSentForm').addEventListener('submit', handleLRSentSubmit);
      document.getElementById('paymentForm').addEventListener('submit', handlePaymentSubmit);
      document.getElementById('truckMasterForm').addEventListener('submit', handleTruckMasterSubmit);
      document.getElementById('companyMasterForm').addEventListener('submit', handleCompanyMasterSubmit);
      document.getElementById('partyMasterForm').addEventListener('submit', handlePartyMasterSubmit);
      document.getElementById('staffMasterForm').addEventListener('submit', handleStaffMasterSubmit);

      const selectDailyEntry = document.getElementById('selectDailyEntry');
      if (selectDailyEntry) selectDailyEntry.addEventListener('change', handleDailyEntrySelect);
      
      const selectDailyEntryNonBooking = document.getElementById('selectDailyEntryNonBooking');
      if (selectDailyEntryNonBooking) selectDailyEntryNonBooking.addEventListener('change', handleDailyEntryNonBookingSelect);
      
      const selectDailyForChallan = document.getElementById('selectDailyForChallan');
      if (selectDailyForChallan) selectDailyForChallan.addEventListener('change', handleDailyForChallanSelect);
      
      const lrConsignorSelect = document.getElementById('lrConsignorSelect');
      if (lrConsignorSelect) lrConsignorSelect.addEventListener('change', handleConsignorSelect);
      
      const lrConsigneeSelect = document.getElementById('lrConsigneeSelect');
      if (lrConsigneeSelect) lrConsigneeSelect.addEventListener('change', handleConsigneeSelect);
      
      const commissionCheckbox = document.getElementById('commissionApplicable');
      if (commissionCheckbox) {
        commissionCheckbox.addEventListener('change', function(e) {
          const amountField = document.getElementById('commissionAmountField');
          const takenByField = document.getElementById('commissionTakenByField');
          const statusField = document.getElementById('commissionStatusField');
          
          if (e.target.checked) {
            amountField.classList.remove('hidden');
            takenByField.classList.remove('hidden');
            statusField.classList.remove('hidden');
          } else {
            amountField.classList.add('hidden');
            takenByField.classList.add('hidden');
            statusField.classList.add('hidden');
            const input = amountField.querySelector('input');
            if (input) input.value = '0';
          }
        });
      }
      
      const lrSentMethodSelect = document.getElementById('lrSentMethod');
      if (lrSentMethodSelect) {
        lrSentMethodSelect.addEventListener('change', function(e) {
          const courierField = document.getElementById('courierDetailsField');
          const selfField = document.getElementById('selfDetailsField');
          const courierInput = document.getElementById('courierDocketNumber');
          const selfInput = document.getElementById('selfPersonName');
          
          if (e.target.value === 'Courier') {
            courierField.classList.remove('hidden');
            selfField.classList.add('hidden');
            courierInput.required = true;
            selfInput.required = false;
            selfInput.value = '';
          } else if (e.target.value === 'Self') {
            selfField.classList.remove('hidden');
            courierField.classList.add('hidden');
            selfInput.required = true;
            courierInput.required = false;
            courierInput.value = '';
          } else {
            courierField.classList.add('hidden');
            selfField.classList.add('hidden');
            courierInput.required = false;
            selfInput.required = false;
          }
        });
      }
      
      const applyFiltersBtn = document.getElementById('applyFilters');
      if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFilters);
      
      const clearFiltersBtn = document.getElementById('clearFilters');
      if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);
      
      const exportReportBtn = document.getElementById('exportReport');
      if (exportReportBtn) exportReportBtn.addEventListener('click', exportReport);

      const applyPLFiltersBtn = document.getElementById('applyPLFilters');
      if (applyPLFiltersBtn) applyPLFiltersBtn.addEventListener('click', applyPLFilters);
      
      const clearPLFiltersBtn = document.getElementById('clearPLFilters');
      if (clearPLFiltersBtn) clearPLFiltersBtn.addEventListener('click', clearPLFilters);

      const ledgerTypeSelect = document.getElementById('ledgerType');
      if (ledgerTypeSelect) ledgerTypeSelect.addEventListener('change', handleLedgerTypeChange);
      
      const viewLedgerBtn = document.getElementById('viewLedger');
      if (viewLedgerBtn) viewLedgerBtn.addEventListener('click', viewLedger);

      document.getElementById('cancelDelete').addEventListener('click', () => {
        document.getElementById('deleteModal').classList.add('hidden');
        document.getElementById('deleteModal').classList.remove('flex');
        recordToDelete = null;
      });

      document.getElementById('confirmDelete').addEventListener('click', async () => {
        if (recordToDelete) {
          const result = await window.dataSdk.delete(recordToDelete);
          if (result.isOk) {
            document.getElementById('deleteModal').classList.add('hidden');
            document.getElementById('deleteModal').classList.remove('flex');
            recordToDelete = null;
          }
        }
      });

      document.getElementById('cancelLedgerPayment').addEventListener('click', () => {
        document.getElementById('ledgerPaymentModal').classList.add('hidden');
        document.getElementById('ledgerPaymentModal').classList.remove('flex');
      });

      document.getElementById('ledgerPaymentForm').addEventListener('submit', handleLedgerPaymentSubmit);
    }

    function handleConsignorSelect(e) {
      const companyName = e.target.value;
      if (!companyName) return;

      const company = allRecords.find(r => r.type === 'company_master' && r.companyName === companyName);
      if (company) {
        const form = document.getElementById('lrForm');
        form.consignorAddress.value = company.companyAddress || '';
        form.consignorGST.value = company.companyGST || '';
      }
    }

    function handleConsigneeSelect(e) {
      const companyName = e.target.value;
      if (!companyName) return;

      const company = allRecords.find(r => r.type === 'company_master' && r.companyName === companyName);
      if (company) {
        const form = document.getElementById('lrForm');
        form.consigneeAddress.value = company.companyAddress || '';
        form.consigneeGST.value = company.companyGST || '';
      }
    }

    async function handleAddLRSubmit(e) {
      e.preventDefault();
      
      if (!currentDailyEntryForLR) {
        alert('No daily entry selected');
        return;
      }
      
      const formData = new FormData(e.target);
      
      const lrData = {
        lrNumber: formData.get('lrNumber'),
        lrType: formData.get('lrType') || 'To Be Billed', // Default to 'To Be Billed' for backward compatibility
        productName: formData.get('productName'),
        weight: parseFloat(formData.get('weight')) || 0,
        quantity: parseFloat(formData.get('quantity')) || 0,
        lrRate: parseFloat(formData.get('lrRate')) || 0,
        lrNotes: formData.get('lrNotes') || '',
        addedAt: new Date().toISOString()
      };
      
      if (!currentDailyEntryForLR.lrs) {
        currentDailyEntryForLR.lrs = [];
      }
      
      currentDailyEntryForLR.lrs.push(lrData);
      
      try {
        // Update in cloud
        const result = await window.dataSdk.update(currentDailyEntryForLR);
        if (result.isOk) {
          e.target.reset();
          updateLRListForEntry(currentDailyEntryForLR);
          alert('LR added successfully!');
        }
      } catch (error) {
        alert('Error adding LR: ' + error.message);
      }
    }

    async function handleDailyRegisterSubmit(e) {
      e.preventDefault();
      
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const isEditing = window.editingDailyRegisterId;
      
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="loading-spinner inline-block mr-2"></span>${isEditing ? 'Updating...' : 'Saving...'}`;
      }
      
      const formData = new FormData(e.target);
      const commissionApplicable = formData.get('commissionApplicable') === 'on';
      const commissionAmount = commissionApplicable ? (parseFloat(formData.get('commission')) || 0) : 0;
      
      let result;
      
      if (isEditing) {
        // UPDATE existing entry
        const existingEntry = allRecords.find(r => r.__backendId === isEditing);
        if (existingEntry) {
          // Copy the entire existing entry to preserve all fields
          const data = { ...existingEntry };
          
          // Update only the fields from the form
          data.date = formData.get('date');
          data.truckNumber = formData.get('truckNumber');
          data.truckSize = formData.get('truckSize');
          data.companyName = formData.get('companyName');
          data.partyName = formData.get('partyName');
          data.from = formData.get('from');
          data.to = formData.get('to');
          data.bookingType = formData.get('bookingType');
          data.typeOfBooking = formData.get('typeOfBooking');
          data.placedBy = formData.get('placedBy');
          data.truckRate = parseFloat(formData.get('truckRate')) || 0;
          data.companyRate = parseFloat(formData.get('companyRate')) || 0;
          data.commissionApplicable = commissionApplicable;
          data.commission = commissionAmount;
          data.commissionTakenBy = formData.get('commissionTakenBy') || '';
          data.commissionStatus = formData.get('commissionStatus') || 'Paid';
          data.notes = formData.get('notes') || '';
          data.updatedAt = new Date().toISOString();
          
          result = await window.dataSdk.update(data);
        } else {
          result = { isOk: false };
        }
      } else {
        // CREATE new entry
        const data = {
          type: 'daily_register',
          date: formData.get('date'),
          truckNumber: formData.get('truckNumber'),
          truckSize: formData.get('truckSize'),
          companyName: formData.get('companyName'),
          partyName: formData.get('partyName'),
          from: formData.get('from'),
          to: formData.get('to'),
          bookingType: formData.get('bookingType'),
          typeOfBooking: formData.get('typeOfBooking'),
          placedBy: formData.get('placedBy'),
          truckRate: parseFloat(formData.get('truckRate')) || 0,
          companyRate: parseFloat(formData.get('companyRate')) || 0,
          commissionApplicable: commissionApplicable,
          commission: commissionAmount,
          commissionTakenBy: formData.get('commissionTakenBy') || '',
          commissionStatus: formData.get('commissionStatus') || 'Paid',
          notes: formData.get('notes') || '',
          lrs: [],
          status: 'Pending',
          createdAt: new Date().toISOString()
        };
        
        result = await window.dataSdk.create(data);
      }
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="flex items-center gap-2"><span>Add Entry</span></span>';
        submitBtn.classList.remove('bg-orange-500', 'hover:bg-orange-600');
        submitBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
      }
      
      if (result.isOk) {
        e.target.reset();
        
        // Reset editing state
        window.editingDailyRegisterId = null;
        
        // Hide commission fields
        const commissionField = document.getElementById('commissionAmountField');
        const takenByField = document.getElementById('commissionTakenByField');
        const statusField = document.getElementById('commissionStatusField');
        if (commissionField) commissionField.classList.add('hidden');
        if (takenByField) takenByField.classList.add('hidden');
        if (statusField) statusField.classList.add('hidden');
        
        const successMsg = isEditing ? 'Daily register entry updated successfully!' : 'Daily register entry added successfully!';
        showInlineMessage(successMsg, 'success');
      } else {
        const errorMsg = isEditing ? 'Failed to update entry. Please try again.' : 'Failed to add entry. Please try again.';
        showInlineMessage(errorMsg, 'error');
      }
    }

    async function handleNonBookingLRSubmit(e) {
      e.preventDefault();
      
      const form = e.target;
      const isEditing = form.dataset.editingId;
      
      // Only require daily entry selection for new LRs
      if (!isEditing) {
        const dailyEntryId = document.getElementById('selectDailyEntryNonBooking').value;
        if (!dailyEntryId) {
          showInlineMessage('Please select a daily register entry first', 'error');
          return;
        }
      }

      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = isEditing ? '<span class="loading-spinner inline-block mr-2"></span>Updating...' : '<span class="loading-spinner inline-block mr-2"></span>Creating...';
      }

      const formData = new FormData(e.target);
      
      const data = {
        type: 'non_booking_lr',
        lrNumber: formData.get('lrNumber'),
        lrType: formData.get('lrType') || 'To Be Billed',
        lrDate: formData.get('lrDate'),
        truckNumber: formData.get('truckNumber'),
        partyName: formData.get('partyName'),
        from: formData.get('from'),
        to: formData.get('to'),
        productName: formData.get('productName'),
        quantity: parseFloat(formData.get('quantity')) || 0,
        weight: parseFloat(formData.get('weight')) || 0,
        freightAmount: parseFloat(formData.get('freightAmount')) || 0,
        paymentCategory: formData.get('paymentCategory'),
        notes: formData.get('notes') || '',
        lrReceived: false,
        status: 'Non-Booking LR Created'
      };

      let result;
      
      if (isEditing) {
        // Update existing LR
        const existingLR = allRecords.find(r => r.__backendId === isEditing);
        if (existingLR) {
          Object.assign(existingLR, data);
          existingLR.updatedAt = new Date().toISOString();
          result = await window.dataSdk.update(existingLR);
        }
      } else {
        // Create new LR
        const dailyEntryId = document.getElementById('selectDailyEntryNonBooking').value;
        data.dailyEntryId = dailyEntryId;
        data.createdAt = new Date().toISOString();
        result = await window.dataSdk.create(data);
      }
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = isEditing ? 'Update Non-Booking LR' : 'Add Non-Booking LR';
      }
      
      if (result && result.isOk) {
        if (isEditing) {
          showInlineMessage('Non-Booking LR updated successfully!', 'success');
          
          // Reset form and editing state
          delete form.dataset.editingId;
          form.reset();
          submitBtn.textContent = 'Add Non-Booking LR';
          submitBtn.classList.remove('bg-orange-500');
          submitBtn.classList.add('bg-blue-500');
          
          // Re-enable daily register select
          const dailySelect = document.getElementById('selectDailyEntryNonBooking');
          if (dailySelect) {
            dailySelect.disabled = false;
            dailySelect.classList.remove('opacity-50', 'cursor-not-allowed');
            dailySelect.value = '';
          }
        } else {
          const dailyEntryId = document.getElementById('selectDailyEntryNonBooking').value;
          const dailyEntry = allRecords.find(r => r.__backendId === dailyEntryId);
          if (dailyEntry) {
            dailyEntry.status = 'LR Created';
            await window.dataSdk.update(dailyEntry);
          }
          
          showInlineMessage('Non-Booking LR created successfully!', 'success');
          
          // Ask if user wants to create another LR for the same daily register entry
          setTimeout(() => {
            const createAnother = confirm('Non-Booking LR created successfully!\n\nDo you want to create another LR for the same daily register entry?');
            if (createAnother) {
              // Keep the same daily entry selected and reset only the LR-specific fields
              e.target.reset();
              const selectElem = document.getElementById('selectDailyEntryNonBooking');
              if (selectElem) {
                selectElem.value = dailyEntryId;
                // Trigger the change event to repopulate the fields
                handleDailyEntryNonBookingSelect({ target: selectElem });
              }
            } else {
              // Reset everything including the daily entry selection
              e.target.reset();
              const selectElem = document.getElementById('selectDailyEntryNonBooking');
              if (selectElem) selectElem.value = '';
            }
          }, 100);
        }
      } else {
        const errorMsg = isEditing ? 'Failed to update LR. Please try again.' : 'Failed to create LR. Please try again.';
        showInlineMessage(errorMsg, 'error');
      }
    }

    async function handleLRSubmit(e) {
      e.preventDefault();
      
      const form = e.target;
      const isEditing = form.dataset.editingId;
      
      // Only require daily entry selection for new LRs
      if (!isEditing) {
        const dailyEntryId = document.getElementById('selectDailyEntry').value;
        if (!dailyEntryId) {
          showInlineMessage('Please select a daily register entry first', 'error');
          return;
        }
      }

      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = isEditing ? '<span class="loading-spinner inline-block mr-2"></span>Updating...' : '<span class="loading-spinner inline-block mr-2"></span>Creating...';
      }

      const formData = new FormData(e.target);
      
      const data = {
        type: 'booking_lr',
        lrNumber: formData.get('lrNumber'),
        lrType: formData.get('lrType') || 'To Be Billed',
        lrDate: formData.get('lrDate'),
        truckNumber: formData.get('truckNumber'),
        consignorName: formData.get('consignorName'),
        consignorAddress: formData.get('consignorAddress') || '',
        consignorGST: formData.get('consignorGST') || '',
        consigneeName: formData.get('consigneeName'),
        consigneeAddress: formData.get('consigneeAddress') || '',
        consigneeGST: formData.get('consigneeGST') || '',
        billingTo: formData.get('billingTo'),
        companyName: formData.get('companyName'),
        companyGST: formData.get('companyGST') || '',
        from: formData.get('from'),
        to: formData.get('to'),
        productName: formData.get('productName'),
        quantity: parseFloat(formData.get('quantity')) || 0,
        weight: parseFloat(formData.get('weight')) || 0,
        companyRate: parseFloat(formData.get('companyRate')) || 0,
        advanceToDriver: parseFloat(formData.get('advanceToDriver')) || 0,
        hammaliCharges: parseFloat(formData.get('hammaliCharges')) || 0,
        otherDeductions: parseFloat(formData.get('otherDeductions')) || 0,
        paymentCategory: formData.get('paymentCategory'),
        lrReceived: false,
        status: 'LR Created'
      };

      let result;
      
      if (isEditing) {
        // Update existing LR
        const existingLR = allRecords.find(r => r.__backendId === isEditing);
        if (existingLR) {
          Object.assign(existingLR, data);
          existingLR.updatedAt = new Date().toISOString();
          result = await window.dataSdk.update(existingLR);
        }
      } else {
        // Create new LR
        const dailyEntryId = document.getElementById('selectDailyEntry').value;
        data.dailyEntryId = dailyEntryId;
        data.createdAt = new Date().toISOString();
        result = await window.dataSdk.create(data);
      }
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = isEditing ? 'Update LR' : 'Create LR';
      }
      
      if (result && result.isOk) {
        if (isEditing) {
          showInlineMessage('Booking LR updated successfully!', 'success');
          
          // Reset form and editing state
          delete form.dataset.editingId;
          form.reset();
          submitBtn.textContent = 'Create LR';
          submitBtn.classList.remove('bg-orange-500');
          
          // Hide cancel button
          const cancelBtn = document.getElementById('cancelEditLR');
          if (cancelBtn) {
            cancelBtn.classList.add('hidden');
          }
          
          // Re-enable daily register select
          const dailySelect = document.getElementById('selectDailyEntry');
          if (dailySelect) {
            dailySelect.disabled = false;
            dailySelect.classList.remove('opacity-50', 'cursor-not-allowed');
          }
        } else {
          const dailyEntryId = document.getElementById('selectDailyEntry').value;
          const dailyEntry = allRecords.find(r => r.__backendId === dailyEntryId);
          if (dailyEntry) {
            dailyEntry.status = 'LR Created';
            await window.dataSdk.update(dailyEntry);
          }
          
          showInlineMessage('Booking LR created successfully!', 'success');
          
          // Ask if user wants to create another LR for the same daily register entry
          setTimeout(() => {
            const createAnother = confirm('Booking LR created successfully!\n\nDo you want to create another LR for the same daily register entry?');
            if (createAnother) {
              // Keep the same daily entry selected and reset only the LR-specific fields
              e.target.reset();
              const selectElem = document.getElementById('selectDailyEntry');
              if (selectElem) {
                selectElem.value = dailyEntryId;
                // Trigger the change event to repopulate the fields
                handleDailyEntrySelect({ target: selectElem });
              }
            } else {
              // Reset everything including the daily entry selection
              e.target.reset();
              const selectElem = document.getElementById('selectDailyEntry');
              if (selectElem) selectElem.value = '';
            }
          }, 100);
        }
      } else {
        showInlineMessage(isEditing ? 'Failed to update LR. Please try again.' : 'Failed to create LR. Please try again.', 'error');
      }
    }

    async function handleLRReceivedSubmit(e) {
      e.preventDefault();
      const formData = new FormData(e.target);
      const lrId = formData.get('lrId');
      const lrCondition = formData.get('lrCondition');
      
      const lr = allRecords.find(r => r.__backendId === lrId);
      if (lr) {
        lr.lrReceived = true;
        lr.lrReceivedDate = formData.get('lrReceivedDate');
        lr.lrCondition = lrCondition;
        lr.haltingCharges = parseFloat(formData.get('haltingCharges')) || 0;
        lr.companyHaltingCharges = parseFloat(formData.get('companyHaltingCharges')) || 0;
        lr.hammaliCharges = parseFloat(formData.get('hammaliCharges')) || 0;
        lr.damageDeduction = parseFloat(formData.get('damageDeduction')) || 0;
        lr.deductionAdjustment = formData.get('deductionAdjustment') || 'Loss';
        lr.truckAdjustmentAmount = parseFloat(formData.get('truckAdjustmentAmount')) || 0;
        lr.notes = formData.get('notes');
        
        if (lrCondition === 'Perfectly Alright') {
          lr.status = 'LR Cleared';
        } else {
          lr.status = 'LR Received - Pending Deduction';
        }

        const result = await window.dataSdk.update(lr);
        if (result.isOk) {
          e.target.reset();
          populateLRSelect();
        }
      }
    }

    async function handleDeductionSubmit(e) {
      e.preventDefault();
      const formData = new FormData(e.target);
      const lrId = formData.get('lrId');
      
      const lr = allRecords.find(r => r.__backendId === lrId);
      if (!lr) return;

      const data = {
        type: 'deduction_entry',
        relatedLRId: lrId,
        lrNumber: lr.lrNumber,
        lrType: lr.type,
        truckNumber: lr.truckNumber,
        companyName: lr.companyName,
        partyName: lr.partyName,
        lrReceivedDate: lr.lrReceivedDate,
        deductionType: formData.get('deductionType'),
        damageCharges: parseFloat(formData.get('damageCharges')) || 0,
        otherDeductions: parseFloat(formData.get('otherDeductions')) || 0,
        damageDetails: formData.get('damageDetails'),
        missingDetails: formData.get('missingDetails'),
        deductionNotes: formData.get('deductionNotes'),
        createdAt: new Date().toISOString()
      };

      const result = await window.dataSdk.create(data);
      if (result.isOk) {
        lr.status = 'Deduction Recorded';
        await window.dataSdk.update(lr);
        e.target.reset();
        populateLRForDeductionSelect();
      }
    }

    async function handleChallanBookSubmit(e) {
      e.preventDefault();
      
      const form = e.target;
      const isEditing = form.dataset.editingId;
      
      // Only require daily entry selection for new Challans
      if (!isEditing) {
        const dailyEntryId = document.getElementById('selectDailyForChallan').value;
        if (!dailyEntryId) {
          showInlineMessage('Please select a daily register entry first', 'error');
          return;
        }
      }

      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = isEditing ? '<span class="loading-spinner inline-block mr-2"></span>Updating...' : '<span class="loading-spinner inline-block mr-2"></span>Creating...';
      }

      const formData = new FormData(e.target);
      
      const weight = parseFloat(formData.get('weight')) || 0;
      const ratePerTonne = parseFloat(formData.get('ratePerTonne')) || 0;
      const truckRate = parseFloat(formData.get('truckRate')) || 0;
      
      const data = {
        type: 'challan_book',
        challanNumber: formData.get('challanNumber'),
        truckNumber: formData.get('truckNumber'),
        date: formData.get('date'),
        from: formData.get('from'),
        to: formData.get('to'),
        weight: weight,
        ratePerTonne: ratePerTonne,
        truckRate: truckRate,
        advancePaidToOwner: parseFloat(formData.get('advancePaidToOwner')) || 0,
        balanceAmount: parseFloat(formData.get('balanceAmount')) || 0,
        challanDeductions: parseFloat(formData.get('challanDeductions')) || 0,
        commission: parseFloat(formData.get('commission')) || 0,
        commissionDeductedInChallan: formData.get('commissionDeductedInChallan') === 'on',
        hammaliCharges: parseFloat(formData.get('hammaliCharges')) || 0,
        otherDeductions: parseFloat(formData.get('otherDeductions')) || 0,
        remainingBalance: parseFloat(formData.get('remainingBalance')) || 0,
        notes: formData.get('notes'),
        status: 'Challan Created'
      };

      let result;
      
      if (isEditing) {
        // Update existing Challan
        const existingChallan = allRecords.find(r => r.__backendId === isEditing);
        if (existingChallan) {
          Object.assign(existingChallan, data);
          existingChallan.updatedAt = new Date().toISOString();
          result = await window.dataSdk.update(existingChallan);
        }
      } else {
        // Create new Challan
        const dailyEntryId = document.getElementById('selectDailyForChallan').value;
        data.dailyEntryId = dailyEntryId;
        
        // Find ALL LRs linked to this Daily Register entry and add their LR numbers
        const linkedLRs = allRecords.filter(r => 
          (r.type === 'booking_lr' || r.type === 'non_booking_lr') && 
          (r.dailyEntryId === dailyEntryId || r.dailyRegisterId === dailyEntryId)
        );
        
        // Store LR numbers in Challan
        if (linkedLRs.length > 0) {
          data.lrNumbers = linkedLRs.map(lr => lr.lrNumber).filter(Boolean).join(', ');
          data.linkedLRCount = linkedLRs.length;
          console.log(`✅ Linking ${linkedLRs.length} LR(s) to Challan: ${data.lrNumbers}`);
        } else {
          data.lrNumbers = '';
          data.linkedLRCount = 0;
        }
        
        data.createdAt = new Date().toISOString();
        result = await window.dataSdk.create(data);
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = isEditing ? 'Update Challan Entry' : 'Add Challan Entry';
      }

      if (result && result.isOk) {
        if (isEditing) {
          showInlineMessage('Challan updated successfully!', 'success');
          
          // Reset form and editing state
          delete form.dataset.editingId;
          form.reset();
          submitBtn.textContent = 'Add Challan Entry';
          submitBtn.classList.remove('bg-orange-500');
          submitBtn.classList.add('bg-blue-500');
          
          // Re-enable daily register select
          const dailySelect = document.getElementById('selectDailyForChallan');
          if (dailySelect) {
            dailySelect.disabled = false;
            dailySelect.classList.remove('opacity-50', 'cursor-not-allowed');
            dailySelect.value = '';
          }
        } else {
          const dailyEntryId = document.getElementById('selectDailyForChallan').value;
          const dailyEntry = allRecords.find(r => r.__backendId === dailyEntryId);
          if (dailyEntry) {
            dailyEntry.status = 'Challan Created';
            await window.dataSdk.update(dailyEntry);
          }
          
          showInlineMessage('Challan created successfully!', 'success');
          e.target.reset();
          document.getElementById('selectDailyForChallan').value = '';
        }
      } else {
        const errorMsg = isEditing ? 'Failed to update Challan. Please try again.' : 'Failed to create Challan. Please try again.';
        showInlineMessage(errorMsg, 'error');
      }
    }

    function handleDailyForChallanSelect(e) {
      const entryId = e.target.value;
      if (!entryId) {
        const form = document.getElementById('challanBookForm');
        form.reset();
        // Hide LR numbers display
        document.getElementById('challanLRNumbersDisplay').style.display = 'none';
        return;
      }

      const entry = allRecords.find(r => r.__backendId === entryId);
      if (entry) {
        const form = document.getElementById('challanBookForm');
        const commissionField = document.getElementById('challanCommission');
        const ratePerTonneField = document.getElementById('challanRatePerTonne');
        
        form.truckNumber.value = entry.truckNumber || '';
        form.date.value = entry.date || '';
        form.from.value = entry.from || '';
        form.to.value = entry.to || '';
        form.dailyEntryId.value = entryId;
        
        // Find and display all linked LR numbers
        const linkedLRs = allRecords.filter(r => 
          (r.type === 'booking_lr' || r.type === 'non_booking_lr') && 
          (r.dailyEntryId === entryId || r.dailyRegisterId === entryId)
        );
        
        const lrNumbersDisplay = document.getElementById('challanLRNumbers');
        const lrNumbersContainer = document.getElementById('challanLRNumbersDisplay');
        
        if (linkedLRs.length > 0) {
          const lrNumbers = linkedLRs.map(lr => lr.lrNumber).filter(Boolean).join(', ');
          lrNumbersDisplay.innerHTML = `${lrNumbers} <span style="color: #059669; font-size: 0.875rem;">(${linkedLRs.length} LR${linkedLRs.length > 1 ? 's' : ''})</span>`;
          lrNumbersContainer.style.display = 'block';
        } else {
          lrNumbersDisplay.innerHTML = '<span style="color: #9ca3af;">No LRs linked to this Daily Register entry</span>';
          lrNumbersContainer.style.display = 'block';
        }
        
        // Auto-fill Rate per Tonne from Daily Register truck rate
        if (entry.truckRate) {
          ratePerTonneField.value = entry.truckRate;
          ratePerTonneField.classList.add('bg-yellow-50');
          ratePerTonneField.placeholder = 'Auto-filled from Daily Register';
          // Trigger calculation after auto-filling rate
          calculateChallanTotal();
        }
        
        // Commission logic: Only editable if pending in daily register
        if (entry.commissionApplicable && entry.commissionStatus === 'Pending') {
          // Commission is pending - allow manual entry on challan
          commissionField.value = entry.commission || 0;
          commissionField.readOnly = false;
          commissionField.classList.remove('bg-gray-50');
          commissionField.placeholder = 'Enter commission amount';
        } else if (entry.commissionApplicable && entry.commissionStatus === 'Paid') {
          // Commission already paid - don't flow to challan
          commissionField.value = 0;
          commissionField.readOnly = true;
          commissionField.classList.add('bg-gray-50');
          commissionField.placeholder = 'Commission already paid in Daily Register';
        } else {
          // No commission applicable
          commissionField.value = 0;
          commissionField.readOnly = true;
          commissionField.classList.add('bg-gray-50');
          commissionField.placeholder = 'No commission';
        }
      }
    }

    async function handleBillingSubmit(e) {
      e.preventDefault();
      const formData = new FormData(e.target);
      
      // Get all selected LR IDs
      const lrIds = formData.getAll('lrId[]');
      
      if (lrIds.length === 0 || (lrIds.length === 1 && !lrIds[0])) {
        alert('Please select at least one LR');
        return;
      }
      
      // Filter out empty values
      const validLrIds = lrIds.filter(id => id && id.trim() !== '');
      
      if (validLrIds.length === 0) {
        alert('Please select at least one LR');
        return;
      }
      
      const billNumber = formData.get('billNumber');
      const billDate = formData.get('billDate');
      const billAmount = parseFloat(formData.get('billAmount')) || 0;
      const gstApplicable = formData.get('gstApplicable') === 'true';
      const gstAmount = parseFloat(formData.get('gstAmount')) || 0;
      
      // Update all selected LRs with the same bill details
      let successCount = 0;
      for (const lrId of validLrIds) {
        const lr = allRecords.find(r => r.__backendId === lrId);
        if (lr) {
          lr.billNumber = billNumber;
          lr.billDate = billDate;
          lr.billAmount = billAmount;
          lr.gstApplicable = gstApplicable;
          lr.gstAmount = gstAmount;
          lr.status = 'Billed';

          const result = await window.dataSdk.update(lr);
          if (result.isOk) {
            successCount++;
          }
        }
      }
      
      if (successCount > 0) {
        alert(`✅ Bill created successfully!\n${successCount} LR(s) added to bill ${billNumber}`);
        e.target.reset();
        
        // Reset the LR items container to initial state
        const container = document.getElementById('lrItemsContainer');
        container.innerHTML = `
          <div class="lr-item flex gap-2 items-end p-3 bg-white rounded-lg border border-gray-200">
            <div class="flex-1">
              <label class="block text-xs font-medium text-gray-600 mb-1">Select LR</label>
              <select name="lrId[]" required class="input-field w-full text-sm lr-select"> 
                <option value="">-- Select a received LR --</option> 
              </select>
            </div>
            <button type="button" class="remove-lr-btn btn-secondary text-sm px-3 py-2 mb-1" style="display: none;">Remove</button>
          </div>
        `;
        
        populateLRSelects();
        populateReceivedLRSelect();
      }
    }


    async function handlePaymentSubmit(e) {
      e.preventDefault();
      const formData = new FormData(e.target);
      
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner inline-block mr-2"></span>Processing Payment...';
      }

      // Basic payment data
      const paymentData = {
        type: 'payment_transaction',
        entryId: formData.get('entryId'),
        paymentDate: formData.get('paymentDate'),
        paymentType: formData.get('paymentType'),
        paymentAmount: parseFloat(formData.get('paymentAmount')) || 0,
        paymentMode: formData.get('paymentMode'),
        paymentReference: formData.get('paymentReference') || '',
        bankName: formData.get('bankName') || '',
        
        // Party details
        paidByReceived: formData.get('paidByReceived') || '',
        contactNumber: formData.get('contactNumber') || '',
        panNumber: formData.get('panNumber') || '',
        
        // Tax details
        tdsApplicable: formData.get('tdsApplicable') === 'on',
        tdsPercentage: parseFloat(formData.get('tdsPercentage')) || 0,
        tdsAmount: parseFloat(formData.get('tdsAmount')) || 0,
        gstApplicable: formData.get('gstApplicable') === 'on',
        gstPercentage: parseFloat(formData.get('gstPercentage')) || 0,
        gstAmount: parseFloat(formData.get('gstAmount')) || 0,
        netAmount: parseFloat(formData.get('netAmount')) || parseFloat(formData.get('paymentAmount')) || 0,
        
        // Ledger details
        adjustmentStatus: formData.get('adjustmentStatus'),
        adjustAgainst: formData.get('adjustAgainst') || 'Auto',
        paymentNotes: formData.get('paymentNotes') || '',
        
        // Status
        ledgerStatus: formData.get('adjustmentStatus') === 'Auto-Adjusted' ? 'Adjusted' : 'Pending',
        createdAt: new Date().toISOString(),
        recordedBy: localStorage.getItem('sgfc_user') || 'Admin'
      };

      // Get the associated entry to add context and calculate outstanding
      const entry = allRecords.find(r => r.__backendId === paymentData.entryId);
      if (entry) {
        paymentData.truckNumber = entry.truckNumber || '';
        paymentData.companyName = entry.companyName || '';
        paymentData.partyName = entry.partyName || '';
        paymentData.truckOwner = entry.truckOwner || '';
        paymentData.from = entry.from || '';
        paymentData.to = entry.to || '';
        paymentData.entryType = entry.type || '';
        
        // Calculate outstanding amounts
        const existingPayments = allRecords.filter(r => 
          r.type === 'payment_transaction' && r.entryId === entry.__backendId
        );
        
        if (entry.type === 'daily_register') {
          const totalCompanyPayments = existingPayments
            .filter(p => p.paymentType === 'Advance from Company' || p.paymentType === 'Balance from Company')
            .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
          
          const totalOwnerPayments = existingPayments
            .filter(p => p.paymentType === 'Advance to Owner' || p.paymentType === 'Balance to Owner')
            .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
          
          paymentData.companyOutstanding = (entry.companyRate || 0) - totalCompanyPayments;
          paymentData.ownerOutstanding = (entry.truckRate || 0) - totalOwnerPayments;
        }
        
        // Auto-adjust if selected
        if (paymentData.adjustmentStatus === 'Auto-Adjusted' && entry.type === 'daily_register') {
          // Determine what to adjust against based on payment type
          if (paymentData.paymentType.includes('Company') || paymentData.paymentType.includes('Party')) {
            // This is receivable - adjust against company rate or freight amount
            const totalReceived = existingPayments
              .filter(p => p.paymentType.includes('Company') || p.paymentType.includes('Party'))
              .reduce((sum, p) => sum + (p.paymentAmount || 0), 0) + paymentData.paymentAmount;
            
            if (totalReceived >= (entry.companyRate || entry.freightAmount || 0)) {
              entry.paymentStatus = 'Fully Paid';
            } else {
              entry.paymentStatus = 'Partially Paid';
            }
          } else if (paymentData.paymentType.includes('Owner')) {
            // This is payable - adjust against truck rate
            const totalPaid = existingPayments
              .filter(p => p.paymentType.includes('Owner'))
              .reduce((sum, p) => sum + (p.paymentAmount || 0), 0) + paymentData.paymentAmount;
            
            if (totalPaid >= (entry.truckRate || 0)) {
              entry.ownerPaymentStatus = 'Fully Paid';
            } else {
              entry.ownerPaymentStatus = 'Partially Paid';
            }
          }
          
          await window.dataSdk.update(entry);
        }
      }

      const result = await window.dataSdk.create(paymentData);
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '💾 Record Payment Transaction';
      }
      
      if (result.isOk) {
        e.target.reset();
        const selectedDetails = document.getElementById('selectedPaymentEntryDetails');
        if (selectedDetails) {
          selectedDetails.innerHTML = '<p class="text-gray-600">No entry selected. Select an entry above to see details and outstanding amounts.</p>';
        }
        
        // Show success message with details
        const successMsg = `
          ✅ Payment Recorded Successfully!
          
          Amount: ₹${paymentData.paymentAmount.toLocaleString()}
          Type: ${paymentData.paymentType}
          Mode: ${paymentData.paymentMode}
          ${paymentData.tdsAmount > 0 ? '\nTDS: ₹' + paymentData.tdsAmount.toLocaleString() : ''}
          ${paymentData.gstAmount > 0 ? '\nGST: ₹' + paymentData.gstAmount.toLocaleString() : ''}
          Net Amount: ₹${paymentData.netAmount.toLocaleString()}
          
          ${paymentData.adjustmentStatus === 'Auto-Adjusted' ? '✅ Ledger auto-adjusted' : '⏳ Pending ledger adjustment'}
        `;
        
        alert(successMsg);
        updatePaymentTrackingUI();
      } else {
        alert('❌ Failed to record payment. Please try again.');
      }
    }

    async function handleLRSentSubmit(e) {
      e.preventDefault();
      const formData = new FormData(e.target);
      const lrId = formData.get('lrId');
      
      const lr = allRecords.find(r => r.__backendId === lrId);
      if (lr) {
        lr.lrSentDate = formData.get('lrSentDate');
        lr.lrSentTo = formData.get('lrSentTo');
        lr.lrSentToName = formData.get('lrSentToName');
        lr.lrSentMethod = formData.get('lrSentMethod');
        
        if (lr.lrSentMethod === 'Courier') {
          lr.courierDocketNumber = formData.get('courierDocketNumber');
          lr.selfPersonName = null;
        } else if (lr.lrSentMethod === 'Self') {
          lr.selfPersonName = formData.get('selfPersonName');
          lr.courierDocketNumber = null;
        }
        
        lr.lrSentNotes = formData.get('lrSentNotes');
        lr.lrSentStatus = 'Sent';

        const result = await window.dataSdk.update(lr);
        if (result.isOk) {
          e.target.reset();
          document.getElementById('courierDetailsField').classList.add('hidden');
          document.getElementById('selfDetailsField').classList.add('hidden');
          populateBilledLRSelect();
          alert('LR sent information recorded successfully!');
        }
      }
    }

    async function handleTruckMasterSubmit(e) {
      e.preventDefault();
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner inline-block mr-2"></span>Adding...';
      }
      
      const formData = new FormData(e.target);
      
      const data = {
        type: 'truck_master',
        truckNumber: formData.get('truckNumber'),
        truckOwner: formData.get('truckOwner'),
        driverName: formData.get('driverName') || '',
        driverPhone: formData.get('driverPhone') || '',
        createdAt: new Date().toISOString()
      };

      const result = await window.dataSdk.create(data);
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Add Truck';
      }
      
      if (result.isOk) {
        e.target.reset();
        showInlineMessage('Truck added successfully!', 'success');
      } else {
        showInlineMessage('Failed to add truck. Please try again.', 'error');
      }
    }

    async function handleCompanyMasterSubmit(e) {
      e.preventDefault();
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner inline-block mr-2"></span>Adding...';
      }
      
      const formData = new FormData(e.target);
      
      const data = {
        type: 'company_master',
        companyName: formData.get('companyName'),
        companyGST: formData.get('companyGST') || '',
        companyAddress: formData.get('companyAddress') || '',
        createdAt: new Date().toISOString()
      };

      const result = await window.dataSdk.create(data);
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Add Company';
      }
      
      if (result.isOk) {
        e.target.reset();
        showInlineMessage('Company added successfully!', 'success');
      } else {
        showInlineMessage('Failed to add company. Please try again.', 'error');
      }
    }

    async function handlePartyMasterSubmit(e) {
      e.preventDefault();
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner inline-block mr-2"></span>Adding...';
      }
      
      const formData = new FormData(e.target);
      
      const data = {
        type: 'party_master',
        partyName: formData.get('partyName'),
        partyGST: formData.get('partyGST') || '',
        partyAddress: formData.get('partyAddress') || '',
        createdAt: new Date().toISOString()
      };

      const result = await window.dataSdk.create(data);
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Add Party';
      }
      
      if (result.isOk) {
        e.target.reset();
        showInlineMessage('Party added successfully!', 'success');
      } else {
        showInlineMessage('Failed to add party. Please try again.', 'error');
      }
    }

    async function handleStaffMasterSubmit(e) {
      e.preventDefault();
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner inline-block mr-2"></span>Adding...';
      }
      
      const formData = new FormData(e.target);
      
      const data = {
        type: 'staff_master',
        staffName: formData.get('staffName'),
        staffSalary: parseFloat(formData.get('staffSalary')) || 0,
        createdAt: new Date().toISOString()
      };

      const result = await window.dataSdk.create(data);
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Add Staff';
      }
      
      if (result.isOk) {
        e.target.reset();
        showInlineMessage('Staff added successfully!', 'success');
      } else {
        showInlineMessage('Failed to add staff. Please try again.', 'error');
      }
    }


    function handleDailyEntrySelect(e) {
      const entryId = e.target.value;
      if (!entryId) {
        const form = document.getElementById('lrForm');
        form.truckNumber.value = '';
        form.companyName.value = '';
        form.companyGST.value = '';
        form.from.value = '';
        form.to.value = '';
        form.paymentCategory.value = '';
        form.dailyEntryId.value = '';
        return;
      }

      const entry = allRecords.find(r => r.__backendId === entryId);
      if (entry) {
        const form = document.getElementById('lrForm');
        form.truckNumber.value = entry.truckNumber || '';
        form.companyName.value = entry.companyName || '';
        
        const company = allRecords.find(r => r.type === 'company_master' && r.companyName === entry.companyName);
        if (company) {
          form.companyGST.value = company.companyGST || '';
        }
        
        form.from.value = entry.from || '';
        form.to.value = entry.to || '';
        form.paymentCategory.value = entry.bookingType || '';
        form.dailyEntryId.value = entryId;
      }
    }

    function handleDailyEntryNonBookingSelect(e) {
      const entryId = e.target.value;
      if (!entryId) {
        const form = document.getElementById('nonBookingLRForm');
        form.truckNumber.value = '';
        form.partyName.value = '';
        form.from.value = '';
        form.to.value = '';
        form.paymentCategory.value = '';
        form.dailyEntryId.value = '';
        return;
      }

      const entry = allRecords.find(r => r.__backendId === entryId);
      if (entry) {
        const form = document.getElementById('nonBookingLRForm');
        form.truckNumber.value = entry.truckNumber || '';
        form.partyName.value = entry.partyName || '';
        form.from.value = entry.from || '';
        form.to.value = entry.to || '';
        form.paymentCategory.value = entry.bookingType || '';
        form.dailyEntryId.value = entryId;
      }
    }

    function populateDailyEntrySelect() {
      const select = document.getElementById('selectDailyEntry');
      // Get daily register entries that are:
      // 1. Type of booking is "Booking"
      // 2. Either status is 'Pending' OR there are no LRs linked to this entry
      const entries = allRecords.filter(r => {
        if (r.type !== 'daily_register' || r.typeOfBooking !== 'Booking') return false;
        
        // Check if there's any booking LR linked to this entry
        const hasLinkedLR = allRecords.some(lr => {
          if (lr.type !== 'booking_lr') return false;
          
          // Check by dailyEntryId
          if (lr.dailyEntryId === r.__backendId) return true;
          
          // Check by truck number and date match
          if (lr.truckNumber && r.truckNumber && 
              lr.truckNumber.toLowerCase() === r.truckNumber.toLowerCase()) {
            if (lr.lrDate && r.date) {
              const lrDate = new Date(lr.lrDate).toDateString();
              const entryDate = new Date(r.date).toDateString();
              if (lrDate === entryDate) return true;
            }
          }
          
          return false;
        });
        
        // Show if no LR is linked (even if status was changed previously)
        return !hasLinkedLR;
      });
      
      select.innerHTML = '<option value="">-- Select a daily register entry --</option>';
      entries.forEach(entry => {
        const option = document.createElement('option');
        option.value = entry.__backendId;
        option.textContent = `${entry.date} - ${entry.truckNumber} - ${entry.companyName} (${entry.from} → ${entry.to}) - ${entry.bookingType}`;
        select.appendChild(option);
      });
    }

    function populateDailyEntryNonBookingSelect() {
      const select = document.getElementById('selectDailyEntryNonBooking');
      // Get daily register entries that are:
      // 1. Type of booking is "Non Booking"
      // 2. Either status is 'Pending' OR there are no LRs linked to this entry
      const entries = allRecords.filter(r => {
        if (r.type !== 'daily_register' || r.typeOfBooking !== 'Non Booking') return false;
        
        // Check if there's any non-booking LR linked to this entry
        const hasLinkedLR = allRecords.some(lr => {
          if (lr.type !== 'non_booking_lr') return false;
          
          // Check by dailyEntryId
          if (lr.dailyEntryId === r.__backendId) return true;
          
          // Check by truck number and date match
          if (lr.truckNumber && r.truckNumber && 
              lr.truckNumber.toLowerCase() === r.truckNumber.toLowerCase()) {
            if (lr.lrDate && r.date) {
              const lrDate = new Date(lr.lrDate).toDateString();
              const entryDate = new Date(r.date).toDateString();
              if (lrDate === entryDate) return true;
            }
          }
          
          return false;
        });
        
        // Show if no LR is linked (even if status was changed previously)
        return !hasLinkedLR;
      });
      
      select.innerHTML = '<option value="">-- Select a daily register entry --</option>';
      entries.forEach(entry => {
        const option = document.createElement('option');
        option.value = entry.__backendId;
        option.textContent = `${entry.date} - ${entry.truckNumber} - ${entry.partyName} (${entry.from} → ${entry.to}) - ${entry.bookingType}`;
        select.appendChild(option);
      });
    }

    function populateConsignorConsigneeSelects() {
      const companies = allRecords.filter(r => r.type === 'company_master');
      
      const consignorSelect = document.getElementById('lrConsignorSelect');
      const consigneeSelect = document.getElementById('lrConsigneeSelect');
      
      const optionsHTML = '<option value="">Select Company</option>' + 
        companies.map(c => `<option value="${c.companyName}">${c.companyName}</option>`).join('');
      
      consignorSelect.innerHTML = optionsHTML;
      consigneeSelect.innerHTML = optionsHTML;
    }

    function populateDailyForChallanSelect() {
      const select = document.getElementById('selectDailyForChallan');
      // Get daily register entries that don't have challans linked to them
      const entries = allRecords.filter(r => {
        if (r.type !== 'daily_register') return false;
        
        // Check if there's any challan linked to this entry
        const hasLinkedChallan = allRecords.some(challan => {
          if (challan.type !== 'challan_book') return false;
          
          // Check by dailyEntryId
          if (challan.dailyEntryId === r.__backendId) return true;
          
          // Check by truck number and date match
          if (challan.truckNumber && r.truckNumber && 
              challan.truckNumber.toLowerCase() === r.truckNumber.toLowerCase()) {
            if (challan.date && r.date) {
              const challanDate = new Date(challan.date).toDateString();
              const entryDate = new Date(r.date).toDateString();
              if (challanDate === entryDate) return true;
            }
          }
          
          return false;
        });
        
        // Show if no challan is linked (even if status was changed previously)
        return !hasLinkedChallan;
      });
      
      select.innerHTML = '<option value="">-- Select a daily register entry --</option>';
      entries.forEach(entry => {
        const option = document.createElement('option');
        option.value = entry.__backendId;
        option.textContent = `${entry.date} - ${entry.truckNumber} - ${entry.companyName} (${entry.from} → ${entry.to})`;
        select.appendChild(option);
      });
    }

    function populateLRSelect() {
      const select = document.getElementById('selectLR');
      const lrs = allRecords.filter(r => 
        (r.type === 'booking_lr' || r.type === 'non_booking_lr') && 
        !r.lrReceived && 
        r.paymentCategory === 'To Be Billed'
      );
      
      select.innerHTML = '<option value="">-- Select an LR --</option>';
      lrs.forEach(lr => {
        const option = document.createElement('option');
        option.value = lr.__backendId;
        const lrType = lr.type === 'booking_lr' ? 'Booking' : 'Non-Booking';
        const companyOrParty = lr.companyName || lr.partyName || 'N/A';
        option.textContent = `${lr.lrNumber} - ${lr.truckNumber} - ${companyOrParty} (${lrType})`;
        select.appendChild(option);
      });
    }

    function populateLRForDeductionSelect() {
      const select = document.getElementById('selectLRForDeduction');
      const lrs = allRecords.filter(r => 
        (r.type === 'booking_lr' || r.type === 'non_booking_lr') && 
        r.lrReceived && 
        r.lrCondition !== 'Perfectly Alright' &&
        r.status !== 'Deduction Recorded'
      );
      
      select.innerHTML = '<option value="">-- Select an LR with issues --</option>';
      lrs.forEach(lr => {
        const option = document.createElement('option');
        option.value = lr.__backendId;
        const lrType = lr.type === 'booking_lr' ? 'Booking' : 'Non-Booking';
        const companyOrParty = lr.companyName || lr.partyName || 'N/A';
        option.textContent = `${lr.lrNumber} - ${lr.truckNumber} - ${companyOrParty} (${lrType}) - ${lr.lrCondition}`;
        select.appendChild(option);
      });
    }

    function populateReceivedLRSelect() {
      const select = document.getElementById('selectReceivedLR');
      const lrs = allRecords.filter(r => 
        (r.type === 'booking_lr' || r.type === 'non_booking_lr') && 
        r.lrReceived && 
        r.status !== 'Billed' &&
        r.billingTo !== 'Not Applicable'
      );
      
      select.innerHTML = '<option value="">-- Select a received LR --</option>';
      lrs.forEach(lr => {
        const option = document.createElement('option');
        option.value = lr.__backendId;
        const lrType = lr.type === 'booking_lr' ? 'Booking' : 'Non-Booking';
        const companyOrParty = lr.companyName || lr.partyName || 'N/A';
        option.textContent = `${lr.lrNumber} - ${lr.truckNumber} - ${companyOrParty} (${lrType})`;
        select.appendChild(option);
      });
    }
    
    // Multiple LR Functions
    function populateLRSelects() {
      const lrSelects = document.querySelectorAll('.lr-select');
      const lrs = allRecords.filter(r => 
        (r.type === 'booking_lr' || r.type === 'non_booking_lr') && 
        r.lrReceived && 
        r.status !== 'Billed' &&
        r.billingTo !== 'Not Applicable'
      );
      
      lrSelects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">-- Select a received LR --</option>';
        lrs.forEach(lr => {
          const option = document.createElement('option');
          option.value = lr.__backendId;
          const lrType = lr.type === 'booking_lr' ? 'Booking' : 'Non-Booking';
          const companyOrParty = lr.companyName || lr.partyName || 'N/A';
          option.textContent = `${lr.lrNumber} - ${lr.truckNumber} - ${companyOrParty} (${lrType})`;
          if (lr.__backendId === currentValue) {
            option.selected = true;
          }
          select.appendChild(option);
        });
      });
    }
    
    function addNewLRItem() {
      const container = document.getElementById('lrItemsContainer');
      const newItem = document.createElement('div');
      newItem.className = 'lr-item flex gap-2 items-end p-3 bg-white rounded-lg border border-gray-200';
      newItem.innerHTML = `
        <div class="flex-1">
          <label class="block text-xs font-medium text-gray-600 mb-1">Select LR</label>
          <select name="lrId[]" required class="input-field w-full text-sm lr-select"> 
            <option value="">-- Select a received LR --</option> 
          </select>
        </div>
        <button type="button" class="remove-lr-btn btn-secondary text-sm px-3 py-2 mb-1">Remove</button>
      `;
      
      container.appendChild(newItem);
      
      // Populate the new select
      populateLRSelects();
      
      // Add remove button event listener
      const removeBtn = newItem.querySelector('.remove-lr-btn');
      removeBtn.addEventListener('click', function() {
        removeLRItem(newItem);
      });
      
      // Update remove button visibility
      updateRemoveButtons();
    }
    
    function removeLRItem(item) {
      const container = document.getElementById('lrItemsContainer');
      const items = container.querySelectorAll('.lr-item');
      
      // Don't allow removing if only one item
      if (items.length > 1) {
        item.remove();
        updateRemoveButtons();
      }
    }
    
    function updateRemoveButtons() {
      const container = document.getElementById('lrItemsContainer');
      const items = container.querySelectorAll('.lr-item');
      const removeButtons = container.querySelectorAll('.remove-lr-btn');
      
      // Show remove buttons only if more than one item
      removeButtons.forEach(btn => {
        if (items.length > 1) {
          btn.style.display = 'block';
        } else {
          btn.style.display = 'none';
        }
      });
    }


    function populateBilledLRSelect() {
      const select = document.getElementById('selectBilledLR');
      if (!select) return;
      
      const lrs = allRecords.filter(r => 
        (r.type === 'booking_lr' || r.type === 'non_booking_lr') && 
        r.status === 'Billed' &&
        !r.lrSentStatus
      );
      
      select.innerHTML = '<option value="">-- Select a billed LR --</option>';
      lrs.forEach(lr => {
        const option = document.createElement('option');
        option.value = lr.__backendId;
        const lrType = lr.type === 'booking_lr' ? 'Booking' : 'Non-Booking';
        const companyOrParty = lr.companyName || lr.partyName || 'N/A';
        option.textContent = `${lr.lrNumber} - ${lr.billNumber} - ${companyOrParty} (${lrType})`;
        select.appendChild(option);
      });
    }

    function showInlineMessage(message, type) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${type === 'error' ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-green-100 text-green-800 border border-green-300'}`;
      messageDiv.textContent = message;
      document.body.appendChild(messageDiv);
      
      setTimeout(() => {
        messageDiv.remove();
      }, 3000);
    }

    async function handleSaveData() {
      const btn = document.getElementById('saveDataBtn');
      const originalHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner inline-block mr-2"></span>Syncing...';
      
      try {
        if (!window.firebaseReady || !window.firebaseDB) {
          throw new Error('Firebase not ready. Please check your internet connection.');
        }
        
        showInlineMessage('✅ All data is already synced to cloud in real-time!', 'success');
        console.log('☁️ Cloud sync is automatic - all records are already saved');
      } catch (error) {
        console.error('Sync error:', error);
        showInlineMessage('❌ Cloud not available: ' + error.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }
    }

    function handleBackupData() {
      const backup = {
        timestamp: new Date().toISOString(),
        recordCount: allRecords.length,
        data: allRecords
      };

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transport-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);

      showInlineMessage(`Backup created with ${allRecords.length} records!`, 'success');
    }

    function handleRestoreData() {
      document.getElementById('restoreFileInput').click();
    }

    async function handleRestoreFileSelect(e) {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const backup = JSON.parse(text);

        if (!backup.data || !Array.isArray(backup.data)) {
          showInlineMessage('Invalid backup file format', 'error');
          return;
        }

        // Show confirmation modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 modal-overlay flex items-center justify-center z-50';
        modal.innerHTML = `
          <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 class="text-lg font-semibold mb-4">Confirm Restore</h3>
            <p class="text-gray-600 mb-4">
              This will restore ${backup.data.length} records from backup dated ${new Date(backup.timestamp).toLocaleString()}.
            </p>
            <p class="text-red-600 font-semibold mb-6">
              Warning: This will add all backup records to your current data. Existing records will not be deleted.
            </p>
            <div class="flex gap-3 justify-end">
              <button id="cancelRestore" class="btn-secondary">Cancel</button>
              <button id="confirmRestore" class="btn-primary">Restore</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('cancelRestore').addEventListener('click', () => {
          modal.remove();
          e.target.value = '';
        });

        document.getElementById('confirmRestore').addEventListener('click', async () => {
          modal.remove();
          
          let successCount = 0;
          let errorCount = 0;

          for (const record of backup.data) {
            const { __backendId, ...recordData } = record;
            const result = await window.dataSdk.create(recordData);
            if (result.isOk) {
              successCount++;
            } else {
              errorCount++;
            }
          }

          if (errorCount === 0) {
            showInlineMessage(`Successfully restored ${successCount} records!`, 'success');
          } else {
            showInlineMessage(`Restored ${successCount} records, ${errorCount} failed`, 'error');
          }

          e.target.value = '';
        });

      } catch (error) {
        showInlineMessage('Error reading backup file', 'error');
        e.target.value = '';
      }
    }

    function handleLogout() {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 modal-overlay flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <h3 class="text-lg font-semibold mb-4">Confirm Logout</h3>
          <p class="text-gray-600 mb-6">
            Are you sure you want to logout? All your data is safely stored in your Canva Sheet.
          </p>
          <div class="flex gap-3 justify-end">
            <button id="cancelLogout" class="btn-secondary">Cancel</button>
            <button id="confirmLogout" class="btn-primary bg-red-600 hover:bg-red-700">Logout</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('cancelLogout').addEventListener('click', () => {
        modal.remove();
      });

      document.getElementById('confirmLogout').addEventListener('click', () => {
        modal.remove();
        showInlineMessage('Logged out successfully!', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      });
    }

    function applyFilters() {
      const truck = document.getElementById('filterTruck').value.toLowerCase();
      const company = document.getElementById('filterCompany').value.toLowerCase();
      const party = document.getElementById('filterParty').value.toLowerCase();
      const from = document.getElementById('filterFrom').value.toLowerCase();
      const to = document.getElementById('filterTo').value.toLowerCase();
      const dateFrom = document.getElementById('filterDateFrom').value;
      const dateTo = document.getElementById('filterDateTo').value;
      const status = document.getElementById('filterStatus').value;
      const placedBy = document.getElementById('filterPlacedBy').value;
      const commissionStatus = document.getElementById('filterCommissionStatus').value;

      // Only filter daily_register entries to avoid showing duplicates with LRs
      filteredRecords = allRecords.filter(record => {
        // Only include daily_register entries
        if (record.type !== 'daily_register') return false;
        
        if (truck && !record.truckNumber?.toLowerCase().includes(truck)) return false;
        if (company && !record.companyName?.toLowerCase().includes(company)) return false;
        if (party && !record.partyName?.toLowerCase().includes(party)) return false;
        if (from && !record.from?.toLowerCase().includes(from)) return false;
        if (to && !record.to?.toLowerCase().includes(to)) return false;
        if (status && record.status !== status) return false;
        if (placedBy && record.placedBy !== placedBy) return false;
        
        // Commission status filter
        if (commissionStatus === 'pending') {
          // Only show entries with commission applicable and not paid
          if (!record.commissionApplicable || record.commissionStatus === 'Paid') return false;
        } else if (commissionStatus === 'paid') {
          // Only show entries with commission applicable and paid
          if (!record.commissionApplicable || record.commissionStatus !== 'Paid') return false;
        }
        
        const recordDate = record.date || record.lrDate;
        if (dateFrom && recordDate < dateFrom) return false;
        if (dateTo && recordDate > dateTo) return false;
        
        return true;
      });

      updateReportsUI();
      updateActiveFilters();
    }

    function clearFilters() {
      document.getElementById('filterTruck').value = '';
      document.getElementById('filterCompany').value = '';
      document.getElementById('filterParty').value = '';
      document.getElementById('filterFrom').value = '';
      document.getElementById('filterTo').value = '';
      document.getElementById('filterDateFrom').value = '';
      document.getElementById('filterDateTo').value = '';
      document.getElementById('filterStatus').value = '';
      document.getElementById('filterPlacedBy').value = '';
      document.getElementById('filterCommissionStatus').value = '';
      
      // Show only daily_register entries by default
      filteredRecords = allRecords.filter(r => r.type === 'daily_register');
      updateReportsUI();
      updateActiveFilters();
    }

    function updateActiveFilters() {
      const container = document.getElementById('activeFilters');
      const filters = [];
      
      const truck = document.getElementById('filterTruck').value;
      const company = document.getElementById('filterCompany').value;
      const party = document.getElementById('filterParty').value;
      const from = document.getElementById('filterFrom').value;
      const to = document.getElementById('filterTo').value;
      const status = document.getElementById('filterStatus').value;
      const placedBy = document.getElementById('filterPlacedBy').value;
      const commissionStatus = document.getElementById('filterCommissionStatus').value;
      
      if (truck) filters.push(`Truck: ${truck}`);
      if (company) filters.push(`Company: ${company}`);
      if (party) filters.push(`Party: ${party}`);
      if (from) filters.push(`From: ${from}`);
      if (to) filters.push(`To: ${to}`);
      if (status) filters.push(`Status: ${status}`);
      if (placedBy) filters.push(`Placed By: ${placedBy}`);
      if (commissionStatus === 'pending') filters.push(`Commission: Pending Only`);
      if (commissionStatus === 'paid') filters.push(`Commission: Paid Only`);
      
      container.innerHTML = filters.map(f => `<span class="filter-chip">${f}</span>`).join('');
    }

    function populateReportFilters() {
      const filterPlacedBy = document.getElementById('filterPlacedBy');
      if (!filterPlacedBy) return;
      
      // Get unique placed by values from daily register entries
      const placedByValues = [...new Set(allRecords
        .filter(r => r.type === 'daily_register' && r.placedBy)
        .map(r => r.placedBy)
      )].sort();
      
      const companyTitle = window.elementSdk?.config?.company_title || defaultConfig.company_title;
      
      filterPlacedBy.innerHTML = '<option value="">All Staff</option>' + 
        placedByValues.map(pb => `<option value="${pb}">${pb}</option>`).join('');
    }

    function exportReport() {
      const headers = ['Date', 'Truck No.', 'Company', 'Party', 'From', 'To', 'Truck Rate', 'Company Rate', 'Commission', 'Profit', 'Status'];
      const rows = filteredRecords.map(r => [
        r.date || r.lrDate || '',
        r.truckNumber || '',
        r.companyName || '',
        r.partyName || '',
        r.from || '',
        r.to || '',
        r.truckRate || 0,
        r.companyRate || 0,
        r.commission || 0,
        calculateProfit(r),
        r.status || ''
      ]);
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transport-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }

    function exportToCSV(type) {
      let headers = [];
      let rows = [];
      let filename = '';

      switch(type) {
        case 'daily_register':
          headers = ['Date', 'Truck No.', 'Size', 'Company', 'Party', 'From', 'To', 'Payment Type', 'Booking Type', 'Placed By', 'Truck Rate', 'Company Rate', 'Commission', 'Profit', 'Status'];
          rows = allRecords.filter(r => r.type === 'daily_register').map(r => [
            r.date || '', r.truckNumber || '', r.truckSize || '', r.companyName || '', r.partyName || '',
            r.from || '', r.to || '', r.bookingType || '', r.typeOfBooking || '', r.placedBy || '',
            r.truckRate || 0, r.companyRate || 0, r.commission || 0, calculateProfit(r), r.status || ''
          ]);
          filename = 'daily-register';
          break;

        case 'booking_lr':
          headers = ['LR No.', 'Date', 'Truck No.', 'Consignor', 'Consignee', 'Billing To', 'Product', 'Weight', 'Advance', 'Category', 'Status'];
          rows = allRecords.filter(r => r.type === 'booking_lr').map(r => [
            r.lrNumber || '', r.lrDate || '', r.truckNumber || '', r.consignorName || '', r.consigneeName || '',
            r.billingTo || '', r.productName || '', r.weight || 0, r.advanceToDriver || 0, r.paymentCategory || '', r.status || ''
          ]);
          filename = 'booking-lrs';
          break;

        case 'non_booking_lr':
          headers = ['LR No.', 'Date', 'Truck No.', 'Party', 'From', 'To', 'Product', 'Weight', 'Freight', 'Status'];
          rows = allRecords.filter(r => r.type === 'non_booking_lr').map(r => [
            r.lrNumber || '', r.lrDate || '', r.truckNumber || '', r.partyName || '', r.from || '', r.to || '',
            r.productName || '', r.weight || 0, r.freightAmount || 0, r.status || ''
          ]);
          filename = 'non-booking-lrs';
          break;

        case 'challan_book':
          headers = ['Truck No.', 'Owner', 'Date', 'From', 'To', 'Weight', 'Truck Rate', 'Advance', 'Commission', 'Hammali', 'Other Deductions', 'Total Amount', 'Balance Due'];
          rows = allRecords.filter(r => r.type === 'challan_book').map(r => {
            const truckMaster = allRecords.find(tm => tm.type === 'truck_master' && tm.truckNumber === r.truckNumber);
            const totalAmount = r.truckRate || 0;
            const deductions = (r.commission || 0) + (r.hammaliCharges || 0) + (r.otherDeductions || 0);
            const advance = r.advancePaidToOwner || 0;
            const balance = totalAmount - deductions - advance;
            return [
              r.truckNumber || '', truckMaster?.truckOwner || '', r.date || '', r.from || '', r.to || '',
              r.weight || 0, r.truckRate || 0, advance, r.commission || 0, r.hammaliCharges || 0,
              r.otherDeductions || 0, totalAmount, balance
            ];
          });
          filename = 'challan-book';
          break;

        case 'lr_received':
          headers = ['LR No.', 'Type', 'Truck No.', 'Company/Party', 'Received Date', 'Condition', 'Halting', 'Hammali', 'Status'];
          rows = allRecords.filter(r => (r.type === 'booking_lr' || r.type === 'non_booking_lr') && r.lrReceived).map(r => [
            r.lrNumber || '', r.type === 'booking_lr' ? 'Booking' : 'Non-Booking', r.truckNumber || '',
            r.companyName || r.partyName || '', r.lrReceivedDate || '', r.lrCondition || '',
            r.haltingCharges || 0, r.hammaliCharges || 0, r.status || ''
          ]);
          filename = 'lr-received';
          break;

        case 'deduction_entry':
          headers = ['LR No.', 'Type', 'Truck No.', 'Company/Party', 'Received Date', 'Deduction Type', 'Damage Charges', 'Other Deductions', 'Total Deducted', 'Damage Details', 'Missing Details'];
          rows = allRecords.filter(r => r.type === 'deduction_entry').map(r => {
            const totalDeducted = (r.damageCharges || 0) + (r.otherDeductions || 0);
            return [
              r.lrNumber || '', r.lrType === 'booking_lr' ? 'Booking' : 'Non-Booking', r.truckNumber || '',
              r.companyName || r.partyName || '', r.lrReceivedDate || '', r.deductionType || '',
              r.damageCharges || 0, r.otherDeductions || 0, totalDeducted, r.damageDetails || '', r.missingDetails || ''
            ];
          });
          filename = 'deductions';
          break;

        case 'bills':
          headers = ['Bill No.', 'Bill Date', 'LR No.', 'Billed To', 'Bill Amount', 'GST', 'Total', 'Status'];
          rows = allRecords.filter(r => (r.type === 'booking_lr' || r.type === 'non_booking_lr') && r.billNumber).map(r => {
            const total = (r.billAmount || 0) + (r.gstAmount || 0);
            return [
              r.billNumber || '', r.billDate || '', r.lrNumber || '', r.billingTo || '',
              r.billAmount || 0, r.gstAmount || 0, total, r.status || ''
            ];
          });
          filename = 'bills';
          break;

        case 'profit_loss':
          headers = ['S.No', 'Truck Number', 'Date', 'Company/Party Name', 'Total Truck Amount', 'Total Amount from LR', 'Profit'];
          const bookings = plFilteredRecords.length > 0 ? plFilteredRecords : allRecords.filter(r => 
            r.type === 'daily_register' || r.type === 'booking_lr' || r.type === 'non_booking_lr'
          );
          const truckProfits = {};
          bookings.forEach(booking => {
            const truck = booking.truckNumber;
            if (!truck) return;
            if (!truckProfits[truck]) {
              const truckMaster = allRecords.find(r => r.type === 'truck_master' && r.truckNumber === truck);
              truckProfits[truck] = {
                owner: truckMaster?.truckOwner || 'Unknown',
                trips: 0, 
                revenue: 0,  // Total LR Amount
                truckCost: 0,  // Total Truck Amount
                commission: 0, 
                deductions: 0,
                companyPartyName: '',  // Company/Party name
                latestDate: booking.date || new Date().toLocaleDateString('en-GB'),
                truckRate: 0,  // Rate per tonne from Challan
                companyRate: 0  // Rate per tonne from LR
              };
            }
            truckProfits[truck].trips++;
            
            // Find Challan Book entry
            const challanEntry = allRecords.find(ch => 
              ch.type === 'challan_book' && 
              ch.truckNumber === truck
            );
            
            // Find LR entry
            const lrEntry = allRecords.find(lr => 
              (lr.type === 'booking_lr' || lr.type === 'non_booking_lr') &&
              lr.truckNumber === truck
            );
            
            // Get data from Challan
            if (challanEntry) {
              const rate = parseFloat(challanEntry.ratePerTonne) || 0;
              const total = parseFloat(challanEntry.totalTruckAmount) || 0;
              if (rate > 0) truckProfits[truck].truckRate = rate;
              if (total > 0) truckProfits[truck].truckCost = total;
              // Get company name from challan
              if (challanEntry.companyName) {
                truckProfits[truck].companyPartyName = challanEntry.companyName;
              } else if (challanEntry.partyName) {
                truckProfits[truck].companyPartyName = challanEntry.partyName;
              }
            }
            
            // Get data from LR - DIRECTLY fetch Total Amount only
            if (lrEntry) {
              // Get Total Amount directly from LR (no calculation)
              const total = parseFloat(lrEntry.totalAmount) || 0;
              if (total > 0) truckProfits[truck].revenue = total;
              
              // Get company name from LR if not already set
              if (!truckProfits[truck].companyPartyName) {
                if (lrEntry.companyName) {
                  truckProfits[truck].companyPartyName = lrEntry.companyName;
                } else if (lrEntry.partyName) {
                  truckProfits[truck].companyPartyName = lrEntry.partyName;
                } else if (lrEntry.consignor) {
                  truckProfits[truck].companyPartyName = lrEntry.consignor;
                }
              }
            }
            
            // Fallback to daily register if no challan/LR (use values as-is, no calculation)
            if (!challanEntry && !lrEntry) {
              truckProfits[truck].truckCost += parseFloat(booking.truckRate) || 0;
              truckProfits[truck].revenue += parseFloat(booking.companyRate) || 0;
              
              // Get company name from daily register
              if (!truckProfits[truck].companyPartyName) {
                if (booking.companyName) {
                  truckProfits[truck].companyPartyName = booking.companyName;
                } else if (booking.partyName) {
                  truckProfits[truck].companyPartyName = booking.partyName;
                }
              }
            }
            
            truckProfits[truck].commission += parseFloat(booking.commission) || 0;
            truckProfits[truck].deductions += (parseFloat(booking.haltingCharges) || 0) + (parseFloat(booking.hammaliCharges) || 0);
            if (booking.type === 'booking_lr' || booking.type === 'non_booking_lr') {
              const relatedDeductions = allRecords.filter(r => 
                r.type === 'deduction_entry' && r.relatedLRId === booking.__backendId
              );
              truckProfits[truck].deductions += relatedDeductions.reduce((sum, d) => 
                sum + (d.damageCharges || 0) + (d.otherDeductions || 0), 0
              );
            }
          });
          let serialNo = 1;
          rows = Object.entries(truckProfits).map(([truck, data]) => {
            const profitLoss = data.revenue - data.truckCost;
            const companyName = data.companyPartyName || 'N/A';
            return [serialNo++, truck, data.latestDate || '', companyName, data.truckCost, data.revenue, profitLoss];
          });
          filename = 'profit-loss';
          break;

        case 'ledger':
          const tbody = document.getElementById('ledgerTransactionsList');
          const ledgerRows = tbody.querySelectorAll('tr');
          headers = ['Date', 'Description', 'LR/Ref No.', 'Truck No.', 'Debit', 'Credit', 'Balance'];
          rows = Array.from(ledgerRows).map(row => {
            const cells = row.querySelectorAll('td');
            return Array.from(cells).map(cell => cell.textContent.trim());
          }).filter(row => row.length > 0 && !row[0].includes('No transactions'));
          filename = 'ledger-transactions';
          break;

        case 'gst':
          headers = ['Bill No.', 'Bill Date', 'LR No.', 'Company', 'GST No.', 'Taxable Amount', 'GST Amount', 'Total Amount'];
          rows = allRecords.filter(r => (r.type === 'booking_lr' || r.type === 'non_booking_lr') && r.gstApplicable && r.billNumber).map(r => {
            const total = (r.billAmount || 0) + (r.gstAmount || 0);
            return [
              r.billNumber || '', r.billDate || '', r.lrNumber || '', r.companyName || '',
              r.companyGST || '', r.billAmount || 0, r.gstAmount || 0, total
            ];
          });
          filename = 'gst-bills';
          break;

        case 'payments':
        case 'payment_transactions':
          headers = ['Date', 'Payment Type', 'Amount', 'Mode', 'Reference', 'Truck No.', 'Company/Party', 'Paid By/Received From', 'Notes', 'Ledger Status'];
          rows = allRecords.filter(r => r.type === 'payment_transaction').map(r => [
            r.paymentDate || '', r.paymentType || '', r.paymentAmount || 0, r.paymentMode || '',
            r.paymentReference || '', r.truckNumber || '', r.companyName || r.partyName || '',
            r.paidByReceived || '', r.paymentNotes || '', r.ledgerStatus || 'Pending'
          ]);
          filename = 'payment-transactions';
          break;
      }

      if (rows.length === 0) {
        showInlineMessage('No data to export', 'error');
        return;
      }

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showInlineMessage('CSV exported successfully!', 'success');
    }

    function printTable(type) {
      let title = '';
      let tableId = '';

      switch(type) {
        case 'daily_register': title = 'Daily Register Entries'; tableId = 'dailyRegisterList'; break;
        case 'booking_lr': title = 'Booking LRs'; tableId = 'lrList'; break;
        case 'non_booking_lr': title = 'Non-Booking LRs'; tableId = 'nonBookingLRList'; break;
        case 'challan_book': title = 'Challan Book'; tableId = 'challanBookList'; break;
        case 'lr_received': title = 'Received LRs'; tableId = 'receivedLRList'; break;
        case 'deduction_entry': title = 'Deduction Records'; tableId = 'deductionsList'; break;
        case 'bills': title = 'Bills Created'; tableId = 'billsList'; break;
        case 'profit_loss': title = 'Profit & Loss by Truck'; tableId = 'profitLossByTruck'; break;
        case 'ledger': title = 'Ledger Transactions'; tableId = 'ledgerTransactionsList'; break;
        case 'gst': title = 'GST Bills'; tableId = 'gstList'; break;
        case 'payments':
        case 'payment_transactions': title = 'Payment Transactions'; tableId = 'paymentTransactionsList'; break;
      }

      const tbody = document.getElementById(tableId);
      const table = tbody.closest('table');
      
      if (!table) {
        showInlineMessage('No table found to print', 'error');
        return;
      }

      const companyTitle = window.elementSdk?.config?.company_title || defaultConfig.company_title;
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #667eea; margin-bottom: 10px; }
            h2 { text-align: center; color: #333; margin-bottom: 20px; font-size: 18px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #667eea; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .print-date { text-align: right; color: #666; margin-bottom: 10px; font-size: 12px; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${companyTitle}</h1>
          <h2>${title}</h2>
          <div class="print-date">Printed on: ${new Date().toLocaleString()}</div>
          ${table.outerHTML}
        </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    }

    function calculateProfit(record) {
      // Check if this is a 'to be billed' entry (daily_register without bill)
      const isToBeBilled = record.type === 'daily_register' && !record.billNumber;
      
      if (isToBeBilled) {
        // For 'to be billed' entries: Use NEW CORRECT FORMULA
        const lrAmount = record.companyRate || 0;
        
        // Get challan entry for this record
        const challanEntry = allRecords.find(r => 
          r.type === 'challan_book' && 
          r.truckNumber === record.truckNumber && 
          r.date === record.date &&
          r.from === record.from &&
          r.to === record.to
        );
        
        if (challanEntry) {
          // Use the challan's remaining balance
          const challanRemainingBalance = challanEntry.remainingBalance || 0;
          const commission = record.commission || 0;
          const commissionDeductedInChallan = challanEntry.commissionDeductedInChallan || false;
          
          if (commissionDeductedInChallan) {
            // P&L = LR Amount - Challan Remaining Balance (commission already in challan)
            return lrAmount - challanRemainingBalance;
          } else {
            // P&L = (LR Amount + Commission) - Challan Remaining Balance
            return (lrAmount + commission) - challanRemainingBalance;
          }
        } else {
          // No challan found - use truck rate as fallback
          const truckRate = record.truckRate || 0;
          const commission = record.commission || 0;
          return lrAmount + commission - truckRate;
        }
      } else {
        // For billed entries: use existing logic
        const revenue = (record.companyRate || 0) + (record.freightAmount || 0) + (record.companyHaltingCharges || 0);
        const expenses = (record.truckRate || 0) + (record.commission || 0);
        
        let deductions = (record.haltingCharges || 0) + (record.hammaliCharges || 0);
        
        if (record.type === 'booking_lr' || record.type === 'non_booking_lr') {
          const relatedDeductions = allRecords.filter(r => 
            r.type === 'deduction_entry' && r.relatedLRId === record.__backendId
          );
          deductions += relatedDeductions.reduce((sum, d) => 
            sum + (d.damageCharges || 0) + (d.otherDeductions || 0), 0
          );
        }
        
        return revenue - expenses - deductions;
      }
    }

    function openLedgerPayment(action = 'make') {
      const type = document.getElementById('ledgerType').value;
      const account = document.getElementById('ledgerAccount').value;

      if (!type || !account) {
        showInlineMessage('Please select ledger type and account first', 'error');
        return;
      }

      // Update modal title based on action
      const modalTitle = document.getElementById('ledgerPaymentModalTitle');
      const paymentAccountName = document.getElementById('paymentAccountName');
      
      if (action === 'receive') {
        modalTitle.textContent = 'Receive Payment - ';
        // Only allow receive payment for company and party ledgers
        if (type === 'truck' || type === 'staff') {
          showInlineMessage('Receive Payment is only available for Company and Party ledgers', 'error');
          return;
        }
      } else {
        modalTitle.textContent = 'Make Payment - ';
        // Only allow make payment for truck and staff ledgers
        if (type === 'company' || type === 'party') {
          showInlineMessage('Make Payment is only available for Truck and Staff ledgers', 'error');
          return;
        }
      }
      
      paymentAccountName.textContent = account;
      document.getElementById('paymentLedgerType').value = type;
      document.getElementById('paymentLedgerAccount').value = account;
      document.getElementById('paymentLedgerAction').value = action;
      document.getElementById('ledgerPaymentForm').reset();
      document.getElementById('ledgerPaymentModal').classList.remove('hidden');
      document.getElementById('ledgerPaymentModal').classList.add('flex');
    }

    async function handleLedgerPaymentSubmit(e) {
      e.preventDefault();
      const formData = new FormData(e.target);
      
      const ledgerType = formData.get('ledgerType');
      const ledgerAccount = formData.get('ledgerAccount');
      const paymentAction = formData.get('paymentAction');
      const paymentAmount = parseFloat(formData.get('paymentAmount')) || 0;
      const paymentTypeFromForm = formData.get('paymentType');
      
      // Determine the correct payment type based on ledger type and action
      let paymentType = '';
      let companyName = '';
      let partyName = '';
      let truckNumber = '';
      
      if (paymentAction === 'receive') {
        // Receiving payment from company or party
        if (ledgerType === 'company') {
          companyName = ledgerAccount;
          paymentType = paymentTypeFromForm === 'Advance' ? 'Advance from Company' : 'Balance from Company';
        } else if (ledgerType === 'party') {
          partyName = ledgerAccount;
          paymentType = paymentTypeFromForm === 'Advance' ? 'Advance from Party' : 'Balance from Party';
        }
      } else {
        // Making payment to truck owner or staff
        if (ledgerType === 'truck') {
          truckNumber = ledgerAccount.split(' - ')[0]; // Extract truck number from "GJ01AB1234 - Owner Name"
          paymentType = paymentTypeFromForm === 'Advance' ? 'Advance to Owner' : 'Balance to Owner';
        } else if (ledgerType === 'staff') {
          // For staff, we'll use the existing staff salary payment system
          const staffName = ledgerAccount;
          const staffData = {
            type: 'salary_payment',
            staffName: staffName,
            staffSalary: paymentAmount,
            paymentDate: formData.get('paymentDate'),
            paymentMethod: formData.get('paymentMethod'),
            paymentNotes: formData.get('paymentNotes'),
            createdAt: new Date().toISOString()
          };
          
          const result = await window.dataSdk.create(staffData);
          if (result.isOk) {
            document.getElementById('ledgerPaymentModal').classList.add('hidden');
            document.getElementById('ledgerPaymentModal').classList.remove('flex');
            e.target.reset();
            showInlineMessage('Staff payment recorded successfully!', 'success');
            viewLedger();
          }
          return;
        }
      }
      
      // Create payment_transaction record
      const data = {
        type: 'payment_transaction',
        paymentType: paymentType,
        paymentAmount: paymentAmount,
        paymentDate: formData.get('paymentDate'),
        paymentMode: formData.get('paymentMethod'),
        paymentReference: formData.get('paymentNotes') || '',
        paymentNotes: formData.get('paymentNotes') || '',
        
        // Set the appropriate linking field
        companyName: companyName,
        partyName: partyName,
        truckNumber: truckNumber,
        
        // Additional metadata
        ledgerType: ledgerType,
        ledgerAccount: ledgerAccount,
        recordedBy: localStorage.getItem('sgfc_user') || 'Admin',
        createdAt: new Date().toISOString()
      };

      const result = await window.dataSdk.create(data);
      if (result.isOk) {
        document.getElementById('ledgerPaymentModal').classList.add('hidden');
        document.getElementById('ledgerPaymentModal').classList.remove('flex');
        e.target.reset();
        showInlineMessage(`Payment ${paymentAction === 'receive' ? 'received' : 'made'} successfully!`, 'success');
        viewLedger(); // Refresh the ledger to show the new transaction
      } else {
        showInlineMessage('Failed to record payment. Please try again.', 'error');
      }
    }

    function handleLedgerTypeChange(e) {
      const type = e.target.value;
      const accountSelect = document.getElementById('ledgerAccount');
      
      if (!type) {
        accountSelect.innerHTML = '<option value="">-- Select Account --</option>';
        return;
      }

      let accounts = [];
      if (type === 'company') {
        accounts = [...new Set(allRecords.filter(r => r.companyName).map(r => r.companyName))];
      } else if (type === 'party') {
        accounts = [...new Set(allRecords.filter(r => r.partyName).map(r => r.partyName))];
      } else if (type === 'truck') {
        const trucks = allRecords.filter(r => r.type === 'truck_master');
        accounts = trucks.map(t => `${t.truckNumber} - ${t.truckOwner}`);
      } else if (type === 'staff') {
        const staff = allRecords.filter(r => r.type === 'staff_master');
        accounts = staff.map(s => s.staffName);
      }

      accountSelect.innerHTML = '<option value="">-- Select Account --</option>' + 
        accounts.map(a => `<option value="${a}">${a}</option>`).join('');
    }

    function viewLedger() {
      const type = document.getElementById('ledgerType').value;
      const account = document.getElementById('ledgerAccount').value;

      if (!type || !account) {
        showInlineMessage('Please select ledger type and account', 'error');
        return;
      }

      let transactions = [];
      let accountName = account;
      let totalReceivable = 0;
      let totalPayable = 0;

      if (type === 'company') {
        // FIXED: Company Ledger - Shows LRs as receivables AND payment transactions as receipts
        const bookingLRs = allRecords.filter(r => r.type === 'booking_lr' && r.companyName === account);
        
        // Add LRs as receivables (debit)
        transactions = bookingLRs.map(lr => {
          const debit = lr.companyRate || 0;
          totalReceivable += debit;
          
          return {
            date: lr.lrDate || lr.date,
            description: `Booking LR - ${lr.from} to ${lr.to}`,
            refNo: lr.lrNumber,
            truckNo: lr.truckNumber,
            debit: debit,
            credit: 0
          };
        });
        
        // FIXED: Add payment transactions from companies as receipts (credit)
        const companyPayments = allRecords.filter(r => 
          r.type === 'payment_transaction' && 
          r.companyName === account &&
          (r.paymentType === 'Advance from Company' || r.paymentType === 'Balance from Company')
        );
        
        companyPayments.forEach(payment => {
          const credit = payment.paymentAmount || 0;
          totalPayable += credit;
          
          transactions.push({
            date: payment.paymentDate,
            description: `Payment Received - ${payment.paymentMode}${payment.tdsAmount ? ' (TDS: ₹' + payment.tdsAmount.toLocaleString() + ')' : ''}`,
            refNo: payment.paymentReference || 'Payment',
            truckNo: payment.truckNumber || '-',
            debit: 0,
            credit: credit
          });
        });
        
      } else if (type === 'party') {
        // FIXED: Party ledger - Shows bills as receivables AND payment transactions as receipts
        const nonBookingLRs = allRecords.filter(r => r.type === 'non_booking_lr' && r.partyName === account);
        const bookingLRs = allRecords.filter(r => r.type === 'booking_lr' && r.partyName === account);
        
        // Add bills as receivables (debit)
        transactions = [...nonBookingLRs.filter(lr => lr.billNumber).map(lr => {
          const debit = (lr.billAmount || 0) + (lr.gstAmount || 0);
          totalReceivable += debit;
          
          return {
            date: lr.billDate || lr.lrDate || lr.date,
            description: `Bill ${lr.billNumber} - ${lr.from} to ${lr.to}`,
            refNo: lr.billNumber,
            truckNo: lr.truckNumber,
            debit: debit,
            credit: 0
          };
        }), ...bookingLRs.filter(lr => lr.billNumber).map(lr => {
          const debit = (lr.billAmount || 0) + (lr.gstAmount || 0);
          totalReceivable += debit;
          
          return {
            date: lr.billDate || lr.lrDate || lr.date,
            description: `Bill ${lr.billNumber} - ${lr.from} to ${lr.to}`,
            refNo: lr.billNumber,
            truckNo: lr.truckNumber,
            debit: debit,
            credit: 0
          };
        })];
        
        // FIXED: Add payment transactions from parties as receipts (credit)
        const partyPayments = allRecords.filter(r => 
          r.type === 'payment_transaction' && 
          r.partyName === account
        );
        
        partyPayments.forEach(payment => {
          const credit = payment.paymentAmount || 0;
          totalPayable += credit;
          
          transactions.push({
            date: payment.paymentDate,
            description: `Payment Received - ${payment.paymentMode}${payment.tdsAmount ? ' (TDS: ₹' + payment.tdsAmount.toLocaleString() + ')' : ''}`,
            refNo: payment.paymentReference || 'Payment',
            truckNo: payment.truckNumber || '-',
            debit: 0,
            credit: credit
          });
        });
        
      } else if (type === 'truck') {
        // FIXED: Truck ledger - Shows challan amounts as payables AND all payments as debits
        const truckNumber = account.split(' - ')[0];
        const challanEntries = allRecords.filter(r => r.type === 'challan_book' && r.truckNumber === truckNumber);
        
        // Add challans as payables (credit = what we owe)
        transactions = challanEntries.map(ch => {
          const credit = ch.truckRate || 0;
          const advanceInChallan = ch.advancePaidToOwner || 0;
          totalPayable += credit;
          
          // If advance was paid during challan creation, show it as a debit transaction
          if (advanceInChallan > 0) {
            totalReceivable += advanceInChallan;
          }
          
          return {
            date: ch.date,
            description: `Challan - ${ch.from} to ${ch.to}${advanceInChallan > 0 ? ' (Advance: ₹' + advanceInChallan.toLocaleString() + ')' : ''}`,
            refNo: ch.challanNumber || 'Challan',
            truckNo: ch.truckNumber,
            debit: advanceInChallan, // Show advance paid as debit
            credit: credit // Show total owed as credit
          };
        });
        
        // FIXED: Add payment transactions to truck owner (debit = what we paid)
        const ownerPayments = allRecords.filter(r => 
          r.type === 'payment_transaction' && 
          r.truckNumber === truckNumber &&
          (r.paymentType === 'Advance to Owner' || r.paymentType === 'Balance to Owner')
        );
        
        ownerPayments.forEach(payment => {
          const debit = payment.paymentAmount || 0;
          totalReceivable += debit;
          
          transactions.push({
            date: payment.paymentDate,
            description: `Payment to Owner - ${payment.paymentMode}${payment.tdsAmount ? ' (TDS Deducted: ₹' + payment.tdsAmount.toLocaleString() + ')' : ''}`,
            refNo: payment.paymentReference || 'Payment',
            truckNo: payment.truckNumber,
            debit: debit,
            credit: 0
          });
        });
        
      } else if (type === 'staff') {
        // Staff ledger - commissions taken as loans and salary payments (ALREADY WORKING)
        const commissionEntries = allRecords.filter(r => 
          r.type === 'daily_register' && 
          r.commissionApplicable && 
          r.commissionTakenBy === account &&
          r.commissionTakenBy !== 'South Gujrat Freight Carrier'
        );
        
        const salaryPayments = allRecords.filter(r => 
          r.type === 'salary_payment' && 
          r.staffName === account
        );
        
        // Commission taken by staff = LOAN/ADVANCE (debit) - staff owes this to company
        transactions = [...commissionEntries.map(entry => {
          const debit = entry.commission || 0;
          totalReceivable += debit;
          
          return {
            date: entry.date,
            description: `Commission Loan - ${entry.from} to ${entry.to} (${entry.truckNumber})`,
            refNo: entry.truckNumber,
            truckNo: entry.truckNumber,
            debit: debit,
            credit: 0
          };
        }), ...salaryPayments.map(payment => {
          const credit = payment.staffSalary || 0;
          totalPayable += credit;
          
          return {
            date: payment.paymentDate || payment.createdAt?.split('T')[0],
            description: 'Salary Payment',
            refNo: 'Salary',
            truckNo: '-',
            debit: 0,
            credit: credit
          };
        })];
      }

      // Sort all transactions by date
      transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate running balance
      let runningBalance = 0;
      const transactionsWithBalance = transactions.map(t => {
        runningBalance += t.debit - t.credit;
        return { ...t, balance: runningBalance };
      });

      // Update UI elements
      const ledgerAccountName = document.getElementById('ledgerAccountName');
      if (ledgerAccountName) {
        ledgerAccountName.textContent = accountName;
      }
      
      const ledgerReceivable = document.getElementById('ledgerReceivable');
      if (ledgerReceivable) {
        ledgerReceivable.textContent = `₹${totalReceivable.toLocaleString()}`;
      }
      
      const ledgerPayable = document.getElementById('ledgerPayable');
      if (ledgerPayable) {
        ledgerPayable.textContent = `₹${totalPayable.toLocaleString()}`;
      }
      
      const ledgerTransactions = document.getElementById('ledgerTransactions');
      if (ledgerTransactions) {
        ledgerTransactions.textContent = transactionsWithBalance.length;
      }
      
      const ledgerBalance = document.getElementById('ledgerBalance');
      if (ledgerBalance) {
        ledgerBalance.textContent = `₹${(totalReceivable - totalPayable).toLocaleString()}`;
      }

      // Render transactions table
      const tbody = document.getElementById('ledgerTransactionsList');
      if (!tbody) return;
      
      if (transactionsWithBalance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-gray-500">No transactions</td></tr>';
      } else {
        tbody.innerHTML = transactionsWithBalance.map(t => `
          <tr>
            <td>${t.date || 'N/A'}</td>
            <td>${t.description}</td>
            <td>${t.refNo}</td>
            <td>${t.truckNo}</td>
            <td>${t.debit > 0 ? '₹' + t.debit.toLocaleString() : '-'}</td>
            <td>${t.credit > 0 ? '₹' + t.credit.toLocaleString() : '-'}</td>
            <td class="${t.balance >= 0 ? 'profit-positive' : 'profit-negative'}">₹${t.balance.toLocaleString()}</td>
          </tr>
        `).join('');
      }

      document.getElementById('ledgerSummaryCard').classList.remove('hidden');
      document.getElementById('ledgerDetailsCard').classList.remove('hidden');
    }

    // Pagination state management
    const paginationState = {
      dailyRegister: { currentPage: 1, itemsPerPage: 15 },
      lr: { currentPage: 1, itemsPerPage: 15 },
      nonBookingLR: { currentPage: 1, itemsPerPage: 15 },
      challan: { currentPage: 1, itemsPerPage: 15 },
      receivedLR: { currentPage: 1, itemsPerPage: 15 },
      bills: { currentPage: 1, itemsPerPage: 15 },
      gst: { currentPage: 1, itemsPerPage: 15 },
      profitLoss: { currentPage: 1, itemsPerPage: 15 },
      reports: { currentPage: 1, itemsPerPage: 15 },
      paymentTransactions: { currentPage: 1, itemsPerPage: 15 },
      truckMaster: { currentPage: 1, itemsPerPage: 15 },
      companyMaster: { currentPage: 1, itemsPerPage: 15 },
      partyMaster: { currentPage: 1, itemsPerPage: 15 },
      staffMaster: { currentPage: 1, itemsPerPage: 15 }
    };

    // Pagination helper function
    function createPaginationControls(listName, totalItems, containerId) {
      const state = paginationState[listName];
      const totalPages = Math.ceil(totalItems / state.itemsPerPage);
      
      if (totalPages <= 1) {
        return ''; // No pagination needed
      }
      
      let paginationHTML = `
        <div class="flex items-center justify-between mt-4 pt-4 border-t">
          <div class="text-sm text-gray-600">
            Showing ${(state.currentPage - 1) * state.itemsPerPage + 1} to ${Math.min(state.currentPage * state.itemsPerPage, totalItems)} of ${totalItems} entries
          </div>
          <div class="flex gap-2">
            <button 
              onclick="changePage('${listName}', ${state.currentPage - 1})" 
              ${state.currentPage === 1 ? 'disabled' : ''}
              class="px-3 py-1 rounded ${state.currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}">
              Previous
            </button>
            <div class="flex gap-1">`;
      
      // Show page numbers
      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= state.currentPage - 1 && i <= state.currentPage + 1)) {
          paginationHTML += `
            <button 
              onclick="changePage('${listName}', ${i})" 
              class="px-3 py-1 rounded ${i === state.currentPage ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}">
              ${i}
            </button>`;
        } else if (i === state.currentPage - 2 || i === state.currentPage + 2) {
          paginationHTML += `<span class="px-2 py-1">...</span>`;
        }
      }
      
      paginationHTML += `
            </div>
            <button 
              onclick="changePage('${listName}', ${state.currentPage + 1})" 
              ${state.currentPage === totalPages ? 'disabled' : ''}
              class="px-3 py-1 rounded ${state.currentPage === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}">
              Next
            </button>
          </div>
        </div>
      `;
      
      return paginationHTML;
    }

    // Change page function
    function changePage(listName, newPage) {
      const state = paginationState[listName];
      state.currentPage = newPage;
      
      // Call the appropriate update function
      switch(listName) {
        case 'dailyRegister': updateDailyRegisterList(); break;
        case 'lr': updateLRList(); break;
        case 'nonBookingLR': updateNonBookingLRList(); break;
        case 'challan': updateChallanBookList(); break;
        case 'receivedLR': updateReceivedLRList(); break;
        case 'bills': updateBillsList(); break;
        case 'gst': updateGSTList(); break;
        case 'profitLoss': calculateProfitLoss(); break;
        case 'reports': updateReportsUI(); break;
        case 'paymentTransactions': updatePaymentTransactionsList(); break;
        case 'truckMaster': updateMasterLists(); break;
        case 'companyMaster': updateMasterLists(); break;
        case 'partyMaster': updateMasterLists(); break;
        case 'staffMaster': updateMasterLists(); break;
      }
    }

    // Get paginated data
    function getPaginatedData(data, listName) {
      const state = paginationState[listName];
      const startIndex = (state.currentPage - 1) * state.itemsPerPage;
      const endIndex = startIndex + state.itemsPerPage;
      return data.slice(startIndex, endIndex);
    }

    function updateUI() {
      updateDashboard();
      updateDailyRegisterList();
      updateLRList();
      updateNonBookingLRList();
      updateChallanBookList();
      updateReceivedLRList();
      updateBillsList();
      updateGSTList();
      updateMasterLists();
      updateReportsUI();
      updateDeductionsUI();
      calculateProfitLoss();
      updatePaymentTrackingUI();
      populatePLFilters();
      populateBilledLRSelect();
      populateReportFilters();
      
      const recordCount = document.getElementById('recordCount');
      if (recordCount) {
        recordCount.textContent = `${allRecords.length} Records`;
      }
    }

    function updateDashboard() {
      // Only count daily_register entries for total bookings (to avoid duplicates with LRs)
      const bookings = allRecords.filter(r => r.type === 'daily_register');
      
      const pendingPayments = bookings.reduce((sum, r) => {
        const totalDue = (r.companyRate || 0) - (r.advanceFromCompany || 0) - (r.balanceFromCompany || 0);
        return sum + Math.max(0, totalDue);
      }, 0);

      const totalBookingsElem = document.getElementById('totalBookings');
      if (totalBookingsElem) {
        totalBookingsElem.textContent = bookings.length;
      }
      
      const pendingPaymentsElem = document.getElementById('pendingPayments');
      if (pendingPaymentsElem) {
        pendingPaymentsElem.textContent = `₹${pendingPayments.toLocaleString()}`;
      }

      // Generate alerts
      generateAlerts();

      const recentBookings = bookings.slice(-5).reverse();
      const recentContainer = document.getElementById('recentBookings');
      if (recentContainer) {
        if (recentBookings.length === 0) {
          recentContainer.innerHTML = '<p class="text-gray-500 text-sm">No bookings yet</p>';
        } else {
          recentContainer.innerHTML = recentBookings.map(b => `
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <div class="font-medium">${b.truckNumber || 'N/A'}</div>
                <div class="text-sm text-gray-600">${b.companyName || b.partyName || 'N/A'}</div>
              </div>
              <span class="status-badge ${getStatusClass(b.status)}">${b.status || 'Pending'}</span>
            </div>
          `).join('');
        }
      }

      const pendingLRs = allRecords.filter(r => (r.type === 'booking_lr' || r.type === 'non_booking_lr') && !r.lrReceived);
      const pendingContainer = document.getElementById('pendingLRs');
      if (pendingContainer) {
        if (pendingLRs.length === 0) {
          pendingContainer.innerHTML = '<p class="text-gray-500 text-sm">No pending LRs</p>';
        } else {
          pendingContainer.innerHTML = pendingLRs.slice(0, 5).map(lr => `
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <div class="font-medium">${lr.lrNumber || 'N/A'}</div>
                <div class="text-sm text-gray-600">${lr.truckNumber || 'N/A'}</div>
              </div>
              <span class="text-sm text-gray-600">${lr.lrDate || 'N/A'}</span>
            </div>
          `).join('');
        }
      }
    }

    function generateAlerts() {
      const alertSection = document.getElementById('alertSection');
      const alerts = [];
      const today = new Date();
      
      // Helper function to calculate days difference
      function daysDiff(dateStr) {
        if (!dateStr) return 999;
        const date = new Date(dateStr);
        const diff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
        return diff;
      }

      // Alert 1: Daily register entry without advance within 3 days for To Be Billed LRs
      const dailyEntries = allRecords.filter(r => r.type === 'daily_register');
      dailyEntries.forEach(entry => {
        const days = daysDiff(entry.date);
        if (days >= 3) {
          // Check if this entry has "To Be Billed" payment category
          const isToBeBilled = entry.paymentCategory === 'To Be Billed';
          if (isToBeBilled) {
            // Check if advance has been provided - look in both entry fields AND payment_transaction records
            const hasAdvanceInEntry = (entry.advanceFromCompany && entry.advanceFromCompany > 0) || 
                                      (entry.advanceFromParty && entry.advanceFromParty > 0);
            
            // Check if advance exists in payment_transaction records linked to this entry
            const advancePayments = allRecords.filter(r => 
              r.type === 'payment_transaction' && 
              r.entryId === entry.__backendId &&
              (r.paymentType === 'Advance from Company' || r.paymentType === 'Advance from Party')
            );
            const hasAdvanceInPayments = advancePayments.length > 0 && 
                                        advancePayments.reduce((sum, p) => sum + (p.paymentAmount || 0), 0) > 0;
            
            const hasAdvance = hasAdvanceInEntry || hasAdvanceInPayments;
            
            if (!hasAdvance) {
              alerts.push({
                type: 'critical',
                title: '⚠️ Missing Advance Payment',
                message: `Truck ${entry.truckNumber || 'N/A'} (${entry.from || 'N/A'} → ${entry.to || 'N/A'}) from ${entry.date || 'N/A'} has no advance recorded for ${days} days. Entry requires advance for To Be Billed LRs.`
              });
            }
          }
        }
      });

      // Alert 2: Daily register entry without LR created within 3 days
      dailyEntries.forEach(entry => {
        const days = daysDiff(entry.date);
        if (days >= 3) {
          // Check if entry status shows LR has been created
          const statusShowsLRCreated = entry.status && (
            entry.status === 'LR Created' || 
            entry.status === 'Challan Created' ||
            entry.status === 'Completed'
          );
          
          // Also check if LR exists for this daily entry
          const hasLR = allRecords.some(r => 
            (r.type === 'booking_lr' || r.type === 'non_booking_lr' || r.type === 'challan_book') && 
            r.dailyEntryId === entry.__backendId
          );
          
          // Only show alert if neither condition is met
          if (!hasLR && !statusShowsLRCreated) {
            alerts.push({
              type: 'warning',
              title: '📋 LR Not Created',
              message: `Truck ${entry.truckNumber || 'N/A'} (${entry.from || 'N/A'} → ${entry.to || 'N/A'}) from ${entry.date || 'N/A'} has no LR created for ${days} days.`
            });
          }
        }
      });

      // Alert 3: LR created but not received within 15 days (ONLY for "To Be Billed" LRs)
      const lrs = allRecords.filter(r => r.type === 'booking_lr' || r.type === 'non_booking_lr');
      lrs.forEach(lr => {
        // Skip "To Pay" LRs as they don't need to be received
        if (lr.lrType === 'To Pay') return;
        
        const days = daysDiff(lr.lrDate);
        if (days >= 15) {
          // Check if LR has been marked as received (using lrReceived field)
          if (!lr.lrReceived) {
            alerts.push({
              type: 'warning',
              title: '📬 LR Not Received',
              message: `LR ${lr.lrNumber || 'N/A'} for Truck ${lr.truckNumber || 'N/A'} from ${lr.lrDate || 'N/A'} has not been received for ${days} days.`
            });
          }
        }
      });

      // Alert 4: LR billed but no payment updated within 7 days (ONLY for "To Be Billed" LRs)
      const billedLRs = allRecords.filter(r => 
        (r.type === 'booking_lr' || r.type === 'non_booking_lr') && 
        r.billNumber && 
        r.billDate
      );
      billedLRs.forEach(lr => {
        // Skip "To Pay" LRs as they don't need payment tracking
        if (lr.lrType === 'To Pay') return;
        
        const days = daysDiff(lr.billDate);
        if (days >= 7) {
          // Check if payment has been updated - look in both LR fields AND payment_transaction records
          const hasPaymentInLR = (lr.balanceFromCompany && lr.balanceFromCompany > 0) || 
                                 (lr.balanceFromParty && lr.balanceFromParty > 0) ||
                                 lr.paymentStatus === 'Paid' ||
                                 lr.paymentStatus === 'Partial';
          
          // Check if payment exists in payment_transaction records linked to this LR
          const paymentRecords = allRecords.filter(r => 
            r.type === 'payment_transaction' && 
            r.entryId === lr.__backendId &&
            (r.paymentType === 'Balance from Company' || 
             r.paymentType === 'Balance from Party' ||
             r.paymentType === 'Advance from Company' ||
             r.paymentType === 'Advance from Party')
          );
          const hasPaymentInTransactions = paymentRecords.length > 0 && 
                                          paymentRecords.reduce((sum, p) => sum + (p.paymentAmount || 0), 0) > 0;
          
          const hasPayment = hasPaymentInLR || hasPaymentInTransactions;
          
          if (!hasPayment) {
            alerts.push({
              type: 'critical',
              title: '💰 Payment Not Updated',
              message: `Bill for LR ${lr.lrNumber || 'N/A'} sent on ${lr.billDate || 'N/A'} has no payment update for ${days} days.`
            });
          }
        }
      });

      // Alert 5: LR received but billing not done within 2 days (ONLY for "To Be Billed" LRs)
      const receivedLRs = allRecords.filter(r => 
        (r.type === 'booking_lr' || r.type === 'non_booking_lr') && 
        r.lrReceived === true &&
        r.lrReceivedDate
      );
      receivedLRs.forEach(lr => {
        // Skip "To Pay" LRs as they don't need billing
        if (lr.lrType === 'To Pay') return;
        
        const days = daysDiff(lr.lrReceivedDate);
        if (days >= 2) {
          // Check if billing has been done for this LR (has billNumber)
          if (!lr.billNumber) {
            alerts.push({
              type: 'warning',
              title: '⏰ Billing Pending',
              message: `LR ${lr.lrNumber || 'N/A'} received on ${lr.lrReceivedDate || 'N/A'} has not been billed for ${days} days. Billing should be completed within 2 days of LR receipt.`
            });
          }
        }
      });

      // Alert 6: Daily register entry without challan created within 3 days
      dailyEntries.forEach(entry => {
        const days = daysDiff(entry.date);
        if (days >= 3) {
          // Check if entry status shows Challan has been created
          const statusShowsChallanCreated = entry.status && (
            entry.status === 'Challan Created' ||
            entry.status === 'Completed'
          );
          
          // Also check if Challan exists for this daily entry
          const hasChallan = allRecords.some(r => 
            r.type === 'challan_book' && 
            r.dailyEntryId === entry.__backendId
          );
          
          // Only show alert if neither condition is met
          if (!hasChallan && !statusShowsChallanCreated) {
            alerts.push({
              type: 'warning',
              title: '📄 Challan Not Created',
              message: `Truck ${entry.truckNumber || 'N/A'} (${entry.from || 'N/A'} → ${entry.to || 'N/A'}) from ${entry.date || 'N/A'} has no challan entry created for ${days} days.`
            });
          }
        }
      });

      // Categorize alerts by type
      const alertCategories = {
        missingAdvance: [],
        lrNotCreated: [],
        lrNotReceived: [],
        paymentNotUpdated: [],
        billingPending: [],
        challanNotCreated: []
      };
      
      // Sort alerts into categories based on title
      alerts.forEach(alert => {
        if (alert.title.includes('Missing Advance Payment')) {
          alertCategories.missingAdvance.push(alert);
        } else if (alert.title.includes('LR Not Created')) {
          alertCategories.lrNotCreated.push(alert);
        } else if (alert.title.includes('LR Not Received')) {
          alertCategories.lrNotReceived.push(alert);
        } else if (alert.title.includes('Payment Not Updated')) {
          alertCategories.paymentNotUpdated.push(alert);
        } else if (alert.title.includes('Billing Pending')) {
          alertCategories.billingPending.push(alert);
        } else if (alert.title.includes('Challan Not Created')) {
          alertCategories.challanNotCreated.push(alert);
        }
      });

      // Display alerts in 6 columns
      if (alerts.length === 0) {
        alertSection.innerHTML = `
          <div class="card p-4 bg-green-50 border border-green-200">
            <div class="flex items-center gap-3">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div class="font-semibold text-green-900">All Clear!</div>
                <div class="text-sm text-green-700">No pending alerts at this time.</div>
              </div>
            </div>
          </div>
        `;
      } else {
        alertSection.innerHTML = `
          <div class="mb-4">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Alerts Dashboard (${alerts.length} Total)
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              
              <!-- Alert 1: Missing Advance Payment -->
              <div class="card p-4 ${alertCategories.missingAdvance.length > 0 ? 'bg-red-50 border-2 border-red-300' : 'bg-gray-50 border border-gray-200'}">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-semibold text-sm ${alertCategories.missingAdvance.length > 0 ? 'text-red-800' : 'text-gray-600'}">
                    ⚠️ Missing Advance
                  </h4>
                  <span class="px-2 py-1 rounded-full text-xs font-bold ${alertCategories.missingAdvance.length > 0 ? 'bg-red-600 text-white' : 'bg-gray-300 text-gray-600'}">
                    ${alertCategories.missingAdvance.length}
                  </span>
                </div>
                <div class="space-y-2 max-h-60 overflow-y-auto">
                  ${alertCategories.missingAdvance.length === 0 ? 
                    '<p class="text-xs text-gray-500">✅ All clear</p>' :
                    alertCategories.missingAdvance.map(alert => `
                      <div class="bg-white p-2 rounded border border-red-200 text-xs">
                        <p class="text-red-800 font-medium">${alert.message}</p>
                      </div>
                    `).join('')
                  }
                </div>
              </div>
              
              <!-- Alert 2: LR Not Created -->
              <div class="card p-4 ${alertCategories.lrNotCreated.length > 0 ? 'bg-orange-50 border-2 border-orange-300' : 'bg-gray-50 border border-gray-200'}">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-semibold text-sm ${alertCategories.lrNotCreated.length > 0 ? 'text-orange-800' : 'text-gray-600'}">
                    📋 LR Not Created
                  </h4>
                  <span class="px-2 py-1 rounded-full text-xs font-bold ${alertCategories.lrNotCreated.length > 0 ? 'bg-orange-600 text-white' : 'bg-gray-300 text-gray-600'}">
                    ${alertCategories.lrNotCreated.length}
                  </span>
                </div>
                <div class="space-y-2 max-h-60 overflow-y-auto">
                  ${alertCategories.lrNotCreated.length === 0 ? 
                    '<p class="text-xs text-gray-500">✅ All clear</p>' :
                    alertCategories.lrNotCreated.map(alert => `
                      <div class="bg-white p-2 rounded border border-orange-200 text-xs">
                        <p class="text-orange-800 font-medium">${alert.message}</p>
                      </div>
                    `).join('')
                  }
                </div>
              </div>
              
              <!-- Alert 3: LR Not Received -->
              <div class="card p-4 ${alertCategories.lrNotReceived.length > 0 ? 'bg-yellow-50 border-2 border-yellow-300' : 'bg-gray-50 border border-gray-200'}">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-semibold text-sm ${alertCategories.lrNotReceived.length > 0 ? 'text-yellow-800' : 'text-gray-600'}">
                    📬 LR Not Received
                  </h4>
                  <span class="px-2 py-1 rounded-full text-xs font-bold ${alertCategories.lrNotReceived.length > 0 ? 'bg-yellow-600 text-white' : 'bg-gray-300 text-gray-600'}">
                    ${alertCategories.lrNotReceived.length}
                  </span>
                </div>
                <div class="space-y-2 max-h-60 overflow-y-auto">
                  ${alertCategories.lrNotReceived.length === 0 ? 
                    '<p class="text-xs text-gray-500">✅ All clear</p>' :
                    alertCategories.lrNotReceived.map(alert => `
                      <div class="bg-white p-2 rounded border border-yellow-200 text-xs">
                        <p class="text-yellow-800 font-medium">${alert.message}</p>
                      </div>
                    `).join('')
                  }
                </div>
              </div>
              
              <!-- Alert 4: Payment Not Updated -->
              <div class="card p-4 ${alertCategories.paymentNotUpdated.length > 0 ? 'bg-red-50 border-2 border-red-300' : 'bg-gray-50 border border-gray-200'}">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-semibold text-sm ${alertCategories.paymentNotUpdated.length > 0 ? 'text-red-800' : 'text-gray-600'}">
                    💰 Payment Pending
                  </h4>
                  <span class="px-2 py-1 rounded-full text-xs font-bold ${alertCategories.paymentNotUpdated.length > 0 ? 'bg-red-600 text-white' : 'bg-gray-300 text-gray-600'}">
                    ${alertCategories.paymentNotUpdated.length}
                  </span>
                </div>
                <div class="space-y-2 max-h-60 overflow-y-auto">
                  ${alertCategories.paymentNotUpdated.length === 0 ? 
                    '<p class="text-xs text-gray-500">✅ All clear</p>' :
                    alertCategories.paymentNotUpdated.map(alert => `
                      <div class="bg-white p-2 rounded border border-red-200 text-xs">
                        <p class="text-red-800 font-medium">${alert.message}</p>
                      </div>
                    `).join('')
                  }
                </div>
              </div>
              
              <!-- Alert 5: Billing Pending -->
              <div class="card p-4 ${alertCategories.billingPending.length > 0 ? 'bg-orange-50 border-2 border-orange-300' : 'bg-gray-50 border border-gray-200'}">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-semibold text-sm ${alertCategories.billingPending.length > 0 ? 'text-orange-800' : 'text-gray-600'}">
                    ⏰ Billing Pending
                  </h4>
                  <span class="px-2 py-1 rounded-full text-xs font-bold ${alertCategories.billingPending.length > 0 ? 'bg-orange-600 text-white' : 'bg-gray-300 text-gray-600'}">
                    ${alertCategories.billingPending.length}
                  </span>
                </div>
                <div class="space-y-2 max-h-60 overflow-y-auto">
                  ${alertCategories.billingPending.length === 0 ? 
                    '<p class="text-xs text-gray-500">✅ All clear</p>' :
                    alertCategories.billingPending.map(alert => `
                      <div class="bg-white p-2 rounded border border-orange-200 text-xs">
                        <p class="text-orange-800 font-medium">${alert.message}</p>
                      </div>
                    `).join('')
                  }
                </div>
              </div>
              
              <!-- Alert 6: Challan Not Created -->
              <div class="card p-4 ${alertCategories.challanNotCreated.length > 0 ? 'bg-yellow-50 border-2 border-yellow-300' : 'bg-gray-50 border border-gray-200'}">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-semibold text-sm ${alertCategories.challanNotCreated.length > 0 ? 'text-yellow-800' : 'text-gray-600'}">
                    📄 Challan Missing
                  </h4>
                  <span class="px-2 py-1 rounded-full text-xs font-bold ${alertCategories.challanNotCreated.length > 0 ? 'bg-yellow-600 text-white' : 'bg-gray-300 text-gray-600'}">
                    ${alertCategories.challanNotCreated.length}
                  </span>
                </div>
                <div class="space-y-2 max-h-60 overflow-y-auto">
                  ${alertCategories.challanNotCreated.length === 0 ? 
                    '<p class="text-xs text-gray-500">✅ All clear</p>' :
                    alertCategories.challanNotCreated.map(alert => `
                      <div class="bg-white p-2 rounded border border-yellow-200 text-xs">
                        <p class="text-yellow-800 font-medium">${alert.message}</p>
                      </div>
                    `).join('')
                  }
                </div>
              </div>
              
            </div>
          </div>
        `;
      }
    }

    function updateDailyRegisterList() {
      const tbody = document.getElementById('dailyRegisterList');
      const entries = allRecords.filter(r => r.type === 'daily_register');
      
      if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="16" class="text-center text-gray-500">No entries yet</td></tr>';
        // Remove pagination if exists
        const paginationDiv = document.getElementById('dailyRegister-pagination');
        if (paginationDiv) paginationDiv.remove();
        return;
      }

      // PAGINATION: Get only current page data
      const paginatedEntries = getPaginatedData(entries, 'dailyRegister');
      const startIndex = (paginationState['dailyRegister'].currentPage - 1) * paginationState['dailyRegister'].itemsPerPage;

      tbody.innerHTML = paginatedEntries.map((entry, index) => {
        const commAmt = entry.commission || 0;
        const commTakenBy = entry.commissionTakenBy || 'N/A';
        const commStatus = entry.commissionStatus || 'N/A';
        
        // Find all LRs linked to this daily entry
        // First try by dailyEntryId (new way), then fallback to matching by truck number and date
        const linkedLRs = allRecords.filter(r => {
          if (r.type !== 'booking_lr' && r.type !== 'non_booking_lr') return false;
          
          // First check if linked by dailyEntryId (for newly created LRs)
          if (r.dailyEntryId === entry.__backendId) return true;
          
          // Fallback: match by truck number and date (for existing LRs)
          // Check if truck numbers match and dates are the same
          if (r.truckNumber && entry.truckNumber && 
              r.truckNumber.toLowerCase() === entry.truckNumber.toLowerCase()) {
            // Also check if the LR date matches the daily register date
            if (r.lrDate && entry.date) {
              // Compare dates (handle potential format differences)
              const lrDate = new Date(r.lrDate).toDateString();
              const entryDate = new Date(entry.date).toDateString();
              if (lrDate === entryDate) return true;
            }
          }
          
          return false;
        });
        
        const lrCount = linkedLRs.length;
        
        // Calculate To Pay and To Be Billed LR counts
        let toPayCount = 0;
        let toBeBilledCount = 0;
        if (linkedLRs.length > 0) {
          linkedLRs.forEach(lr => {
            if (lr.lrType === 'To Pay') {
              toPayCount++;
            } else {
              toBeBilledCount++;
            }
          });
        }
        
        const lrInfo = lrCount > 0 ? 
          `${lrCount} (${toBeBilledCount > 0 ? `<span class="text-blue-600">${toBeBilledCount} TBB</span>` : ''}${toPayCount > 0 && toBeBilledCount > 0 ? ' / ' : ''}${toPayCount > 0 ? `<span class="text-orange-600">${toPayCount} TP</span>` : ''})` : 
          '0';
        
        return `
          <tr>
            <td>${startIndex + index + 1}</td>
            <td>${entry.date || 'N/A'}</td>
            <td>${entry.truckNumber || 'N/A'}</td>
            <td>${entry.truckSize || 'N/A'}</td>
            <td>${entry.companyName || 'N/A'}</td>
            <td>${entry.from || 'N/A'} → ${entry.to || 'N/A'}</td>
            <td>${entry.bookingType || 'N/A'}</td>
            <td>${entry.typeOfBooking || 'N/A'}</td>
            <td>${entry.placedBy || 'N/A'}</td>
            <td>₹${(entry.truckRate || 0).toLocaleString()}</td>
            <td>₹${(entry.companyRate || 0).toLocaleString()}</td>
            <td>₹${commAmt.toLocaleString()}</td>
            <td>${commTakenBy}</td>
            <td>${commStatus}</td>
            <td>${lrInfo}</td>
            <td>
              <div class="flex gap-1">
                <button onclick="viewRecord('${entry.__backendId}')" class="text-blue-600 hover:text-blue-800 text-xs" title="View">👁️</button>
                <button onclick="editDailyRegister('${entry.__backendId}')" class="text-green-600 hover:text-green-800 text-xs" title="Edit">✏️</button>
                <button onclick="selectEntryForLRManagement(allRecords.find(r => r.__backendId === '${entry.__backendId}'))" class="text-purple-600 hover:text-purple-800 text-xs" title="Manage LRs">📋</button>
                <button onclick="printRecord('${entry.__backendId}', 'daily_register')" class="text-gray-600 hover:text-gray-800 text-xs" title="Print">🖨️</button>
                <button onclick="deleteRecord('${entry.__backendId}')" class="text-red-600 hover:text-red-800 text-xs" title="Delete">🗑️</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // PAGINATION: Add controls after the table
      const paginationHTML = createPaginationControls('dailyRegister', entries.length);
      let paginationDiv = document.getElementById('dailyRegister-pagination');
      if (!paginationDiv) {
        paginationDiv = document.createElement('div');
        paginationDiv.id = 'dailyRegister-pagination';
        tbody.parentElement.parentElement.appendChild(paginationDiv);
      }
      paginationDiv.innerHTML = paginationHTML;
    }

    function updateLRList() {
      const tbody = document.getElementById('lrList');
      const lrs = allRecords.filter(r => r.type === 'booking_lr');
      
      if (lrs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="text-center text-gray-500">No booking LRs created yet</td></tr>';
        // Remove pagination if exists
        const paginationDiv = document.getElementById('lr-pagination');
        if (paginationDiv) paginationDiv.remove();
        return;
      }

      // PAGINATION: Get only current page data
      const paginatedLRs = getPaginatedData(lrs, 'lr');
      const startIndex = (paginationState['lr'].currentPage - 1) * paginationState['lr'].itemsPerPage;

      tbody.innerHTML = paginatedLRs.map((lr, index) => `
        <tr>
          <td>${startIndex + index + 1}</td>
          <td>
            ${lr.lrNumber || 'N/A'}
            ${lr.lrType === 'To Pay' ? 
              '<br><span class="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full font-semibold">TO PAY</span>' : 
              '<br><span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-semibold">TO BE BILLED</span>'
            }
          </td>
          <td>${lr.lrDate || 'N/A'}</td>
          <td>${lr.truckNumber || 'N/A'}</td>
          <td>${lr.consignorName || 'N/A'}</td>
          <td>${lr.consigneeName || 'N/A'}</td>
          <td>${lr.billingTo || 'N/A'}</td>
          <td>${lr.productName || 'N/A'}</td>
          <td>${lr.weight || 0}T</td>
          <td>₹${(lr.advanceToDriver || 0).toLocaleString()}</td>
          <td><span class="status-badge ${getStatusClass(lr.status)}">${lr.status || 'Pending'}</span></td>
          <td>
            <div class="flex gap-1">
              <button onclick="viewRecord('${lr.__backendId}')" class="text-blue-600 hover:text-blue-800 text-xs" title="View">👁️</button>
              <button onclick="editBookingLR('${lr.__backendId}')" class="text-green-600 hover:text-green-800 text-xs" title="Edit">✏️</button>
              <button onclick="printRecord('${lr.__backendId}', 'booking_lr')" class="text-purple-600 hover:text-purple-800 text-xs" title="Print">🖨️</button>
              <button onclick="deleteRecord('${lr.__backendId}')" class="text-red-600 hover:text-red-800 text-xs" title="Delete">🗑️</button>
            </div>
          </td>
        </tr>
      `).join('');

      // PAGINATION: Add controls after the table
      const paginationHTML = createPaginationControls('lr', lrs.length);
      let paginationDiv = document.getElementById('lr-pagination');
      if (!paginationDiv) {
        paginationDiv = document.createElement('div');
        paginationDiv.id = 'lr-pagination';
        tbody.parentElement.parentElement.appendChild(paginationDiv);
      }
      paginationDiv.innerHTML = paginationHTML;
    }

    function updateNonBookingLRList() {
      const tbody = document.getElementById('nonBookingLRList');
      const lrs = allRecords.filter(r => r.type === 'non_booking_lr');
      
      if (lrs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" class="text-center text-gray-500">No non-booking LRs yet</td></tr>';
        // Remove pagination if exists
        const paginationDiv = document.getElementById('nonBookingLR-pagination');
        if (paginationDiv) paginationDiv.remove();
        return;
      }

      // PAGINATION: Get only current page data
      const paginatedLRs = getPaginatedData(lrs, 'nonBookingLR');
      const startIndex = (paginationState['nonBookingLR'].currentPage - 1) * paginationState['nonBookingLR'].itemsPerPage;

      tbody.innerHTML = paginatedLRs.map((lr, index) => `
        <tr>
          <td>${startIndex + index + 1}</td>
          <td>${lr.lrNumber || 'N/A'}</td>
          <td>
            ${lr.lrType === 'To Pay' ? 
              '<span class="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full font-semibold">TO PAY</span>' : 
              '<span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-semibold">TO BE BILLED</span>'
            }
          </td>
          <td>${lr.lrDate || 'N/A'}</td>
          <td>${lr.truckNumber || 'N/A'}</td>
          <td>${lr.partyName || 'N/A'}</td>
          <td>${lr.from || 'N/A'} → ${lr.to || 'N/A'}</td>
          <td>${lr.productName || 'N/A'}</td>
          <td>${lr.weight || 0}T</td>
          <td>₹${(lr.freightAmount || 0).toLocaleString()}</td>
          <td>${lr.paymentCategory || 'N/A'}</td>
          <td><span class="status-badge ${getStatusClass(lr.status)}">${lr.status || 'Pending'}</span></td>
          <td>
            <div class="flex gap-1">
              <button onclick="viewRecord('${lr.__backendId}')" class="text-blue-600 hover:text-blue-800 text-xs" title="View">👁️</button>
              <button onclick="editNonBookingLR('${lr.__backendId}')" class="text-green-600 hover:text-green-800 text-xs" title="Edit">✏️</button>
              <button onclick="printRecord('${lr.__backendId}', 'non_booking_lr')" class="text-purple-600 hover:text-purple-800 text-xs" title="Print">🖨️</button>
              <button onclick="deleteRecord('${lr.__backendId}')" class="text-red-600 hover:text-red-800 text-xs" title="Delete">🗑️</button>
            </div>
          </td>
        </tr>
      `).join('');

      // PAGINATION: Add controls after the table
      const paginationHTML = createPaginationControls('nonBookingLR', lrs.length);
      let paginationDiv = document.getElementById('nonBookingLR-pagination');
      if (!paginationDiv) {
        paginationDiv = document.createElement('div');
        paginationDiv.id = 'nonBookingLR-pagination';
        tbody.parentElement.parentElement.appendChild(paginationDiv);
      }
      paginationDiv.innerHTML = paginationHTML;
    }

    function updateChallanBookList() {
      const tbody = document.getElementById('challanBookList');
      const entries = allRecords.filter(r => r.type === 'challan_book');
      
      if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="16" class="text-center text-gray-500">No challan records yet</td></tr>';
        // Remove pagination if exists
        const paginationDiv = document.getElementById('challan-pagination');
        if (paginationDiv) paginationDiv.remove();
        return;
      }

      // PAGINATION: Get only current page data
      const paginatedEntries = getPaginatedData(entries, 'challan');
      const startIndex = (paginationState['challan'].currentPage - 1) * paginationState['challan'].itemsPerPage;

      tbody.innerHTML = paginatedEntries.map((entry, index) => {
        const truckMaster = allRecords.find(r => r.type === 'truck_master' && r.truckNumber === entry.truckNumber);
        const totalAmount = entry.truckRate || 0;
        const advance = entry.advancePaidToOwner || 0;
        const balanceAmount = entry.balanceAmount || (totalAmount - advance);
        const remainingBalance = entry.remainingBalance || 0;
        
        // Find linked LRs dynamically (in case they weren't stored)
        let lrNumbers = entry.lrNumbers || '';
        let lrCount = entry.linkedLRCount || 0;
        
        // If no LR numbers stored, find them now
        if (!lrNumbers && entry.dailyEntryId) {
          const linkedLRs = allRecords.filter(r => 
            (r.type === 'booking_lr' || r.type === 'non_booking_lr') && 
            (r.dailyEntryId === entry.dailyEntryId || r.dailyRegisterId === entry.dailyEntryId)
          );
          if (linkedLRs.length > 0) {
            lrNumbers = linkedLRs.map(lr => lr.lrNumber).filter(Boolean).join(', ');
            lrCount = linkedLRs.length;
          }
        }
        
        const lrDisplay = lrNumbers ? `${lrNumbers} ${lrCount > 1 ? `(${lrCount} LRs)` : ''}` : 'N/A';

        return `
          <tr>
            <td>${startIndex + index + 1}</td>
            <td class="font-semibold text-blue-700">${entry.challanNumber || 'N/A'}</td>
            <td>${entry.date || 'N/A'}</td>
            <td>${entry.truckNumber || 'N/A'}</td>
            <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${lrNumbers}">${lrDisplay}</td>
            <td>${entry.from || 'N/A'} → ${entry.to || 'N/A'}</td>
            <td>${entry.weight || 0}T</td>
            <td>₹${(entry.ratePerTonne || 0).toLocaleString()}</td>
            <td>₹${(entry.truckRate || 0).toLocaleString()}</td>
            <td>₹${advance.toLocaleString()}</td>
            <td>₹${(entry.commission || 0).toLocaleString()}</td>
            <td>₹${(entry.hammaliCharges || 0).toLocaleString()}</td>
            <td>₹${(entry.otherDeductions || 0).toLocaleString()}</td>
            <td class="${remainingBalance >= 0 ? 'profit-positive' : 'profit-negative'}">₹${remainingBalance.toLocaleString()}</td>
            <td><span class="status-badge ${getStatusClass(entry.status)}">${entry.status || 'Pending'}</span></td>
            <td>
              <div class="flex gap-1">
                <button onclick="viewRecord('${entry.__backendId}')" class="text-blue-600 hover:text-blue-800 text-xs" title="View">👁️</button>
                <button onclick="editChallan('${entry.__backendId}')" class="text-green-600 hover:text-green-800 text-xs" title="Edit">✏️</button>
                <button onclick="printRecord('${entry.__backendId}', 'challan_book')" class="text-purple-600 hover:text-purple-800 text-xs" title="Print">🖨️</button>
                <button onclick="deleteRecord('${entry.__backendId}')" class="text-red-600 hover:text-red-800 text-xs" title="Delete">🗑️</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // PAGINATION: Add controls after the table
      const paginationHTML = createPaginationControls('challan', entries.length);
      let paginationDiv = document.getElementById('challan-pagination');
      if (!paginationDiv) {
        paginationDiv = document.createElement('div');
        paginationDiv.id = 'challan-pagination';
        tbody.parentElement.parentElement.appendChild(paginationDiv);
      }
      paginationDiv.innerHTML = paginationHTML;
    }

    function updateReceivedLRList() {
      const tbody = document.getElementById('receivedLRList');
      const lrs = allRecords.filter(r => (r.type === 'booking_lr' || r.type === 'non_booking_lr') && r.lrReceived);
      
      if (lrs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-gray-500">No received LRs yet</td></tr>';
        return;
      }

      tbody.innerHTML = lrs.map(lr => {
        const conditionClass = lr.lrCondition === 'Perfectly Alright' ? 'text-green-600' : 'text-orange-600';
        return `
          <tr>
            <td>${lr.lrNumber || 'N/A'}</td>
            <td>${lr.type === 'booking_lr' ? 'Booking' : 'Non-Booking'}</td>
            <td>${lr.truckNumber || 'N/A'}</td>
            <td>${lr.companyName || lr.partyName || 'N/A'}</td>
            <td>${lr.lrReceivedDate || 'N/A'}</td>
            <td class="${conditionClass} font-semibold">${lr.lrCondition || 'N/A'}</td>
            <td>₹${(lr.haltingCharges || 0).toLocaleString()}</td>
            <td>₹${(lr.hammaliCharges || 0).toLocaleString()}</td>
            <td><span class="status-badge ${getStatusClass(lr.status)}">${lr.status || 'Received'}</span></td>
            <td>
              <button onclick="viewDetails('${lr.__backendId}')" class="text-blue-600 hover:text-blue-800 text-sm">View</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    function updateDeductionsUI() {
      const deductionEntries = allRecords.filter(r => r.type === 'deduction_entry');

      const totalDeductions = deductionEntries.reduce((sum, d) => 
        sum + (d.damageCharges || 0) + (d.otherDeductions || 0), 0
      );

      const totalDamageCharges = deductionEntries.reduce((sum, d) => 
        sum + (d.damageCharges || 0), 0
      );

      const totalOtherDeductions = deductionEntries.reduce((sum, d) => 
        sum + (d.otherDeductions || 0), 0
      );

      const totalDeductionsElem = document.getElementById('totalDeductions');
      if (totalDeductionsElem) {
        totalDeductionsElem.textContent = `₹${totalDeductions.toLocaleString()}`;
      }
      
      const totalDamageChargesElem = document.getElementById('totalDamageCharges');
      if (totalDamageChargesElem) {
        totalDamageChargesElem.textContent = `₹${totalDamageCharges.toLocaleString()}`;
      }
      
      const totalOtherDeductionsElem = document.getElementById('totalOtherDeductions');
      if (totalOtherDeductionsElem) {
        totalOtherDeductionsElem.textContent = `₹${totalOtherDeductions.toLocaleString()}`;
      }

      const tbody = document.getElementById('deductionsList');
      if (!tbody) return;
      
      if (deductionEntries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="text-center text-gray-500">No deductions yet</td></tr>';
        return;
      }

      tbody.innerHTML = deductionEntries.map(d => {
        const totalDeducted = (d.damageCharges || 0) + (d.otherDeductions || 0);
        return `
          <tr>
            <td>${d.lrNumber || 'N/A'}</td>
            <td>${d.lrType === 'booking_lr' ? 'Booking' : 'Non-Booking'}</td>
            <td>${d.truckNumber || 'N/A'}</td>
            <td>${d.companyName || d.partyName || 'N/A'}</td>
            <td>${d.lrReceivedDate || 'N/A'}</td>
            <td>${d.deductionType || 'N/A'}</td>
            <td>₹${(d.damageCharges || 0).toLocaleString()}</td>
            <td>₹${(d.otherDeductions || 0).toLocaleString()}</td>
            <td class="profit-negative">₹${totalDeducted.toLocaleString()}</td>
            <td>${d.damageDetails || '-'}</td>
            <td>${d.missingDetails || '-'}</td>
            <td>
              <button onclick="deleteRecord('${d.__backendId}')" class="text-red-600 hover:text-red-800 text-sm">Delete</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    let plFilteredRecords = [];

    function applyPLFilters() {
      // Filter UI has been removed from P&L tab - this function is now a no-op
      const truckSelect = document.getElementById('plFilterTruck');
      const companySelect = document.getElementById('plFilterCompany');
      const partySelect = document.getElementById('plFilterParty');
      
      if (!truckSelect || !companySelect || !partySelect) {
        return; // Elements don't exist in new simplified P&L
      }
      
      const truck = truckSelect.value;
      const company = companySelect.value;
      const party = partySelect.value;

      plFilteredRecords = allRecords.filter(r => {
        // Only filter daily_register entries to avoid counting duplicates with LRs
        if (r.type !== 'daily_register') return false;
        if (truck && r.truckNumber !== truck) return false;
        if (company && r.companyName !== company) return false;
        if (party && r.partyName !== party) return false;
        return true;
      });

      calculateProfitLoss();
    }

    function clearPLFilters() {
      // Filter UI has been removed from P&L tab - this function is now a no-op
      const truckSelect = document.getElementById('plFilterTruck');
      const companySelect = document.getElementById('plFilterCompany');
      const partySelect = document.getElementById('plFilterParty');
      
      if (!truckSelect || !companySelect || !partySelect) {
        return; // Elements don't exist in new simplified P&L
      }
      
      truckSelect.value = '';
      companySelect.value = '';
      partySelect.value = '';
      plFilteredRecords = [];
      calculateProfitLoss();
    }

    function populatePLFilters() {
      // Filter UI has been removed from P&L tab - this function is now a no-op
      const truckSelect = document.getElementById('plFilterTruck');
      const companySelect = document.getElementById('plFilterCompany');
      const partySelect = document.getElementById('plFilterParty');
      
      // Only populate if elements exist (they don't in the new simplified P&L)
      if (!truckSelect || !companySelect || !partySelect) {
        return;
      }
      
      const trucks = [...new Set(allRecords.filter(r => r.truckNumber).map(r => r.truckNumber))];
      const companies = [...new Set(allRecords.filter(r => r.companyName).map(r => r.companyName))];
      const parties = [...new Set(allRecords.filter(r => r.partyName).map(r => r.partyName))];

      truckSelect.innerHTML = '<option value="">All Trucks</option>' + 
        trucks.map(t => `<option value="${t}">${t}</option>`).join('');

      companySelect.innerHTML = '<option value="">All Companies</option>' + 
        companies.map(c => `<option value="${c}">${c}</option>`).join('');

      partySelect.innerHTML = '<option value="">All Parties</option>' + 
        parties.map(p => `<option value="${p}">${p}</option>`).join('');
    }

    // NEW Profit & Loss Calculation Function
    function calculateProfitLoss() {
      console.log('=== Starting P&L Calculation ===');
      
      // Get all relevant records
      const challanRecords = allRecords.filter(r => r.type === 'challan_book');
      const lrRecords = allRecords.filter(r => r.type === 'booking_lr' || r.type === 'non_booking_lr');
      
      console.log('Found records - Challan:', challanRecords.length, 'LR:', lrRecords.length);
      
      // Process each LR entry (since LR has the Total Amount field)
      const allTrips = [];
      const processedLRs = new Set(); // Track processed LRs to avoid duplicates
      
      lrRecords.forEach(lr => {
        const truck = lr.truckNumber;
        if (!truck) return;
        
        // Skip if we've already processed this LR (avoid duplicates)
        const lrId = lr.__backendId || lr.__firebaseId;
        if (processedLRs.has(lrId)) {
          console.log(`⚠️ Skipping duplicate LR: ${lrId} for truck ${truck}`);
          return;
        }
        processedLRs.add(lrId);
        
        // Create entry for this trip
        const tripData = {
          date: lr.lrDate || lr.date || new Date().toLocaleDateString('en-GB'),
          truckNumber: truck,
          companyPartyName: '',
          truckTotal: 0,     // Total amount paid to truck (from Challan)
          lrTotal: 0,        // Total amount received from company (from LR)
        };
        
        // Get Total Amount from LR (it's in companyRate field)
        tripData.lrTotal = parseFloat(lr.companyRate) || 0;
        
        // Get company/party name from LR
        tripData.companyPartyName = lr.companyName || lr.partyName || lr.consignor || 'N/A';
        
        // Find matching Challan entry - MATCH BY dailyEntryId!
        let challan = null;
        
        // Strategy 1: Match by dailyEntryId (BEST - this is the proper link)
        if (lr.dailyEntryId || lr.dailyRegisterId) {
          const dailyId = lr.dailyEntryId || lr.dailyRegisterId;
          challan = challanRecords.find(c => c.dailyEntryId === dailyId);
          if (challan) {
            console.log(`✅ Matched LR to Challan via dailyEntryId: ${dailyId}`);
          }
        }
        
        // Strategy 2: Match by truck number and date (fallback)
        if (!challan) {
          challan = challanRecords.find(c => 
            c.truckNumber === truck && 
            (c.date === lr.lrDate || c.date === lr.date)
          );
          if (challan) {
            console.log(`✅ Matched LR to Challan via truck+date: ${truck}`);
          }
        }
        
        // Strategy 3: Match by truck number only if there's exactly one Challan for this truck
        if (!challan) {
          const truckChallans = challanRecords.filter(c => c.truckNumber === truck);
          if (truckChallans.length === 1) {
            challan = truckChallans[0];
            console.log(`✅ Matched LR to Challan via truck only: ${truck} (only 1 challan exists)`);
          }
        }
        
        if (challan) {
          // The Challan has "truckRate" field which contains the total truck amount
          tripData.truckTotal = parseFloat(challan.truckRate) || 0;
          
          // Update company name from challan if not set
          if (!tripData.companyPartyName || tripData.companyPartyName === 'N/A') {
            tripData.companyPartyName = challan.companyName || challan.partyName || tripData.companyPartyName;
          }
        } else {
          console.log(`❌ No Challan found for LR truck ${truck}, dailyEntryId: ${lr.dailyEntryId || 'none'}`);
        }
        
        allTrips.push(tripData);
      });
      
      console.log(`📊 Processed ${allTrips.length} unique LRs (skipped ${lrRecords.length - allTrips.length} duplicates)`);
      
      // Now populate the table
      const tbody = document.getElementById('profitLossByTruck');
      
      // Sort by date (newest first)
      allTrips.sort((a, b) => {
        const dateA = new Date(a.date.split('-').reverse().join('-'));
        const dateB = new Date(b.date.split('-').reverse().join('-'));
        return dateB - dateA;
      });
      
      if (allTrips.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-gray-500" style="padding: 20px;">No data available</td></tr>';
        // Remove pagination if exists
        const paginationDiv = document.getElementById('profitLoss-pagination');
        if (paginationDiv) paginationDiv.remove();
        return;
      }
      
      // Calculate totals from ALL data (not just paginated)
      let totalTruckAmount = 0;
      let totalLRAmount = 0;
      let totalProfit = 0;
      
      allTrips.forEach(trip => {
        totalTruckAmount += trip.truckTotal;
        totalLRAmount += trip.lrTotal;
        totalProfit += (trip.lrTotal - trip.truckTotal);
      });
      
      // PAGINATION: Get only current page data
      const paginatedTrips = getPaginatedData(allTrips, 'profitLoss');
      const startIndex = (paginationState['profitLoss'].currentPage - 1) * paginationState['profitLoss'].itemsPerPage;
      
      let tableHTML = '';
      
      // Build table rows with paginated data
      paginatedTrips.forEach((trip, index) => {
        const profitLoss = trip.lrTotal - trip.truckTotal;
        const isProfit = profitLoss >= 0;
        
        tableHTML += `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="text-align: center; padding: 12px;">${startIndex + index + 1}</td>
            <td style="font-weight: 600; padding: 12px; color: #4f46e5;">${trip.truckNumber}</td>
            <td style="padding: 12px;">${trip.date}</td>
            <td style="padding: 12px;">${trip.companyPartyName}</td>
            <td style="text-align: right; font-weight: 600; padding: 12px;">₹${trip.truckTotal.toLocaleString('en-IN')}</td>
            <td style="text-align: right; font-weight: 600; padding: 12px;">₹${trip.lrTotal.toLocaleString('en-IN')}</td>
            <td style="text-align: right; font-weight: bold; padding: 12px; color: ${isProfit ? '#10b981' : '#ef4444'};">
              ${isProfit ? '+' : ''}₹${Math.abs(profitLoss).toLocaleString('en-IN')}
            </td>
          </tr>
        `;
      });
      
      tbody.innerHTML = tableHTML;
      
      // PAGINATION: Add controls after the table
      const paginationHTML = createPaginationControls('profitLoss', allTrips.length);
      let paginationDiv = document.getElementById('profitLoss-pagination');
      if (!paginationDiv) {
        paginationDiv = document.createElement('div');
        paginationDiv.id = 'profitLoss-pagination';
        tbody.parentElement.parentElement.appendChild(paginationDiv);
      }
      paginationDiv.innerHTML = paginationHTML;
      
      // Update footer totals (using ALL data, not just paginated)
      document.getElementById('footerTruckTotal').textContent = `₹${totalTruckAmount.toLocaleString('en-IN')}`;
      document.getElementById('footerLRTotal').textContent = `₹${totalLRAmount.toLocaleString('en-IN')}`;
      const footerProfitEl = document.getElementById('footerProfitTotal');
      footerProfitEl.textContent = `${totalProfit >= 0 ? '+' : ''}₹${Math.abs(totalProfit).toLocaleString('en-IN')}`;
      footerProfitEl.style.color = totalProfit >= 0 ? '#10b981' : '#ef4444';
      
      console.log('=== P&L Calculation Complete ===');
    }


    function updateBillsList() {
      const tbody = document.getElementById('billsList');
      const bills = allRecords.filter(r => (r.type === 'booking_lr' || r.type === 'non_booking_lr') && r.billNumber);
      
      if (bills.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="text-center text-gray-500">No bills created yet</td></tr>';
        return;
      }

      tbody.innerHTML = bills.map(bill => {
        const total = (bill.billAmount || 0) + (bill.gstAmount || 0);
        const lrSentBadge = bill.lrSentStatus === 'Sent' 
          ? '<span class="status-badge status-completed">Sent</span>' 
          : '<span class="status-badge status-pending">Not Sent</span>';
        const sentDate = bill.lrSentDate || '-';
        const sentMethod = bill.lrSentMethod || '-';
        
        return `
          <tr>
            <td>${bill.billNumber || 'N/A'}</td>
            <td>${bill.billDate || 'N/A'}</td>
            <td>${bill.lrNumber || 'N/A'}</td>
            <td>${bill.billingTo || 'N/A'}</td>
            <td>₹${(bill.billAmount || 0).toLocaleString()}</td>
            <td>₹${(bill.gstAmount || 0).toLocaleString()}</td>
            <td>₹${total.toLocaleString()}</td>
            <td>${lrSentBadge}</td>
            <td>${sentDate}</td>
            <td>${sentMethod}</td>
            <td><span class="status-badge ${getStatusClass(bill.status)}">${bill.status || 'Billed'}</span></td>
            <td>
              <div class="flex gap-1">
                <button onclick="viewRecord('${bill.__backendId}')" class="text-blue-600 hover:text-blue-800 text-xs" title="View">👁️</button>
                <button onclick="editBill('${bill.__backendId}')" class="text-green-600 hover:text-green-800 text-xs" title="Edit">✏️</button>
                <button onclick="printProfessionalInvoice('${bill.__backendId}')" class="text-purple-600 hover:text-purple-800 text-xs" title="Print Invoice">🖨️</button>
                <button onclick="deleteBill('${bill.__backendId}')" class="text-red-600 hover:text-red-800 text-xs" title="Delete">🗑️</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    function updateGSTList() {
      const tbody = document.getElementById('gstList');
      
      // Get all booking LRs
      const bookingLRs = allRecords.filter(r => r.type === 'booking_lr');
      
      if (!tbody) return;
      
      if (bookingLRs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="14" class="text-center text-gray-500 py-8">No booking LRs found. Create some booking LRs from the "Booking LR" tab first.</td></tr>';
        updateGSTSummary([]); // Update summary with empty data
        // Remove pagination if exists
        const paginationDiv = document.getElementById('gst-pagination');
        if (paginationDiv) paginationDiv.remove();
        return;
      }

      // Sort by LR number
      bookingLRs.sort((a, b) => {
        const lrA = parseInt(a.lrNumber) || 0;
        const lrB = parseInt(b.lrNumber) || 0;
        return lrA - lrB;
      });

      // PAGINATION: Get only current page data
      const paginatedLRs = getPaginatedData(bookingLRs, 'gst');
      const startIndex = (paginationState['gst'].currentPage - 1) * paginationState['gst'].itemsPerPage;

      // Render table with paginated data
      tbody.innerHTML = paginatedLRs.map((record, index) => `
        <tr>
          <td class="text-center">${startIndex + index + 1}</td>
          <td class="font-semibold text-blue-600">${record.lrNumber || '-'}</td>
          <td>${record.truckNumber || '-'}</td>
          <td>${record.lrDate ? formatDate(record.lrDate) : '-'}</td>
          <td>${record.from || '-'}</td>
          <td>${record.to || '-'}</td>
          <td>${record.consignorName || '-'}</td>
          <td>${record.consignorGST || '-'}</td>
          <td>${record.consigneeName || '-'}</td>
          <td>${record.consigneeGST || '-'}</td>
          <td>${record.productName || '-'}</td>
          <td class="text-right">${record.quantity || 0}</td>
          <td class="text-right">${record.weight || 0}</td>
          <td class="text-right font-semibold">₹${(record.companyRate || 0).toLocaleString('en-IN')}</td>
        </tr>
      `).join('');

      // PAGINATION: Add controls after the table
      const paginationHTML = createPaginationControls('gst', bookingLRs.length);
      let paginationDiv = document.getElementById('gst-pagination');
      if (!paginationDiv) {
        paginationDiv = document.createElement('div');
        paginationDiv.id = 'gst-pagination';
        tbody.parentElement.parentElement.appendChild(paginationDiv);
      }
      paginationDiv.innerHTML = paginationHTML;

      // Update summary (use all records, not just paginated ones)
      updateGSTSummary(bookingLRs);
    }

    function updateGSTSummary(records) {
      const totalLRs = records.length;
      const totalAmount = records.reduce((sum, r) => sum + (parseFloat(r.companyRate) || 0), 0);
      const totalWeight = records.reduce((sum, r) => sum + (parseFloat(r.weight) || 0), 0);
      const totalQty = records.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0);

      const totalLRsEl = document.getElementById('gstTotalLRs');
      const totalAmountEl = document.getElementById('gstTotalAmount');
      const totalWeightEl = document.getElementById('gstTotalWeight');
      const totalQtyEl = document.getElementById('gstTotalQty');

      if (totalLRsEl) totalLRsEl.textContent = totalLRs;
      if (totalAmountEl) totalAmountEl.textContent = '₹' + totalAmount.toLocaleString('en-IN');
      if (totalWeightEl) totalWeightEl.textContent = totalWeight.toLocaleString('en-IN') + ' kg';
      if (totalQtyEl) totalQtyEl.textContent = totalQty.toLocaleString('en-IN');
    }

    function filterGSTReport() {
      const monthFilter = document.getElementById('gstMonthFilter')?.value;
      const lrSearch = document.getElementById('gstSearchLR')?.value.toLowerCase().trim();
      const tbody = document.getElementById('gstList');

      if (!tbody) return;

      // Get all booking LRs
      let bookingLRs = allRecords.filter(r => r.type === 'booking_lr');

      // Apply filters
      const filteredLRs = bookingLRs.filter(record => {
        // Filter by month
        if (monthFilter && record.lrDate) {
          const recordDate = new Date(record.lrDate);
          const filterDate = new Date(monthFilter);
          if (recordDate.getFullYear() !== filterDate.getFullYear() || 
              recordDate.getMonth() !== filterDate.getMonth()) {
            return false;
          }
        }

        // Filter by LR number
        if (lrSearch && !record.lrNumber?.toLowerCase().includes(lrSearch)) {
          return false;
        }

        return true;
      });

      // Sort by LR number
      filteredLRs.sort((a, b) => {
        const lrA = parseInt(a.lrNumber) || 0;
        const lrB = parseInt(b.lrNumber) || 0;
        return lrA - lrB;
      });

      if (filteredLRs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="14" class="text-center text-gray-500 py-8">No booking LRs match the selected filters.</td></tr>';
        updateGSTSummary([]);
        // Remove pagination if exists
        const paginationDiv = document.getElementById('gst-pagination');
        if (paginationDiv) paginationDiv.remove();
        return;
      }

      // Reset to page 1 when filtering
      paginationState['gst'].currentPage = 1;

      // PAGINATION: Get only current page data
      const paginatedLRs = getPaginatedData(filteredLRs, 'gst');
      const startIndex = (paginationState['gst'].currentPage - 1) * paginationState['gst'].itemsPerPage;

      // Render filtered table with pagination
      tbody.innerHTML = paginatedLRs.map((record, index) => `
        <tr>
          <td class="text-center">${startIndex + index + 1}</td>
          <td class="font-semibold text-blue-600">${record.lrNumber || '-'}</td>
          <td>${record.truckNumber || '-'}</td>
          <td>${record.lrDate ? formatDate(record.lrDate) : '-'}</td>
          <td>${record.from || '-'}</td>
          <td>${record.to || '-'}</td>
          <td>${record.consignorName || '-'}</td>
          <td>${record.consignorGST || '-'}</td>
          <td>${record.consigneeName || '-'}</td>
          <td>${record.consigneeGST || '-'}</td>
          <td>${record.productName || '-'}</td>
          <td class="text-right">${record.quantity || 0}</td>
          <td class="text-right">${record.weight || 0}</td>
          <td class="text-right font-semibold">₹${(record.companyRate || 0).toLocaleString('en-IN')}</td>
        </tr>
      `).join('');

      // PAGINATION: Add controls after the table
      const paginationHTML = createPaginationControls('gst', filteredLRs.length);
      let paginationDiv = document.getElementById('gst-pagination');
      if (!paginationDiv) {
        paginationDiv = document.createElement('div');
        paginationDiv.id = 'gst-pagination';
        tbody.parentElement.parentElement.appendChild(paginationDiv);
      }
      paginationDiv.innerHTML = paginationHTML;

      // Update summary with filtered data (use all filtered records, not just paginated)
      updateGSTSummary(filteredLRs);
    }

    function clearGSTFilters() {
      const monthFilterEl = document.getElementById('gstMonthFilter');
      const lrSearchEl = document.getElementById('gstSearchLR');
      
      if (monthFilterEl) monthFilterEl.value = '';
      if (lrSearchEl) lrSearchEl.value = '';
      
      // Reload data
      updateGSTList();
    }

    function exportGSTToExcel() {
      const tbody = document.getElementById('gstList');
      if (!tbody) return;

      // Get current displayed records
      const rows = tbody.querySelectorAll('tr');
      if (rows.length === 0 || (rows.length === 1 && rows[0].cells.length === 1)) {
        alert('No data to export');
        return;
      }

      // Get all booking LRs (apply same filters if any)
      const monthFilter = document.getElementById('gstMonthFilter')?.value;
      const lrSearch = document.getElementById('gstSearchLR')?.value.toLowerCase().trim();
      
      let bookingLRs = allRecords.filter(r => r.type === 'booking_lr');

      // Apply filters
      bookingLRs = bookingLRs.filter(record => {
        if (monthFilter && record.lrDate) {
          const recordDate = new Date(record.lrDate);
          const filterDate = new Date(monthFilter);
          if (recordDate.getFullYear() !== filterDate.getFullYear() || 
              recordDate.getMonth() !== filterDate.getMonth()) {
            return false;
          }
        }
        if (lrSearch && !record.lrNumber?.toLowerCase().includes(lrSearch)) {
          return false;
        }
        return true;
      });

      // Sort by LR number
      bookingLRs.sort((a, b) => {
        const lrA = parseInt(a.lrNumber) || 0;
        const lrB = parseInt(b.lrNumber) || 0;
        return lrA - lrB;
      });

      let csv = 'S.No.,LR Number,Truck Number,LR Date,From,To,Consignor,Consignor GST,Consignee,Consignee GST,Product,Quantity,Weight (kg),Total Amount\n';
      
      bookingLRs.forEach((record, index) => {
        csv += [
          index + 1,
          record.lrNumber || '',
          record.truckNumber || '',
          record.lrDate ? formatDate(record.lrDate) : '',
          record.from || '',
          record.to || '',
          record.consignorName || '',
          record.consignorGST || '',
          record.consigneeName || '',
          record.consigneeGST || '',
          record.productName || '',
          record.quantity || 0,
          record.weight || 0,
          record.companyRate || 0
        ].map(field => `"${field}"`).join(',') + '\n';
      });

      // Create download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GST_Report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }

    function printGSTTable() {
      window.print();
    }

    function updateMasterLists() {
      const trucks = allRecords.filter(r => r.type === 'truck_master');
      const companies = allRecords.filter(r => r.type === 'company_master');
      const parties = allRecords.filter(r => r.type === 'party_master');
      const staff = allRecords.filter(r => r.type === 'staff_master');
      const salaryPayments = allRecords.filter(r => r.type === 'salary_payment');

      const truckList = document.getElementById('truckMasterList');
      if (truckList) {
        if (trucks.length === 0) {
          truckList.innerHTML = '<p class="text-sm text-gray-500">No trucks added yet</p>';
          // Clear pagination
          const paginationContainer = document.getElementById('truckMaster-pagination');
          if (paginationContainer) paginationContainer.innerHTML = '';
        } else {
          // PAGINATION: Get only current page data
          const paginatedTrucks = getPaginatedData(trucks, 'truckMaster');
          
          truckList.innerHTML = paginatedTrucks.map(t => `
            <div class="p-3 bg-gray-50 rounded-lg">
              <div class="flex justify-between items-start">
                <div>
                  <div class="font-medium">${t.truckNumber}</div>
                  <div class="text-sm text-gray-600">Owner: ${t.truckOwner}</div>
                  ${t.driverName ? `<div class="text-sm text-gray-600">Driver: ${t.driverName}</div>` : ''}
                  ${t.driverPhone ? `<div class="text-sm text-gray-600">Phone: ${t.driverPhone}</div>` : ''}
                </div>
                <div class="flex gap-2">
                  <button onclick="editTruckMaster('${t.__backendId}')" class="text-green-600 hover:text-green-800 text-xs" title="Edit">✏️</button>
                  <button onclick="deleteRecord('${t.__backendId}')" class="text-red-600 hover:text-red-800 text-xs" title="Delete">🗑️</button>
                </div>
              </div>
            </div>
          `).join('');
          
          // PAGINATION: Add controls
          const paginationHTML = createPaginationControls('truckMaster', trucks.length);
          let paginationContainer = document.getElementById('truckMaster-pagination');
          if (!paginationContainer) {
            paginationContainer = document.createElement('div');
            paginationContainer.id = 'truckMaster-pagination';
            truckList.parentElement.appendChild(paginationContainer);
          }
          paginationContainer.innerHTML = paginationHTML;
        }
      }

      const companyList = document.getElementById('companyMasterList');
      if (companyList) {
        if (companies.length === 0) {
          companyList.innerHTML = '<p class="text-sm text-gray-500">No companies added yet</p>';
          // Clear pagination
          const paginationContainer = document.getElementById('companyMaster-pagination');
          if (paginationContainer) paginationContainer.innerHTML = '';
        } else {
          // PAGINATION: Get only current page data
          const paginatedCompanies = getPaginatedData(companies, 'companyMaster');
          
          companyList.innerHTML = paginatedCompanies.map(c => `
            <div class="p-3 bg-gray-50 rounded-lg">
              <div class="flex justify-between items-start">
                <div>
                  <div class="font-medium">${c.companyName}</div>
                  ${c.companyGST ? `<div class="text-sm text-gray-600">GST: ${c.companyGST}</div>` : ''}
                  ${c.companyAddress ? `<div class="text-sm text-gray-600">${c.companyAddress}</div>` : ''}
                </div>
                <div class="flex gap-2">
                  <button onclick="editCompanyMaster('${c.__backendId}')" class="text-green-600 hover:text-green-800 text-xs" title="Edit">✏️</button>
                  <button onclick="deleteRecord('${c.__backendId}')" class="text-red-600 hover:text-red-800 text-xs" title="Delete">🗑️</button>
                </div>
              </div>
            </div>
          `).join('');
          
          // PAGINATION: Add controls
          const paginationHTML = createPaginationControls('companyMaster', companies.length);
          let paginationContainer = document.getElementById('companyMaster-pagination');
          if (!paginationContainer) {
            paginationContainer = document.createElement('div');
            paginationContainer.id = 'companyMaster-pagination';
            companyList.parentElement.appendChild(paginationContainer);
          }
          paginationContainer.innerHTML = paginationHTML;
        }
      }

      const partyList = document.getElementById('partyMasterList');
      if (partyList) {
        if (parties.length === 0) {
          partyList.innerHTML = '<p class="text-sm text-gray-500">No parties added yet</p>';
          // Clear pagination
          const paginationContainer = document.getElementById('partyMaster-pagination');
          if (paginationContainer) paginationContainer.innerHTML = '';
        } else {
          // PAGINATION: Get only current page data
          const paginatedParties = getPaginatedData(parties, 'partyMaster');
          
          partyList.innerHTML = paginatedParties.map(p => `
            <div class="p-3 bg-gray-50 rounded-lg">
              <div class="flex justify-between items-start">
                <div>
                  <div class="font-medium">${p.partyName}</div>
                  ${p.partyGST ? `<div class="text-sm text-gray-600">GST: ${p.partyGST}</div>` : ''}
                  ${p.partyAddress ? `<div class="text-sm text-gray-600">${p.partyAddress}</div>` : ''}
                </div>
                <div class="flex gap-2">
                  <button onclick="editPartyMaster('${p.__backendId}')" class="text-green-600 hover:text-green-800 text-xs" title="Edit">✏️</button>
                  <button onclick="deleteRecord('${p.__backendId}')" class="text-red-600 hover:text-red-800 text-xs" title="Delete">🗑️</button>
                </div>
              </div>
            </div>
          `).join('');
          
          // PAGINATION: Add controls
          const paginationHTML = createPaginationControls('partyMaster', parties.length);
          let paginationContainer = document.getElementById('partyMaster-pagination');
          if (!paginationContainer) {
            paginationContainer = document.createElement('div');
            paginationContainer.id = 'partyMaster-pagination';
            partyList.parentElement.appendChild(paginationContainer);
          }
          paginationContainer.innerHTML = paginationHTML;
        }
      }

      const staffList = document.getElementById('staffMasterList');
      if (staffList) {
        if (staff.length === 0) {
          staffList.innerHTML = '<p class="text-sm text-gray-500">No staff added yet</p>';
          // Clear pagination
          const paginationContainer = document.getElementById('staffMaster-pagination');
          if (paginationContainer) paginationContainer.innerHTML = '';
        } else {
          // PAGINATION: Get only current page data
          const paginatedStaff = getPaginatedData(staff, 'staffMaster');
          
          staffList.innerHTML = paginatedStaff.map(s => `
            <div class="p-3 bg-gray-50 rounded-lg">
              <div class="flex justify-between items-start">
                <div>
                  <div class="font-medium">${s.staffName}</div>
                  <div class="text-sm text-gray-600">Salary: ₹${(s.staffSalary || 0).toLocaleString()}/month</div>
                </div>
                <div class="flex gap-2">
                  <button onclick="editStaffMaster('${s.__backendId}')" class="text-green-600 hover:text-green-800 text-xs" title="Edit">✏️</button>
                  <button onclick="deleteRecord('${s.__backendId}')" class="text-red-600 hover:text-red-800 text-xs" title="Delete">🗑️</button>
                </div>
              </div>
            </div>
          `).join('');
          
          // PAGINATION: Add controls
          const paginationHTML = createPaginationControls('staffMaster', staff.length);
          let paginationContainer = document.getElementById('staffMaster-pagination');
          if (!paginationContainer) {
            paginationContainer = document.createElement('div');
            paginationContainer.id = 'staffMaster-pagination';
            staffList.parentElement.appendChild(paginationContainer);
          }
          paginationContainer.innerHTML = paginationHTML;
        }
      }

      const salaryList = document.getElementById('staffSalaryList');
      if (salaryList) {
        if (salaryPayments.length === 0) {
          salaryList.innerHTML = '<tr><td colspan="3" class="text-center text-gray-500">No salary payments yet</td></tr>';
        } else {
          salaryList.innerHTML = salaryPayments.map(s => `
            <tr>
              <td>${s.salaryDate || 'N/A'}</td>
              <td>₹${(s.staffSalary || 0).toLocaleString()}</td>
              <td>${s.notes || 'N/A'}</td>
            </tr>
          `).join('');
        }
      }

      updateDataLists();
    }

    function updateDataLists() {
      const trucks = allRecords.filter(r => r.type === 'truck_master');
      const companies = allRecords.filter(r => r.type === 'company_master');
      const parties = allRecords.filter(r => r.type === 'party_master');
      const staff = allRecords.filter(r => r.type === 'staff_master');

      const truckSelect = document.getElementById('dailyTruckSelect');
      if (truckSelect) {
        truckSelect.innerHTML = '<option value="">Select Truck</option>' + 
          trucks.map(t => `<option value="${t.truckNumber}">${t.truckNumber} - ${t.truckOwner}</option>`).join('');
      }

      const companySelect = document.getElementById('dailyCompanySelect');
      if (companySelect) {
        companySelect.innerHTML = '<option value="">Select Company</option>' + 
          companies.map(c => `<option value="${c.companyName}">${c.companyName}</option>`).join('');
      }

      const partySelect = document.getElementById('dailyPartySelect');
      if (partySelect) {
        partySelect.innerHTML = '<option value="">Select Party</option>' + 
          parties.map(p => `<option value="${p.partyName}">${p.partyName}</option>`).join('');
      }

      const placedBySelect = document.getElementById('dailyPlacedBySelect');
      if (placedBySelect) {
        const companyTitle = window.elementSdk?.config?.company_title || defaultConfig.company_title;
        placedBySelect.innerHTML = `<option value="">Select Staff/Company</option>
          <option value="${companyTitle}">${companyTitle}</option>` + 
          staff.map(s => `<option value="${s.staffName}">${s.staffName}</option>`).join('');
      }
      
      // Populate Commission Taken By dropdown with same options as Placed By
      const commissionTakenBySelect = document.getElementById('commissionTakenBySelect');
      if (commissionTakenBySelect) {
        const companyTitle = window.elementSdk?.config?.company_title || defaultConfig.company_title;
        commissionTakenBySelect.innerHTML = `<option value="">Select</option>
          <option value="${companyTitle}">${companyTitle}</option>` + 
          staff.map(s => `<option value="${s.staffName}">${s.staffName}</option>`).join('');
      }
    }

    function updateReportsUI() {
      const tbody = document.getElementById('reportsList');
      
      if (!tbody) return; // Exit if table doesn't exist
      
      if (filteredRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="16" class="text-center text-gray-500">No data to display</td></tr>';
        
        const filteredCount = document.getElementById('filteredCount');
        if (filteredCount) filteredCount.textContent = '0';
        
        const filteredRevenue = document.getElementById('filteredRevenue');
        if (filteredRevenue) filteredRevenue.textContent = '₹0';
        
        const filteredProfit = document.getElementById('filteredProfit');
        if (filteredProfit) filteredProfit.textContent = '₹0';
        
        // Clear pagination
        const paginationContainer = document.getElementById('reports-pagination');
        if (paginationContainer) paginationContainer.innerHTML = '';
        
        return;
      }

      const revenue = filteredRecords.reduce((sum, r) => sum + (r.companyRate || 0), 0);
      const profit = filteredRecords.reduce((sum, r) => sum + calculateProfit(r), 0);

      // Calculate TDS for filtered records
      const tdsDeducted = allRecords.filter(r => 
        r.type === 'payment_entry' && 
        filteredRecords.some(fr => fr.__backendId === r.lrId)
      ).reduce((sum, p) => sum + (p.tdsDeducted || 0), 0);
      
      const filteredCount = document.getElementById('filteredCount');
      if (filteredCount) {
        filteredCount.textContent = filteredRecords.length;
      }
      
      const filteredRevenue = document.getElementById('filteredRevenue');
      if (filteredRevenue) {
        filteredRevenue.textContent = `₹${revenue.toLocaleString()}`;
      }
      
      const filteredProfit = document.getElementById('filteredProfit');
      if (filteredProfit) {
        filteredProfit.textContent = `₹${profit.toLocaleString()}`;
      }
      
      const filteredTDS = document.getElementById('filteredTDS');
      if (filteredTDS) {
        filteredTDS.textContent = `₹${tdsDeducted.toLocaleString()}`;
      }

      // PAGINATION: Get only current page data
      const paginatedRecords = getPaginatedData(filteredRecords, 'reports');
      const startIndex = (paginationState['reports'].currentPage - 1) * paginationState['reports'].itemsPerPage;

      tbody.innerHTML = paginatedRecords.map((record, index) => {
        const lrSentTo = record.lrSentTo || '-';
        const lrSentDate = record.lrSentDate || '-';
        const lrSentMethod = record.lrSentMethod || '-';
        const docketOrPerson = record.lrSentMethod === 'Courier' 
          ? (record.courierDocketNumber || '-')
          : (record.lrSentMethod === 'Self' ? (record.selfPersonName || '-') : '-');
        
        return `
        <tr>
          <td>${startIndex + index + 1}</td>
          <td>${record.date || record.lrDate || 'N/A'}</td>
          <td>${record.truckNumber || 'N/A'}</td>
          <td>${record.companyName || 'N/A'}</td>
          <td>${record.partyName || 'N/A'}</td>
          <td>${record.from || 'N/A'} → ${record.to || 'N/A'}</td>
          <td>₹${(record.truckRate || 0).toLocaleString()}</td>
          <td>₹${(record.companyRate || 0).toLocaleString()}</td>
          <td>₹${(record.commission || 0).toLocaleString()}</td>
          <td class="${calculateProfit(record) >= 0 ? 'profit-positive' : 'profit-negative'}">
            ₹${calculateProfit(record).toLocaleString()}
          </td>
          <td>${record.placedBy || 'N/A'}</td>
          <td>${lrSentTo}</td>
          <td>${lrSentDate}</td>
          <td>${lrSentMethod}</td>
          <td class="text-sm">${docketOrPerson}</td>
          <td><span class="status-badge ${getStatusClass(record.status)}">${record.status || 'Pending'}</span></td>
        </tr>
      `;
      }).join('');
      
      // PAGINATION: Add controls
      const paginationHTML = createPaginationControls('reports', filteredRecords.length);
      let paginationContainer = document.getElementById('reports-pagination');
      if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'reports-pagination';
        tbody.parentElement.parentElement.appendChild(paginationContainer);
      }
      paginationContainer.innerHTML = paginationHTML;
    }

    function getStatusClass(status) {
      if (!status) return 'status-pending';
      if (status.includes('Completed') || status.includes('Billed')) return 'status-billed';
      if (status.includes('Received')) return 'status-completed';
      return 'status-pending';
    }

    function deleteRecord(id) {
      const record = allRecords.find(r => r.__backendId === id);
      if (record) {
        recordToDelete = record;
        document.getElementById('deleteModal').classList.remove('hidden');
        document.getElementById('deleteModal').classList.add('flex');
      }
    }

    function viewDetails(id) {
      const record = allRecords.find(r => r.__backendId === id);
      if (record) {
        const details = Object.entries(record)
          .filter(([key]) => key !== '__backendId')
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 modal-overlay flex items-center justify-center z-50';
        modal.innerHTML = `
          <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[80%] overflow-y-auto">
            <h3 class="text-lg font-semibold mb-4">Record Details</h3>
            <pre class="text-sm bg-gray-50 p-4 rounded whitespace-pre-wrap">${details}</pre>
            <div class="mt-4 flex justify-end">
              <button onclick="this.closest('.modal-overlay').remove()" class="btn-primary">Close</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }
    }

    
    let currentDailyEntryForLR = null;
    
    function openLRManagement(entryId) {
      const entry = allRecords.find(r => r.__backendId === entryId && r.type === 'daily_register');
      if (!entry) return;
      
      currentDailyEntryForLR = entry;
      
      document.getElementById('selectedTruck').textContent = entry.truckNumber || 'N/A';
      document.getElementById('selectedRoute').textContent = `${entry.from || 'N/A'} → ${entry.to || 'N/A'}`;
      document.getElementById('selectedCompany').textContent = entry.companyName || 'N/A';
      
      updateLRListForEntry(entry);
      
      document.getElementById('lrManagementSection').classList.remove('hidden');
      document.getElementById('lrManagementSection').scrollIntoView({ behavior: 'smooth' });
    }
    
    function closeLRManagement() {
      document.getElementById('lrManagementSection').classList.add('hidden');
      document.getElementById('addLRForm').reset();
      currentDailyEntryForLR = null;
    }
    
    function updateLRListForEntry(entry) {
      const container = document.getElementById('lrListForEntry');
      
      if (!entry.lrs || entry.lrs.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500">No LRs added yet</p>';
        return;
      }
      
      container.innerHTML = entry.lrs.map((lr, index) => `
        <div class="bg-gray-50 p-3 rounded-lg flex justify-between items-start">
          <div class="flex-1">
            <div class="font-medium text-sm">
              ${lr.lrNumber}
              ${lr.lrType === 'To Pay' ? 
                '<span class="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full font-semibold">TO PAY</span>' : 
                '<span class="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-semibold">TO BE BILLED</span>'
              }
            </div>
            <div class="text-xs text-gray-600">Product: ${lr.productName} | Weight: ${lr.weight} kg${lr.quantity ? ` | Qty: ${lr.quantity}` : ''}${lr.lrRate ? ` | Rate: ₹${lr.lrRate.toLocaleString()}` : ''}</div>
            ${lr.lrNotes ? `<div class="text-xs text-gray-500 mt-1">${lr.lrNotes}</div>` : ''}
            ${lr.lrType === 'To Pay' ? '<div class="text-xs text-orange-600 mt-1">⚠️ No billing/payment tracking for this LR</div>' : ''}
          </div>
          <button onclick="removeLRFromEntry('${entry.__backendId}', ${index})" class="text-red-600 hover:text-red-800 text-xs ml-2">Remove</button>
        </div>
      `).join('');
    }
    
    async function removeLRFromEntry(entryId, lrIndex) {
      if (!confirm('Remove this LR from the entry?')) return;
      
      const entry = allRecords.find(r => r.__backendId === entryId);
      if (entry && entry.lrs) {
        entry.lrs.splice(lrIndex, 1);
        try {
          // Update in cloud
          const result = await window.dataSdk.update(entry);
          if (result.isOk) {
            updateLRListForEntry(entry);
            alert('LR removed successfully!');
          }
        } catch (e) {
          alert('Error removing LR: ' + e.message);
        }
      }
    }

    // View Record Function - Shows detailed view in modal
    function viewRecord(id) {
      const record = allRecords.find(r => r.__backendId === id);
      if (!record) return;
      
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 modal-overlay flex items-center justify-center z-50';
      
      const details = Object.entries(record)
        .filter(([key]) => !key.startsWith('__'))
        .map(([key, value]) => {
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return `<div class="flex justify-between py-2 border-b"><span class="font-semibold">${label}:</span><span>${value || 'N/A'}</span></div>`;
        }).join('');
      
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
          <h3 class="text-xl font-bold mb-4">Record Details</h3>
          <div class="space-y-1">${details}</div>
          <div class="mt-6 flex justify-end gap-3">
            <button onclick="this.closest('.modal-overlay').remove()" class="btn-secondary">Close</button>
            <button onclick="printRecord('${id}', '${record.type}')" class="btn-primary">Print</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    
    // Print Record Function
    function printRecord(id, type) {
      const record = allRecords.find(r => r.__backendId === id);
      if (!record) return;
      
      const printWindow = window.open('', '', 'height=600,width=800');
      printWindow.document.write('<html><head><title>Print Record</title>');
      printWindow.document.write('<style>body{font-family:Arial,sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;}td{padding:8px;border-bottom:1px solid #ddd;}.label{font-weight:bold;width:40%;}.header{text-align:center;margin-bottom:30px;}.title{font-size:24px;margin-bottom:10px;}</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write('<div class="header"><div class="title">South Gujrat Freight Carrier</div><div>' + type.replace('_', ' ').toUpperCase() + '</div></div>');
      printWindow.document.write('<table>');
      
      Object.entries(record).forEach(([key, value]) => {
        if (!key.startsWith('__')) {
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          printWindow.document.write(`<tr><td class="label">${label}</td><td>${value || 'N/A'}</td></tr>`);
        }
      });
      
      printWindow.document.write('</table>');
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    }
    
    // Edit Functions for each type
    function editDailyRegister(id) {
      const entry = allRecords.find(r => r.__backendId === id);
      if (!entry) {
        alert('Entry not found!');
        return;
      }
      
      // Show the form section first
      const formSection = document.getElementById('dailyRegisterFormSection');
      if (formSection && formSection.classList.contains('hidden')) {
        formSection.classList.remove('hidden');
        const toggleBtn = document.getElementById('toggleDailyFormBtn');
        if (toggleBtn) {
          toggleBtn.textContent = '✖️ Cancel';
          toggleBtn.classList.remove('btn-primary');
          toggleBtn.classList.add('btn-secondary');
        }
      }
      
      // Store the ID for update
      window.editingDailyRegisterId = id;
      
      // Get the form
      const form = document.getElementById('dailyRegisterForm');
      if (!form) return;
      
      // Populate all fields
      form.querySelector('[name="date"]').value = entry.date || '';
      form.querySelector('[name="truckNumber"]').value = entry.truckNumber || '';
      form.querySelector('[name="truckSize"]').value = entry.truckSize || '';
      form.querySelector('[name="companyName"]').value = entry.companyName || '';
      form.querySelector('[name="partyName"]').value = entry.partyName || '';
      form.querySelector('[name="from"]').value = entry.from || '';
      form.querySelector('[name="to"]').value = entry.to || '';
      form.querySelector('[name="bookingType"]').value = entry.bookingType || '';
      form.querySelector('[name="typeOfBooking"]').value = entry.typeOfBooking || '';
      form.querySelector('[name="placedBy"]').value = entry.placedBy || '';
      form.querySelector('[name="truckRate"]').value = entry.truckRate || '';
      form.querySelector('[name="companyRate"]').value = entry.companyRate || '';
      form.querySelector('[name="notes"]').value = entry.notes || '';
      
      // Handle commission fields
      const commissionCheckbox = document.getElementById('commissionApplicable');
      if (entry.commission && entry.commission > 0) {
        commissionCheckbox.checked = true;
        document.getElementById('commissionAmountField').classList.remove('hidden');
        document.getElementById('commissionTakenByField').classList.remove('hidden');
        document.getElementById('commissionStatusField').classList.remove('hidden');
        
        form.querySelector('[name="commission"]').value = entry.commission || '';
        form.querySelector('[name="commissionTakenBy"]').value = entry.commissionTakenBy || '';
        form.querySelector('[name="commissionStatus"]').value = entry.commissionStatus || 'Pending';
      } else {
        commissionCheckbox.checked = false;
        document.getElementById('commissionAmountField').classList.add('hidden');
        document.getElementById('commissionTakenByField').classList.add('hidden');
        document.getElementById('commissionStatusField').classList.add('hidden');
      }
      
      // Change submit button text to "Update Entry"
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.innerHTML = '<span class="flex items-center gap-2"><span>✏️ Update Entry</span></span>';
        submitBtn.classList.add('bg-orange-500', 'hover:bg-orange-600');
        submitBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
      }
      
      // Change Clear button to Cancel
      const resetBtn = form.querySelector('button[type="reset"]');
      if (resetBtn) {
        resetBtn.textContent = '❌ Cancel Edit';
        resetBtn.classList.add('bg-red-500', 'hover:bg-red-600', 'text-white');
        resetBtn.classList.remove('bg-gray-200', 'hover:bg-gray-300', 'text-gray-700');
      }
      
      // Scroll to form
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Show notification
      showInlineMessage('📝 Editing mode: Update the fields and click "Update Entry" button, or click "Cancel Edit" to abort.', 'info');
    }
    
    function cancelEditDailyRegister() {
      // Reset editing state
      window.editingDailyRegisterId = null;
      
      // Get the form
      const form = document.getElementById('dailyRegisterForm');
      if (!form) return;
      
      // Reset submit button
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.innerHTML = '<span class="flex items-center gap-2"><span>Add Entry</span></span>';
        submitBtn.classList.remove('bg-orange-500', 'hover:bg-orange-600');
        submitBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
      }
      
      // Reset clear button
      const resetBtn = form.querySelector('button[type="reset"]');
      if (resetBtn) {
        resetBtn.textContent = 'Clear';
        resetBtn.classList.remove('bg-red-500', 'hover:bg-red-600', 'text-white');
        resetBtn.classList.add('bg-gray-200', 'hover:bg-gray-300', 'text-gray-700');
      }
      
      // Hide commission fields
      document.getElementById('commissionAmountField').classList.add('hidden');
      document.getElementById('commissionTakenByField').classList.add('hidden');
      document.getElementById('commissionStatusField').classList.add('hidden');
      
      showInlineMessage('Edit cancelled. Form reset to add new entry mode.', 'info');
    }
    
    function editBookingLR(id) {
      const lr = allRecords.find(r => r.__backendId === id);
      if (!lr) {
        alert('LR not found');
        return;
      }
      
      // Show the form section first
      const formSection = document.getElementById('bookingLRFormSection');
      if (formSection && formSection.classList.contains('hidden')) {
        formSection.classList.remove('hidden');
        const toggleBtn = document.getElementById('toggleBookingLRBtn');
        if (toggleBtn) {
          toggleBtn.textContent = '✖️ Cancel';
          toggleBtn.classList.remove('btn-primary');
          toggleBtn.classList.add('btn-secondary');
        }
      }
      
      // Switch to LR Booking tab if not already there
      const currentTab = document.querySelector('.tab-content:not(.hidden)');
      if (currentTab && currentTab.id !== 'lr-creation-tab') {
        showTab('lr-creation');
      }
      
      // Scroll to form
      setTimeout(() => {
        const form = document.getElementById('lrForm');
        if (form) {
          // Populate all form fields
          form.lrNumber.value = lr.lrNumber || '';
          form.lrDate.value = lr.lrDate || '';
          form.truckNumber.value = lr.truckNumber || '';
          form.consignorName.value = lr.consignorName || '';
          form.consignorAddress.value = lr.consignorAddress || '';
          form.consignorGST.value = lr.consignorGST || '';
          form.consigneeName.value = lr.consigneeName || '';
          form.consigneeAddress.value = lr.consigneeAddress || '';
          form.consigneeGST.value = lr.consigneeGST || '';
          form.billingTo.value = lr.billingTo || '';
          form.companyName.value = lr.companyName || '';
          form.companyGST.value = lr.companyGST || '';
          form.from.value = lr.from || '';
          form.to.value = lr.to || '';
          form.productName.value = lr.productName || '';
          form.quantity.value = lr.quantity || 0;
          form.weight.value = lr.weight || 0;
          
          // Calculate rate per tonne from companyRate
          const weight = parseFloat(lr.weight) || 0;
          const companyRate = parseFloat(lr.companyRate) || 0;
          if (weight > 0) {
            const ratePerTonne = (companyRate / weight).toFixed(2);
            document.getElementById('lrRatePerTonne').value = ratePerTonne;
          }
          
          document.getElementById('lrTotalAmount').value = companyRate;
          form.advanceToDriver.value = lr.advanceToDriver || 0;
          form.hammaliCharges.value = lr.hammaliCharges || 0;
          form.otherDeductions.value = lr.otherDeductions || 0;
          form.paymentCategory.value = lr.paymentCategory || '';
          
          // Store the LR ID for updating instead of creating
          form.dataset.editingId = id;
          
          // Change submit button text
          const submitBtn = form.querySelector('button[type="submit"]');
          if (submitBtn) {
            submitBtn.textContent = 'Update LR';
            submitBtn.classList.add('bg-orange-500');
          }
          
          // Show cancel edit button
          const cancelBtn = document.getElementById('cancelEditLR');
          if (cancelBtn) {
            cancelBtn.classList.remove('hidden');
          }
          
          // Scroll to form
          form.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Disable daily register select since we're editing
          const dailySelect = document.getElementById('selectDailyEntry');
          if (dailySelect) {
            dailySelect.disabled = true;
            dailySelect.classList.add('opacity-50', 'cursor-not-allowed');
          }
        }
      }, 300);
    }
    
    function cancelEditBookingLR() {
      const form = document.getElementById('lrForm');
      if (form) {
        // Reset editing state
        delete form.dataset.editingId;
        form.reset();
        
        // Reset submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.textContent = 'Create LR';
          submitBtn.classList.remove('bg-orange-500');
        }
        
        // Hide cancel button
        const cancelBtn = document.getElementById('cancelEditLR');
        if (cancelBtn) {
          cancelBtn.classList.add('hidden');
        }
        
        // Re-enable daily register select
        const dailySelect = document.getElementById('selectDailyEntry');
        if (dailySelect) {
          dailySelect.disabled = false;
          dailySelect.classList.remove('opacity-50', 'cursor-not-allowed');
          dailySelect.value = '';
        }
      }
    }
    
    function editNonBookingLR(id) {
      const lr = allRecords.find(r => r.__backendId === id);
      if (!lr) {
        alert('LR not found');
        return;
      }
      
      // Show the form section first
      const formSection = document.getElementById('nonBookingLRFormSection');
      if (formSection && formSection.classList.contains('hidden')) {
        formSection.classList.remove('hidden');
        const toggleBtn = document.getElementById('toggleNonBookingLRBtn');
        if (toggleBtn) {
          toggleBtn.textContent = '✖️ Cancel';
          toggleBtn.classList.remove('btn-primary');
          toggleBtn.classList.add('btn-secondary');
        }
      }
      
      // Switch to Non-Booking LR tab if not already there
      const currentTab = document.querySelector('.tab-content:not(.hidden)');
      if (currentTab && currentTab.id !== 'non-booking-lr-tab') {
        showTab('non-booking-lr');
      }
      
      // Scroll to Non-Booking form
      setTimeout(() => {
        const form = document.getElementById('nonBookingLRForm');
        if (form) {
          // Populate all form fields
          form.lrNumber.value = lr.lrNumber || '';
          form.lrDate.value = lr.lrDate || '';
          form.truckNumber.value = lr.truckNumber || '';
          form.partyName.value = lr.partyName || '';
          form.from.value = lr.from || '';
          form.to.value = lr.to || '';
          form.productName.value = lr.productName || '';
          form.weight.value = lr.weight || 0;
          
          // Calculate rate per tonne from freightAmount
          const weight = parseFloat(lr.weight) || 0;
          const freightAmount = parseFloat(lr.freightAmount) || 0;
          if (weight > 0) {
            const ratePerTonne = (freightAmount / weight).toFixed(2);
            document.getElementById('nbLrRatePerTonne').value = ratePerTonne;
          }
          
          document.getElementById('nbLrTotalAmount').value = freightAmount;
          form.paymentCategory.value = lr.paymentCategory || '';
          form.notes.value = lr.notes || '';
          
          // Store the LR ID for updating instead of creating
          form.dataset.editingId = id;
          
          // Change submit button text
          const submitBtn = form.querySelector('button[type="submit"]');
          if (submitBtn) {
            submitBtn.textContent = 'Update Non-Booking LR';
            submitBtn.classList.add('bg-orange-500');
            submitBtn.classList.remove('bg-blue-500');
          }
          
          // Show cancel edit button (if exists)
          const cancelBtn = document.getElementById('cancelEditNonBookingLR');
          if (cancelBtn) {
            cancelBtn.classList.remove('hidden');
          }
          
          // Scroll to form
          form.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Disable daily register select since we're editing
          const dailySelect = document.getElementById('selectDailyEntryNonBooking');
          if (dailySelect) {
            dailySelect.disabled = true;
            dailySelect.classList.add('opacity-50', 'cursor-not-allowed');
          }
        }
      }, 300);
    }
    
    function editChallan(id) {
      const challan = allRecords.find(r => r.__backendId === id);
      if (!challan) {
        alert('Challan not found');
        return;
      }
      
      // Show the form section first
      const formSection = document.getElementById('challanFormSection');
      if (formSection && formSection.classList.contains('hidden')) {
        formSection.classList.remove('hidden');
        const toggleBtn = document.getElementById('toggleChallanBtn');
        if (toggleBtn) {
          toggleBtn.textContent = '✖️ Cancel';
          toggleBtn.classList.remove('btn-primary');
          toggleBtn.classList.add('btn-secondary');
        }
      }
      
      // Switch to Challan Book tab if not already there
      const currentTab = document.querySelector('.tab-content:not(.hidden)');
      if (currentTab && currentTab.id !== 'challan-book-tab') {
        showTab('challan-book');
      }
      
      // Scroll to Challan form
      setTimeout(() => {
        const form = document.getElementById('challanBookForm');
        if (form) {
          // Populate all form fields
          document.getElementById('challanNumber').value = challan.challanNumber || '';
          form.truckNumber.value = challan.truckNumber || '';
          form.date.value = challan.date || '';
          form.from.value = challan.from || '';
          form.to.value = challan.to || '';
          form.weight.value = challan.weight || 0;
          
          // Calculate rate per tonne from truckRate
          const weight = parseFloat(challan.weight) || 0;
          const truckRate = parseFloat(challan.truckRate) || 0;
          if (weight > 0) {
            const ratePerTonne = (truckRate / weight).toFixed(2);
            document.getElementById('challanRatePerTonne').value = ratePerTonne;
          }
          
          document.getElementById('challanTotalAmount').value = truckRate;
          form.advancePaidToOwner.value = challan.advancePaidToOwner || 0;
          form.balanceAmount.value = challan.balanceAmount || 0;
          form.challanDeductions.value = challan.challanDeductions || 0;
          form.commission.value = challan.commission || 0;
          form.commissionDeductedInChallan.checked = challan.commissionDeductedInChallan || false;
          form.hammaliCharges.value = challan.hammaliCharges || 0;
          form.otherDeductions.value = challan.otherDeductions || 0;
          form.remainingBalance.value = challan.remainingBalance || 0;
          form.notes.value = challan.notes || '';
          
          // Trigger calculations to ensure everything is updated
          calculateChallanTotal();
          
          // Store the Challan ID for updating instead of creating
          form.dataset.editingId = id;
          
          // Change submit button text
          const submitBtn = form.querySelector('button[type="submit"]');
          if (submitBtn) {
            submitBtn.textContent = 'Update Challan Entry';
            submitBtn.classList.add('bg-orange-500');
            submitBtn.classList.remove('bg-blue-500');
          }
          
          // Scroll to form
          form.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Disable daily register select since we're editing
          const dailySelect = document.getElementById('selectDailyForChallan');
          if (dailySelect) {
            dailySelect.disabled = true;
            dailySelect.classList.add('opacity-50', 'cursor-not-allowed');
          }
        }
      }, 300);
    }
    
    function editBill(id) {
      const bill = allRecords.find(r => r.__backendId === id);
      if (!bill) {
        alert('Bill not found!');
        return;
      }
      
      // Note: With the new multiple LR system, editing individual LRs is more appropriate
      // than editing the entire bill. This function now redirects to edit the LR itself.
      alert('To edit bill details, please edit the individual LR entries.\n\nBill Number: ' + bill.billNumber);
      
      // Optionally, you could implement full bill editing by:
      // 1. Finding all LRs with the same bill number
      // 2. Allowing user to edit common fields
      // 3. Updating all related LRs
      
      return;
    }
    
    async function deleteBill(id) {
      const bill = allRecords.find(r => r.__backendId === id);
      if (!bill) {
        alert('Bill not found!');
        return;
      }
      
      const billInfo = `Bill Number: ${bill.billNumber}\nLR Number: ${bill.lrNumber}\nAmount: ₹${bill.billAmount || 0}`;
      
      if (!confirm(`Are you sure you want to delete this bill?\n\n${billInfo}\n\nThis will remove billing information from the LR.`)) {
        return;
      }
      
      // Remove billing data from LR
      bill.billNumber = null;
      bill.billDate = null;
      bill.billAmount = null;
      bill.gstApplicable = false;
      bill.gstAmount = null;
      bill.status = 'LR Received'; // Reset status
      
      const result = await window.dataSdk.update(bill);
      if (result.isOk) {
        showInlineMessage('Bill deleted successfully!', 'success');
        updateBillsList();
      } else {
        alert('Failed to delete bill. Please try again.');
      }
    }
    
    // Edit Master Functions
    function editTruckMaster(id) {
      const record = allRecords.find(r => r.__backendId === id);
      if (!record) return;
      
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 modal-overlay flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <h3 class="text-xl font-bold mb-4">Edit Truck</h3>
          <form id="editTruckForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">Truck Number *</label>
              <input type="text" name="truckNumber" value="${record.truckNumber || ''}" required class="input-field w-full">
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Truck Owner *</label>
              <input type="text" name="truckOwner" value="${record.truckOwner || ''}" required class="input-field w-full">
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Driver Name</label>
              <input type="text" name="driverName" value="${record.driverName || ''}" class="input-field w-full">
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Driver Phone</label>
              <input type="text" name="driverPhone" value="${record.driverPhone || ''}" class="input-field w-full">
            </div>
            <div class="flex gap-3">
              <button type="submit" class="btn-primary flex-1">Save Changes</button>
              <button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
      
      document.getElementById('editTruckForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        record.truckNumber = formData.get('truckNumber');
        record.truckOwner = formData.get('truckOwner');
        record.driverName = formData.get('driverName');
        record.driverPhone = formData.get('driverPhone');
        
        const result = await window.dataSdk.update(record);
        if (result.isOk) {
          modal.remove();
          showInlineMessage('Truck updated successfully!', 'success');
        }
      });
    }
    
    function editCompanyMaster(id) {
      const record = allRecords.find(r => r.__backendId === id);
      if (!record) return;
      
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 modal-overlay flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <h3 class="text-xl font-bold mb-4">Edit Company</h3>
          <form id="editCompanyForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">Company Name *</label>
              <input type="text" name="companyName" value="${record.companyName || ''}" required class="input-field w-full">
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">GST Number</label>
              <input type="text" name="companyGST" value="${record.companyGST || ''}" class="input-field w-full">
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Address</label>
              <textarea name="companyAddress" class="input-field w-full" rows="2">${record.companyAddress || ''}</textarea>
            </div>
            <div class="flex gap-3">
              <button type="submit" class="btn-primary flex-1">Save Changes</button>
              <button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
      
      document.getElementById('editCompanyForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        record.companyName = formData.get('companyName');
        record.companyGST = formData.get('companyGST');
        record.companyAddress = formData.get('companyAddress');
        
        const result = await window.dataSdk.update(record);
        if (result.isOk) {
          modal.remove();
          showInlineMessage('Company updated successfully!', 'success');
        }
      });
    }
    
    function editPartyMaster(id) {
      const record = allRecords.find(r => r.__backendId === id);
      if (!record) return;
      
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 modal-overlay flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <h3 class="text-xl font-bold mb-4">Edit Party</h3>
          <form id="editPartyForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">Party Name *</label>
              <input type="text" name="partyName" value="${record.partyName || ''}" required class="input-field w-full">
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">GST Number</label>
              <input type="text" name="partyGST" value="${record.partyGST || ''}" class="input-field w-full">
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Address</label>
              <textarea name="partyAddress" class="input-field w-full" rows="2">${record.partyAddress || ''}</textarea>
            </div>
            <div class="flex gap-3">
              <button type="submit" class="btn-primary flex-1">Save Changes</button>
              <button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
      
      document.getElementById('editPartyForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        record.partyName = formData.get('partyName');
        record.partyGST = formData.get('partyGST');
        record.partyAddress = formData.get('partyAddress');
        
        const result = await window.dataSdk.update(record);
        if (result.isOk) {
          modal.remove();
          showInlineMessage('Party updated successfully!', 'success');
        }
      });
    }
    
    function editStaffMaster(id) {
      const record = allRecords.find(r => r.__backendId === id);
      if (!record) return;
      
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 modal-overlay flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <h3 class="text-xl font-bold mb-4">Edit Staff</h3>
          <form id="editStaffForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">Staff Name *</label>
              <input type="text" name="staffName" value="${record.staffName || ''}" required class="input-field w-full">
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Monthly Salary *</label>
              <input type="number" name="staffSalary" value="${record.staffSalary || 0}" required class="input-field w-full" step="0.01">
            </div>
            <div class="flex gap-3">
              <button type="submit" class="btn-primary flex-1">Save Changes</button>
              <button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
      
      document.getElementById('editStaffForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        record.staffName = formData.get('staffName');
        record.staffSalary = parseFloat(formData.get('staffSalary')) || 0;
        
        const result = await window.dataSdk.update(record);
        if (result.isOk) {
          modal.remove();
          showInlineMessage('Staff updated successfully!', 'success');
        }
      });
    }


    function updateStaffLedgerUI() {
      const staffSelect = document.getElementById('staffLedgerSelect');
      if (!staffSelect) return;
      
      staffSelect.addEventListener('change', function(e) {
        const staffName = e.target.value;
        if (!staffName) {
          document.getElementById('staffLedgerDetails').classList.add('hidden');
          return;
        }
        
        displayStaffLedger(staffName);
      });
    }
    
    function displayStaffLedger(staffName) {
      const detailsDiv = document.getElementById('staffLedgerDetails');
      if (detailsDiv) {
        detailsDiv.classList.remove('hidden');
      }
      
      const staffLedgerName = document.getElementById('staffLedgerName');
      if (staffLedgerName) {
        staffLedgerName.textContent = staffName;
      }
      
      // Commission taken by staff (excluding company commission)
      const commissionTransactions = allRecords.filter(r => 
        r.type === 'daily_register' && 
        r.commissionApplicable && 
        r.commissionTakenBy === staffName &&
        r.commissionTakenBy !== 'South Gujrat Freight Carrier'
      );
      
      const staff = allRecords.find(r => r.type === 'staff_master' && r.staffName === staffName);
      const salaryPayments = allRecords.filter(r => 
        r.type === 'salary_payment' && 
        r.staffName === staffName
      );
      
      // Commission taken = LOAN to staff (staff owes us)
      const totalCommissionLoan = commissionTransactions.reduce((sum, t) => sum + (t.commission || 0), 0);
      // Salary paid = what we paid to staff
      const totalSalaryPaid = salaryPayments.reduce((sum, p) => sum + (p.staffSalary || 0), 0);
      // Net Balance: Positive = Staff owes company, Negative = Company owes staff
      const netBalance = totalCommissionLoan - totalSalaryPaid;
      
      const staffTotalCommission = document.getElementById('staffTotalCommission');
      if (staffTotalCommission) {
        staffTotalCommission.textContent = "Rs." + totalCommissionLoan.toLocaleString();
      }
      
      const staffTotalSalary = document.getElementById('staffTotalSalary');
      if (staffTotalSalary) {
        staffTotalSalary.textContent = "Rs." + totalSalaryPaid.toLocaleString();
      }
      
      const staffNetBalanceElem = document.getElementById('staffNetBalance');
      if (staffNetBalanceElem) {
        staffNetBalanceElem.textContent = "Rs." + Math.abs(netBalance).toLocaleString();
      }
      
      // CORRECTED LOGIC: Positive balance = Staff owes company (loan), Negative = Company owes staff (overpaid)
      const balanceElem = document.getElementById('staffNetBalance');
      const balanceLabel = document.getElementById('staffBalanceLabel');
      
      if (balanceElem && balanceLabel) {
        if (netBalance > 0) {
          balanceElem.className = 'text-2xl font-bold text-green-600';
          balanceLabel.textContent = 'Staff Owes Company (Loan to Recover)';
        } else if (netBalance < 0) {
          balanceElem.className = 'text-2xl font-bold text-red-600';
          balanceLabel.textContent = 'Company Owes Staff (Advance Given)';
        } else {
          balanceElem.className = 'text-2xl font-bold text-gray-600';
          balanceLabel.textContent = 'Net Balance - Settled';
        }
      }
      
      const commissionList = document.getElementById('staffCommissionList');
      if (commissionList) {
        if (commissionTransactions.length === 0) {
          commissionList.innerHTML = '<tr><td colspan="5" class="text-center text-gray-500">No commission loans</td></tr>';
        } else {
          commissionList.innerHTML = commissionTransactions.map(t => {
            const statusClass = t.commissionStatus === 'Paid' ? 'status-completed' : 'status-pending';
            return '<tr><td>' + (t.date || 'N/A') + '</td><td>' + (t.truckNumber || 'N/A') + 
                   '</td><td>' + (t.from || 'N/A') + ' to ' + (t.to || 'N/A') + '</td><td>Rs.' + 
                   (t.commission || 0).toLocaleString() + '</td><td><span class="status-badge ' + 
                   statusClass + '">Loan</span></td></tr>';
          }).join('');
        }
      }
      
      const salaryList = document.getElementById('staffSalaryList');
      if (salaryList) {
        if (salaryPayments.length === 0) {
          salaryList.innerHTML = '<tr><td colspan="3" class="text-center text-gray-500">No salary payments</td></tr>';
        } else {
          salaryList.innerHTML = salaryPayments.map(p => 
            '<tr><td>' + (p.salaryDate || 'N/A') + '</td><td>Rs.' + 
            (p.staffSalary || 0).toLocaleString() + '</td><td>' + (p.notes || '-') + '</td></tr>'
          ).join('');
        }
      }
    }

    // Payment Tracking Functions
    function updatePaymentTrackingUI() {
      populatePaymentEntrySelect();
      updatePaymentSummary();
      updatePaymentTransactionsList();
      updatePaymentReconciliation();
      updatePendingPayments();
    }

    function populatePaymentEntrySelect() {
      populateReceivableEntries();
      populatePayableEntries();
      
      // Set default date to today
      const dateField = document.getElementById('paymentDate');
      if (dateField && !dateField.value) {
        const today = new Date().toISOString().split('T')[0];
        dateField.value = today;
      }
    }
    
    function populateReceivableEntries() {
      const select = document.getElementById('selectReceivableEntry');
      if (!select) return;

      const lrEntries = allRecords.filter(r => r.type === 'booking_lr' || r.type === 'non_booking_lr').sort((a, b) => 
        new Date(b.lrDate || 0) - new Date(a.lrDate || 0)
      );
      
      select.innerHTML = '<option value="">-- Select an entry --</option>';
      
      // Add LR entries only
      if (lrEntries.length > 0) {
        lrEntries.forEach(entry => {
          // Calculate outstanding for this LR
          const payments = allRecords.filter(r => 
            r.type === 'payment_transaction' && r.entryId === entry.__backendId
          );
          const totalReceived = payments
            .filter(p => p.paymentType === 'Advance from Company' || 
                        p.paymentType === 'Balance from Company' ||
                        p.paymentType === 'Advance from Party' || 
                        p.paymentType === 'Balance from Party')
            .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
          
          const totalAmount = entry.companyRate || 0;
          const outstanding = totalAmount - totalReceived;
          
          // Show all LR entries (even if fully paid, for reference)
          const option = document.createElement('option');
          option.value = entry.__backendId;
          option.dataset.type = 'lr';
          
          const statusIcon = outstanding > 0 ? '🔴' : '✅';
          option.textContent = `${statusIcon} LR: ${entry.lrNumber || 'N/A'} | ${entry.date || entry.lrDate || 'N/A'} | ${entry.truckNumber || 'N/A'} | ${entry.companyName || entry.partyName || 'N/A'} | Total: ₹${totalAmount.toLocaleString()} | Outstanding: ₹${outstanding.toLocaleString()}`;
          select.appendChild(option);
        });
      }
      
      if (lrEntries.length === 0) {
        const option = document.createElement('option');
        option.disabled = true;
        option.textContent = 'No LR entries available';
        select.appendChild(option);
      }
    }
    
    function populatePayableEntries() {
      const select = document.getElementById('selectPayableEntry');
      if (!select) return;

      const challanEntries = allRecords.filter(r => r.type === 'challan_book').sort((a, b) => 
        new Date(b.date || 0) - new Date(a.date || 0)
      );
      
      select.innerHTML = '<option value="">-- Select an entry --</option>';
      
      // Add Challan entries only
      if (challanEntries.length > 0) {
        challanEntries.forEach(entry => {
          // Calculate outstanding for this Challan
          const payments = allRecords.filter(r => 
            r.type === 'payment_transaction' && r.entryId === entry.__backendId
          );
          const totalPaid = payments
            .filter(p => p.paymentType === 'Advance to Owner' || 
                        p.paymentType === 'Balance to Owner')
            .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
          
          const remainingBalance = entry.remainingBalance || entry.truckRate || 0;
          const outstanding = remainingBalance - totalPaid;
          
          // Show all Challan entries (even if fully paid, for reference)
          const option = document.createElement('option');
          option.value = entry.__backendId;
          option.dataset.type = 'challan';
          
          const statusIcon = outstanding > 0 ? '🔴' : '✅';
          option.textContent = `${statusIcon} Challan: ${entry.challanNumber || entry.date || 'N/A'} | ${entry.truckNumber || 'N/A'} | ${entry.truckOwner || entry.partyName || 'N/A'} | Balance: ₹${remainingBalance.toLocaleString()} | Outstanding: ₹${outstanding.toLocaleString()}`;
          select.appendChild(option);
        });
      }
      
      if (challanEntries.length === 0) {
        const option = document.createElement('option');
        option.disabled = true;
        option.textContent = 'No Challan entries available';
        select.appendChild(option);
      }
    }
    
    function calculateOutstanding(entry, type) {
      const payments = allRecords.filter(r => 
        r.type === 'payment_transaction' && r.entryId === entry.__backendId
      );
      
      if (type === 'company') {
        const totalReceived = payments
          .filter(p => p.paymentType === 'Advance from Company' || p.paymentType === 'Balance from Company' || 
                      p.paymentType === 'Advance from Party' || p.paymentType === 'Balance from Party')
          .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
        return Math.max(0, (entry.companyRate || entry.freightAmount || 0) - totalReceived);
      } else if (type === 'owner') {
        const totalPaid = payments
          .filter(p => p.paymentType === 'Advance to Owner' || p.paymentType === 'Balance to Owner')
          .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
        return Math.max(0, (entry.truckRate || 0) - totalPaid);
      }
      return 0;
    }

    function updatePaymentSummary() {
      const payments = allRecords.filter(r => r.type === 'payment_transaction');
      
      let totalReceivables = 0;
      let totalPayables = 0;
      let totalAdvancesGiven = 0;
      let totalAdvancesReceived = 0;

      // Calculate from daily entries
      const dailyEntries = allRecords.filter(r => r.type === 'daily_register');
      dailyEntries.forEach(entry => {
        const companyRate = entry.companyRate || 0;
        const truckRate = entry.truckRate || 0;
        
        // Receivables (what we need to collect from company/party)
        totalReceivables += companyRate;
        
        // Payables (what we need to pay to truck owner)
        totalPayables += truckRate;
      });

      // Calculate advances from payments
      payments.forEach(payment => {
        const amount = payment.paymentAmount || 0;
        
        if (payment.paymentType === 'Advance from Company' || payment.paymentType === 'Advance from Party') {
          totalAdvancesReceived += amount;
        }
        if (payment.paymentType === 'Balance from Company' || payment.paymentType === 'Balance from Party') {
          totalReceivables -= amount; // Reduce receivables by balance received
        }
        if (payment.paymentType === 'Advance to Owner') {
          totalAdvancesGiven += amount;
        }
        if (payment.paymentType === 'Balance to Owner') {
          totalPayables -= amount; // Reduce payables by balance paid
        }
      });

      // Update dashboard cards
      document.getElementById('ptTotalReceivables').textContent = `₹${Math.max(0, totalReceivables).toLocaleString()}`;
      document.getElementById('ptTotalPayables').textContent = `₹${Math.max(0, totalPayables).toLocaleString()}`;
      document.getElementById('ptTotalAdvancesGiven').textContent = `₹${totalAdvancesGiven.toLocaleString()}`;
      document.getElementById('ptTotalAdvancesReceived').textContent = `₹${totalAdvancesReceived.toLocaleString()}`;
    }

    function updatePaymentTransactionsList() {
      const tbody = document.getElementById('paymentTransactionsList');
      if (!tbody) return;

      const payments = allRecords.filter(r => r.type === 'payment_transaction');

      if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="14" class="text-center text-gray-500">No payment transactions recorded yet</td></tr>';
        // Clear pagination
        const paginationContainer = document.getElementById('paymentTransactions-pagination');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
      }

      // PAGINATION: Get only current page data
      const paginatedPayments = getPaginatedData(payments, 'paymentTransactions');

      tbody.innerHTML = paginatedPayments.map(payment => {
        const statusClass = payment.ledgerStatus === 'Adjusted' ? 'status-completed' : 'status-pending';
        const adjustmentClass = payment.adjustmentStatus === 'Auto-Adjusted' ? 'text-green-600' : 
                               payment.adjustmentStatus === 'Manual-Adjusted' ? 'text-blue-600' : 'text-orange-600';
        
        return `
          <tr class="hover:bg-gray-50">
            <td class="text-sm">${payment.paymentDate || 'N/A'}</td>
            <td class="text-sm">
              <span class="font-semibold ${payment.paymentType?.includes('from') ? 'text-green-600' : 'text-red-600'}">
                ${payment.paymentType || 'N/A'}
              </span>
            </td>
            <td class="font-semibold text-sm">₹${(payment.paymentAmount || 0).toLocaleString()}</td>
            <td class="text-xs ${payment.tdsAmount > 0 ? 'text-red-600' : 'text-gray-400'}">
              ${payment.tdsAmount > 0 ? '₹' + payment.tdsAmount.toLocaleString() : '-'}
            </td>
            <td class="text-xs ${payment.gstAmount > 0 ? 'text-blue-600' : 'text-gray-400'}">
              ${payment.gstAmount > 0 ? '₹' + payment.gstAmount.toLocaleString() : '-'}
            </td>
            <td class="font-bold text-sm text-green-700">
              ₹${(payment.netAmount || payment.paymentAmount || 0).toLocaleString()}
            </td>
            <td class="text-xs">${payment.paymentMode || 'N/A'}</td>
            <td class="text-xs">${payment.paymentReference || '-'}</td>
            <td class="text-sm font-semibold">${payment.truckNumber || '-'}</td>
            <td class="text-xs">${payment.companyName || payment.partyName || '-'}</td>
            <td class="text-xs">${payment.paidByReceived || '-'}</td>
            <td class="text-xs ${adjustmentClass}">
              ${payment.adjustmentStatus || 'Pending'}
            </td>
            <td><span class="status-badge ${statusClass} text-xs">${payment.ledgerStatus || 'Pending'}</span></td>
            <td class="text-center">
              <div class="flex gap-1 justify-center">
                <button onclick="viewPaymentDetails('${payment.__backendId}')" 
                        class="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded border border-blue-300" 
                        title="View Details">👁️</button>
                <button onclick="deletePaymentTransaction('${payment.__backendId}')" 
                        class="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded border border-red-300" 
                        title="Delete">🗑️</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
      
      // PAGINATION: Add controls
      const paginationHTML = createPaginationControls('paymentTransactions', payments.length);
      let paginationContainer = document.getElementById('paymentTransactions-pagination');
      if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'paymentTransactions-pagination';
        tbody.parentElement.parentElement.appendChild(paginationContainer);
      }
      paginationContainer.innerHTML = paginationHTML;
    }
    
    function viewPaymentDetails(id) {
      const payment = allRecords.find(r => r.__backendId === id);
      if (!payment) {
        alert('Payment not found!');
        return;
      }
      
      const details = `
╔════════════════════════════════════════════════════════════╗
║              PAYMENT TRANSACTION DETAILS                   ║
╚════════════════════════════════════════════════════════════╝

📅 Payment Date: ${payment.paymentDate || 'N/A'}
💰 Payment Type: ${payment.paymentType || 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💵 FINANCIAL DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Gross Amount:     ₹${(payment.paymentAmount || 0).toLocaleString()}
  ${payment.tdsAmount ? `TDS (${payment.tdsPercentage}%):      -₹${payment.tdsAmount.toLocaleString()}` : ''}
  ${payment.gstAmount ? `GST (${payment.gstPercentage}%):      +₹${payment.gstAmount.toLocaleString()}` : ''}
  ───────────────────────────────────────────────
  Net Amount:       ₹${(payment.netAmount || payment.paymentAmount || 0).toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 PAYMENT METHOD:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mode:             ${payment.paymentMode || 'N/A'}
  Reference:        ${payment.paymentReference || 'N/A'}
  ${payment.bankName ? `Bank:             ${payment.bankName}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 PARTY DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Paid By/Received: ${payment.paidByReceived || 'N/A'}
  ${payment.contactNumber ? `Contact:          ${payment.contactNumber}` : ''}
  ${payment.panNumber ? `PAN:              ${payment.panNumber}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚛 LINKED ENTRY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Truck Number:     ${payment.truckNumber || 'N/A'}
  Company:          ${payment.companyName || 'N/A'}
  Party:            ${payment.partyName || 'N/A'}
  Route:            ${payment.from || 'N/A'} → ${payment.to || 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📒 LEDGER INFO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Adjustment Status: ${payment.adjustmentStatus || 'N/A'}
  Adjust Against:    ${payment.adjustAgainst || 'Auto'}
  Ledger Status:     ${payment.ledgerStatus || 'Pending'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 NOTES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${payment.paymentNotes || 'No additional notes'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 METADATA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Recorded By:      ${payment.recordedBy || 'Admin'}
  Created At:       ${new Date(payment.createdAt).toLocaleString()}
      `;
      
      alert(details);
    }

    function updatePaymentReconciliation() {
      const payments = allRecords.filter(r => r.type === 'payment_transaction');
      
      let companyAdvances = 0, companyBalance = 0;
      let partyAdvances = 0, partyBalance = 0;
      let ownerAdvances = 0, ownerBalance = 0;

      payments.forEach(payment => {
        const amount = payment.paymentAmount || 0;
        
        switch(payment.paymentType) {
          case 'Advance from Company':
            companyAdvances += amount;
            break;
          case 'Balance from Company':
            companyBalance += amount;
            break;
          case 'Advance from Party':
            partyAdvances += amount;
            break;
          case 'Balance from Party':
            partyBalance += amount;
            break;
          case 'Advance to Owner':
            ownerAdvances += amount;
            break;
          case 'Balance to Owner':
            ownerBalance += amount;
            break;
        }
      });

      document.getElementById('ptCompanyAdvances').textContent = `₹${companyAdvances.toLocaleString()}`;
      document.getElementById('ptCompanyBalance').textContent = `₹${companyBalance.toLocaleString()}`;
      document.getElementById('ptCompanyTotal').textContent = `₹${(companyAdvances + companyBalance).toLocaleString()}`;
      
      document.getElementById('ptPartyAdvances').textContent = `₹${partyAdvances.toLocaleString()}`;
      document.getElementById('ptPartyBalance').textContent = `₹${partyBalance.toLocaleString()}`;
      document.getElementById('ptPartyTotal').textContent = `₹${(partyAdvances + partyBalance).toLocaleString()}`;
      
      document.getElementById('ptOwnerAdvances').textContent = `₹${ownerAdvances.toLocaleString()}`;
      document.getElementById('ptOwnerBalance').textContent = `₹${ownerBalance.toLocaleString()}`;
      document.getElementById('ptOwnerTotal').textContent = `₹${(ownerAdvances + ownerBalance).toLocaleString()}`;
    }

    function updatePendingPayments() {
      // This function now just initializes the filter
      applyPendingPaymentsFilter();
    }
    
    function applyPendingPaymentsFilter() {
      const dailyEntries = allRecords.filter(r => r.type === 'daily_register');
      const payments = allRecords.filter(r => r.type === 'payment_transaction');
      
      // Get filter values
      const paymentTypeFilter = document.getElementById('pendingPaymentTypeFilter')?.value || 'all';
      const companyPartyFilter = (document.getElementById('pendingCompanyPartyFilter')?.value || '').toLowerCase().trim();
      const truckFilter = (document.getElementById('pendingTruckFilter')?.value || '').toLowerCase().trim();
      
      const pendingReceivables = [];
      const pendingPayables = [];

      dailyEntries.forEach(entry => {
        const entryId = entry.__backendId;
        
        // Find linked LR and Challan to get actual amounts
        const linkedLR = allRecords.find(r => 
          (r.type === 'booking_lr' || r.type === 'non_booking_lr') && 
          (r.dailyEntryId === entryId || r.dailyRegisterId === entryId)
        );
        
        const linkedChallan = allRecords.find(r => 
          r.type === 'challan_book' && 
          (r.dailyEntryId === entryId || r.dailyRegisterId === entryId)
        );
        
        // ALWAYS use LR amount if available, otherwise use daily register companyRate
        const companyTotalAmount = linkedLR ? (linkedLR.companyRate || 0) : (entry.companyRate || 0);
        
        // ALWAYS use Challan amount if available, otherwise use daily register truckRate
        const truckTotalAmount = linkedChallan ? (linkedChallan.truckRate || 0) : (entry.truckRate || 0);
        
        // Calculate received amount for this entry
        const receivedAmount = payments
          .filter(p => p.entryId === entryId && 
                      (p.paymentType === 'Advance from Company' || 
                       p.paymentType === 'Balance from Company' ||
                       p.paymentType === 'Advance from Party' || 
                       p.paymentType === 'Balance from Party'))
          .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
        
        const pendingReceivable = companyTotalAmount - receivedAmount;
        
        if (pendingReceivable > 0) {
          const companyName = entry.companyName || entry.partyName || '';
          const truckNumber = entry.truckNumber || '';
          
          // Apply filters
          const matchesCompanyParty = !companyPartyFilter || companyName.toLowerCase().includes(companyPartyFilter);
          const matchesTruck = !truckFilter || truckNumber.toLowerCase().includes(truckFilter);
          const matchesType = paymentTypeFilter === 'all' || paymentTypeFilter === 'receivables';
          
          if (matchesCompanyParty && matchesTruck && matchesType) {
            pendingReceivables.push({
              truck: truckNumber,
              company: companyName,
              date: entry.date,
              amount: pendingReceivable,
              from: entry.from || '',
              to: entry.to || '',
              lrNumber: linkedLR ? linkedLR.lrNumber : 'No LR',
              hasLR: !!linkedLR
            });
          }
        }

        // Calculate paid amount for this entry (use Challan remaining balance if available)
        const paidAmount = payments
          .filter(p => p.entryId === entryId && 
                      (p.paymentType === 'Advance to Owner' || 
                       p.paymentType === 'Balance to Owner'))
          .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
        
        // If challan exists, use remainingBalance - paidAmount, otherwise use truckRate - paidAmount
        let pendingPayable;
        if (linkedChallan) {
          pendingPayable = (linkedChallan.remainingBalance || 0) - paidAmount;
        } else {
          pendingPayable = truckTotalAmount - paidAmount;
        }
        
        if (pendingPayable > 0) {
          const owner = entry.truckOwner || 'N/A';
          const truckNumber = entry.truckNumber || '';
          const partyName = entry.partyName || entry.companyName || '';
          
          // Apply filters
          const matchesCompanyParty = !companyPartyFilter || 
                                     owner.toLowerCase().includes(companyPartyFilter) ||
                                     partyName.toLowerCase().includes(companyPartyFilter);
          const matchesTruck = !truckFilter || truckNumber.toLowerCase().includes(truckFilter);
          const matchesType = paymentTypeFilter === 'all' || paymentTypeFilter === 'payables';
          
          if (matchesCompanyParty && matchesTruck && matchesType) {
            pendingPayables.push({
              truck: truckNumber,
              owner: owner,
              party: partyName,
              date: entry.date,
              amount: pendingPayable,
              from: entry.from || '',
              to: entry.to || '',
              challanNumber: linkedChallan ? linkedChallan.challanNumber : 'No Challan',
              hasChallan: !!linkedChallan
            });
          }
        }
      });

      // Update receivables list
      const receivablesList = document.getElementById('filteredReceivablesList');
      if (!receivablesList) return;
      
      if (pendingReceivables.length === 0) {
        receivablesList.innerHTML = '<p class="text-sm text-gray-500">No receivables match the filter criteria</p>';
      } else {
        receivablesList.innerHTML = pendingReceivables.map(item => `
          <div class="bg-green-50 border border-green-200 rounded-lg p-3">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="font-semibold text-sm">${item.company}</div>
                <div class="text-xs text-gray-600 mt-1">
                  <div><strong>Truck:</strong> ${item.truck}</div>
                  <div><strong>LR Number:</strong> ${item.lrNumber}${!item.hasLR ? ' ⚠️' : ''}</div>
                  <div><strong>Route:</strong> ${item.from} → ${item.to}</div>
                  <div><strong>Date:</strong> ${item.date}</div>
                </div>
              </div>
              <div class="font-bold text-green-700">₹${item.amount.toLocaleString()}</div>
            </div>
          </div>
        `).join('');
      }

      // Update payables list
      const payablesList = document.getElementById('filteredPayablesList');
      if (!payablesList) return;
      
      if (pendingPayables.length === 0) {
        payablesList.innerHTML = '<p class="text-sm text-gray-500">No payables match the filter criteria</p>';
      } else {
        payablesList.innerHTML = pendingPayables.map(item => `
          <div class="bg-red-50 border border-red-200 rounded-lg p-3">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="font-semibold text-sm">${item.owner}</div>
                <div class="text-xs text-gray-600 mt-1">
                  <div><strong>Truck:</strong> ${item.truck}</div>
                  <div><strong>Challan Number:</strong> ${item.challanNumber}${!item.hasChallan ? ' ⚠️' : ''}</div>
                  ${item.party ? `<div><strong>Party:</strong> ${item.party}</div>` : ''}
                  <div><strong>Route:</strong> ${item.from} → ${item.to}</div>
                  <div><strong>Date:</strong> ${item.date}</div>
                </div>
              </div>
              <div class="font-bold text-red-700">₹${item.amount.toLocaleString()}</div>
            </div>
          </div>
        `).join('');
      }
      
      // Update results count
      const resultsCount = document.getElementById('pendingResultsCount');
      if (resultsCount) {
        const totalResults = pendingReceivables.length + pendingPayables.length;
        resultsCount.textContent = `${totalResults} result${totalResults !== 1 ? 's' : ''} (${pendingReceivables.length} receivables, ${pendingPayables.length} payables)`;
      }
    }

    async function deletePaymentTransaction(id) {
      if (!confirm('Are you sure you want to delete this payment transaction?')) return;
      
      const payment = allRecords.find(r => r.__backendId === id);
      if (payment) {
        const result = await window.dataSdk.delete(payment);
        if (result.isOk) {
          alert('Payment transaction deleted successfully!');
        }
      }
    }

    // Payment Filter Event Listeners
    const applyPaymentFiltersBtn = document.getElementById('applyPaymentFilters');
    if (applyPaymentFiltersBtn) {
      applyPaymentFiltersBtn.addEventListener('click', function() {
        // Filter functionality can be added here
        alert('Payment filters applied!');
      });
    }

    const clearPaymentFiltersBtn = document.getElementById('clearPaymentFilters');
    if (clearPaymentFiltersBtn) {
      clearPaymentFiltersBtn.addEventListener('click', function() {
        document.getElementById('filterPaymentType').value = '';
        document.getElementById('filterPaymentMode').value = '';
        document.getElementById('filterPaymentDateFrom').value = '';
        document.getElementById('filterPaymentDateTo').value = '';
        updatePaymentTrackingUI();
      });
    }

    // Payment Form Helper Functions
    function updatePaymentEntryDetails() {
      const selectElem = document.getElementById('selectPaymentEntry');
      const entryId = selectElem.value;
      const detailsDiv = document.getElementById('selectedPaymentEntryDetails');
      
      if (!entryId || entryId === 'UNLINKED') {
        detailsDiv.innerHTML = '<p class="text-gray-600">⚠️ This will be an unlinked payment with no automatic ledger adjustment.</p>';
        return;
      }
      
      const entry = allRecords.find(r => r.__backendId === entryId);
      if (!entry) {
        detailsDiv.innerHTML = '<p class="text-red-600">Entry not found!</p>';
        return;
      }
      
      // Calculate existing payments
      const existingPayments = allRecords.filter(r => 
        r.type === 'payment_transaction' && r.entryId === entryId
      );
      
      let detailsHTML = '<div class="space-y-2">';
      
      // Entry basic info
      detailsHTML += `<div class="flex justify-between border-b pb-1">
        <span class="font-semibold">Type:</span>
        <span class="text-blue-900">${entry.type || 'N/A'}</span>
      </div>`;
      
      detailsHTML += `<div class="flex justify-between border-b pb-1">
        <span class="font-semibold">Truck:</span>
        <span class="text-blue-900">${entry.truckNumber || 'N/A'}</span>
      </div>`;
      
      detailsHTML += `<div class="flex justify-between border-b pb-1">
        <span class="font-semibold">Route:</span>
        <span class="text-blue-900">${entry.from || 'N/A'} → ${entry.to || 'N/A'}</span>
      </div>`;
      
      if (entry.companyName) {
        detailsHTML += `<div class="flex justify-between border-b pb-1">
          <span class="font-semibold">Company:</span>
          <span class="text-blue-900">${entry.companyName}</span>
        </div>`;
      }
      
      if (entry.partyName) {
        detailsHTML += `<div class="flex justify-between border-b pb-1">
          <span class="font-semibold">Party:</span>
          <span class="text-blue-900">${entry.partyName}</span>
        </div>`;
      }
      
      // Financial details
      if (entry.type === 'daily_register') {
        const companyPayments = existingPayments.filter(p => 
          p.paymentType === 'Advance from Company' || p.paymentType === 'Balance from Company'
        ).reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
        
        const ownerPayments = existingPayments.filter(p => 
          p.paymentType === 'Advance to Owner' || p.paymentType === 'Balance to Owner'
        ).reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
        
        // Find linked LR and Challan to get total amounts
        const linkedLR = allRecords.find(r => 
          (r.type === 'booking_lr' || r.type === 'non_booking_lr') && 
          (r.dailyEntryId === entryId || r.dailyRegisterId === entryId)
        );
        
        const linkedChallan = allRecords.find(r => 
          r.type === 'challan_book' && 
          (r.dailyEntryId === entryId || r.dailyRegisterId === entryId)
        );
        
        // Use total amounts from LR and Challan if available, otherwise fall back to daily register rates
        const companyTotalAmount = linkedLR ? (linkedLR.companyRate || 0) : (entry.companyRate || 0);
        const truckTotalAmount = linkedChallan ? (linkedChallan.truckRate || 0) : (entry.truckRate || 0);
        
        const companyOutstanding = companyTotalAmount - companyPayments;
        
        detailsHTML += `<div class="mt-2 pt-2 border-t-2"><div class="font-semibold text-green-700 mb-1">💵 Receivables (Company):</div>`;
        
        // Show LR number if available
        if (linkedLR && linkedLR.lrNumber) {
          detailsHTML += `<div class="flex justify-between text-sm text-blue-700 mb-1">
            <span>📄 LR Number:</span>
            <span class="font-semibold">${linkedLR.lrNumber}</span>
          </div>`;
        }
        
        detailsHTML += `<div class="flex justify-between text-sm">
          <span>Total Amount ${linkedLR ? '(from LR)' : '(from Daily Register)'}:</span>
          <span class="font-semibold">₹${companyTotalAmount.toLocaleString()}</span>
        </div>`;
        
        if (!linkedLR) {
          detailsHTML += `<div class="text-xs text-orange-600 italic mt-1">⚠️ No LR found - using Daily Register amount</div>`;
        }
        
        detailsHTML += `<div class="flex justify-between text-sm">
          <span>Received:</span>
          <span class="text-green-600">₹${companyPayments.toLocaleString()}</span>
        </div>`;
        detailsHTML += `<div class="flex justify-between text-sm font-bold ${companyOutstanding > 0 ? 'text-orange-600' : 'text-green-600'}">
          <span>Outstanding:</span>
          <span>₹${companyOutstanding.toLocaleString()}</span>
        </div></div>`;
        
        // ENHANCED PAYABLES SECTION WITH CHALLAN DETAILS
        detailsHTML += `<div class="mt-2 pt-2 border-t-2"><div class="font-semibold text-red-700 mb-1">💸 Payables (Owner/Truck):</div>`;
        
        if (linkedChallan) {
          // Show Challan Number
          if (linkedChallan.challanNumber) {
            detailsHTML += `<div class="flex justify-between text-sm text-blue-700 mb-2">
              <span>📋 Challan Number:</span>
              <span class="font-semibold">${linkedChallan.challanNumber}</span>
            </div>`;
          }
          
          // Show detailed breakdown from Challan
          detailsHTML += `<div class="bg-red-50 p-3 rounded-lg mb-2 space-y-1">
            <div class="font-semibold text-xs text-gray-600 mb-1 uppercase">Challan Breakdown:</div>
            <div class="flex justify-between text-sm">
              <span>Total Truck Amount:</span>
              <span class="font-semibold">₹${truckTotalAmount.toLocaleString()}</span>
            </div>`;
          
          // Show Advance if any
          if (linkedChallan.advancePaidToOwner > 0) {
            detailsHTML += `<div class="flex justify-between text-xs text-gray-600">
              <span>− Advance Paid:</span>
              <span>₹${linkedChallan.advancePaidToOwner.toLocaleString()}</span>
            </div>`;
          }
          
          // Show all deductions
          let totalDeductions = 0;
          const deductionsList = [];
          
          if (linkedChallan.challanDeductions > 0) {
            deductionsList.push(`Challan Deductions: ₹${linkedChallan.challanDeductions.toLocaleString()}`);
            totalDeductions += linkedChallan.challanDeductions;
          }
          
          if (linkedChallan.commissionDeductedInChallan && linkedChallan.commission > 0) {
            deductionsList.push(`Commission: ₹${linkedChallan.commission.toLocaleString()}`);
            totalDeductions += linkedChallan.commission;
          }
          
          if (linkedChallan.hammaliCharges > 0) {
            deductionsList.push(`Hammali Charges: ₹${linkedChallan.hammaliCharges.toLocaleString()}`);
            totalDeductions += linkedChallan.hammaliCharges;
          }
          
          if (linkedChallan.otherDeductions > 0) {
            deductionsList.push(`Other Deductions: ₹${linkedChallan.otherDeductions.toLocaleString()}`);
            totalDeductions += linkedChallan.otherDeductions;
          }
          
          if (totalDeductions > 0) {
            detailsHTML += `<div class="flex justify-between text-xs text-gray-600">
              <span>− Total Deductions:</span>
              <span>₹${totalDeductions.toLocaleString()}</span>
            </div>`;
            detailsHTML += `<div class="text-xs text-gray-500 ml-4 mt-1">`;
            deductionsList.forEach(deduction => {
              detailsHTML += `<div>• ${deduction}</div>`;
            });
            detailsHTML += `</div>`;
          }
          
          // Show Challan Remaining Balance
          detailsHTML += `<div class="flex justify-between text-sm font-semibold text-red-700 border-t pt-1 mt-1">
            <span>Challan Remaining Balance:</span>
            <span>₹${(linkedChallan.remainingBalance || 0).toLocaleString()}</span>
          </div>`;
          
          detailsHTML += `</div>`;
          
          // Calculate what's actually paid through payment transactions
          detailsHTML += `<div class="flex justify-between text-sm mt-2">
            <span>Paid (via Transactions):</span>
            <span class="text-red-600">₹${ownerPayments.toLocaleString()}</span>
          </div>`;
          
          // Calculate final outstanding (Remaining Balance from Challan - Payments via Transactions)
          const finalOwnerOutstanding = (linkedChallan.remainingBalance || 0) - ownerPayments;
          
          detailsHTML += `<div class="flex justify-between text-sm font-bold ${finalOwnerOutstanding > 0 ? 'text-orange-600' : 'text-green-600'} border-t pt-1 mt-1">
            <span>Final Outstanding:</span>
            <span>₹${finalOwnerOutstanding.toLocaleString()}</span>
          </div>`;
          
        } else {
          // No challan found - show basic calculation
          const ownerOutstanding = truckTotalAmount - ownerPayments;
          
          detailsHTML += `<div class="flex justify-between text-sm">
            <span>Total Amount (from Daily Register):</span>
            <span class="font-semibold">₹${truckTotalAmount.toLocaleString()}</span>
          </div>`;
          detailsHTML += `<div class="text-xs text-orange-600 italic mt-1 mb-2">⚠️ No challan found - using Daily Register amount</div>`;
          detailsHTML += `<div class="flex justify-between text-sm">
            <span>Paid:</span>
            <span class="text-red-600">₹${ownerPayments.toLocaleString()}</span>
          </div>`;
          detailsHTML += `<div class="flex justify-between text-sm font-bold ${ownerOutstanding > 0 ? 'text-orange-600' : 'text-green-600'}">
            <span>Outstanding:</span>
            <span>₹${ownerOutstanding.toLocaleString()}</span>
          </div>`;
        }
        
        detailsHTML += `</div>`;
      }
      
      detailsHTML += '</div>';
      detailsDiv.innerHTML = detailsHTML;
    }
    
    function updateReceivableEntryDetails() {
      const select = document.getElementById('selectReceivableEntry');
      const entryId = select.value;
      const detailsDiv = document.getElementById('receivableEntryDetails');
      const contentDiv = document.getElementById('receivableDetailsContent');
      const hiddenInput = document.getElementById('selectPaymentEntry');
      const categoryInput = document.getElementById('selectedPaymentCategory');
      
      // Clear payable selection
      document.getElementById('selectPayableEntry').value = '';
      document.getElementById('payableEntryDetails').classList.add('hidden');
      
      if (!entryId) {
        detailsDiv.classList.add('hidden');
        hiddenInput.value = '';
        categoryInput.value = '';
        return;
      }
      
      detailsDiv.classList.remove('hidden');
      hiddenInput.value = entryId;
      categoryInput.value = 'receivable';
      
      const entry = allRecords.find(r => r.__backendId === entryId);
      if (!entry) {
        contentDiv.innerHTML = '<p class="text-red-600">Entry not found!</p>';
        return;
      }
      
      // Calculate outstanding
      const payments = allRecords.filter(r => 
        r.type === 'payment_transaction' && r.entryId === entryId
      );
      const totalReceived = payments
        .filter(p => p.paymentType === 'Advance from Company' || 
                    p.paymentType === 'Balance from Company' ||
                    p.paymentType === 'Advance from Party' || 
                    p.paymentType === 'Balance from Party')
        .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
      
      const totalAmount = entry.companyRate || 0;
      const outstanding = totalAmount - totalReceived;
      
      let html = '<div class="space-y-1">';
      html += `<div><strong>LR Number:</strong> ${entry.lrNumber || 'N/A'}</div>`;
      html += `<div><strong>Date:</strong> ${entry.date || entry.lrDate || 'N/A'}</div>`;
      html += `<div><strong>Truck:</strong> ${entry.truckNumber || 'N/A'}</div>`;
      html += `<div><strong>Route:</strong> ${entry.from || 'N/A'} → ${entry.to || 'N/A'}</div>`;
      html += `<div><strong>Company/Party:</strong> ${entry.companyName || entry.partyName || 'N/A'}</div>`;
      html += `<div class="mt-2 pt-2 border-t">`;
      html += `<div><strong class="text-green-700">Total Amount (from LR):</strong> ₹${totalAmount.toLocaleString()}</div>`;
      html += `<div><strong>Received:</strong> ₹${totalReceived.toLocaleString()}</div>`;
      html += `<div><strong class="${outstanding > 0 ? 'text-orange-600' : 'text-green-600'}">Outstanding:</strong> ₹${outstanding.toLocaleString()}</div>`;
      html += `</div>`;
      html += '</div>';
      
      contentDiv.innerHTML = html;
    }
    
    function updatePayableEntryDetails() {
      const select = document.getElementById('selectPayableEntry');
      const entryId = select.value;
      const detailsDiv = document.getElementById('payableEntryDetails');
      const contentDiv = document.getElementById('payableDetailsContent');
      const hiddenInput = document.getElementById('selectPaymentEntry');
      const categoryInput = document.getElementById('selectedPaymentCategory');
      
      // Clear receivable selection
      document.getElementById('selectReceivableEntry').value = '';
      document.getElementById('receivableEntryDetails').classList.add('hidden');
      
      if (!entryId) {
        detailsDiv.classList.add('hidden');
        hiddenInput.value = '';
        categoryInput.value = '';
        return;
      }
      
      detailsDiv.classList.remove('hidden');
      hiddenInput.value = entryId;
      categoryInput.value = 'payable';
      
      const entry = allRecords.find(r => r.__backendId === entryId);
      if (!entry) {
        contentDiv.innerHTML = '<p class="text-red-600">Entry not found!</p>';
        return;
      }
      
      // Calculate outstanding
      const payments = allRecords.filter(r => 
        r.type === 'payment_transaction' && r.entryId === entryId
      );
      const totalPaid = payments
        .filter(p => p.paymentType === 'Advance to Owner' || 
                    p.paymentType === 'Balance to Owner')
        .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
      
      const totalTruckAmount = entry.truckRate || 0;
      const remainingBalance = entry.remainingBalance || totalTruckAmount;
      const outstanding = remainingBalance - totalPaid;
      
      let html = '<div class="space-y-1">';
      html += `<div><strong>Challan Number:</strong> ${entry.challanNumber || 'N/A'}</div>`;
      html += `<div><strong>Date:</strong> ${entry.date || 'N/A'}</div>`;
      html += `<div><strong>Truck:</strong> ${entry.truckNumber || 'N/A'}</div>`;
      html += `<div><strong>Route:</strong> ${entry.from || 'N/A'} → ${entry.to || 'N/A'}</div>`;
      html += `<div><strong>Owner/Party:</strong> ${entry.truckOwner || entry.partyName || 'N/A'}</div>`;
      
      html += `<div class="mt-2 pt-2 border-t">`;
      html += `<div><strong class="text-red-700">Total Truck Amount:</strong> ₹${totalTruckAmount.toLocaleString()}</div>`;
      
      // Show deductions if any
      const advancePaid = entry.advancePaidToOwner || 0;
      const deductions = (entry.challanDeductions || 0) + 
                        (entry.commissionDeductedInChallan ? (entry.commission || 0) : 0) + 
                        (entry.hammaliCharges || 0) + 
                        (entry.otherDeductions || 0);
      
      if (advancePaid > 0 || deductions > 0) {
        html += `<div class="text-xs text-gray-600 mt-1">`;
        if (advancePaid > 0) {
          html += `<div>− Advance Paid: ₹${advancePaid.toLocaleString()}</div>`;
        }
        if (deductions > 0) {
          html += `<div>− Deductions: ₹${deductions.toLocaleString()}</div>`;
        }
        html += `</div>`;
      }
      
      html += `<div><strong class="text-red-700">Challan Remaining Balance:</strong> ₹${remainingBalance.toLocaleString()}</div>`;
      html += `<div><strong>Paid (via Transactions):</strong> ₹${totalPaid.toLocaleString()}</div>`;
      html += `<div><strong class="${outstanding > 0 ? 'text-orange-600' : 'text-green-600'}">Outstanding:</strong> ₹${outstanding.toLocaleString()}</div>`;
      html += `</div>`;
      html += '</div>';
      
      contentDiv.innerHTML = html;
    }
    
    function updatePaymentTypeFields() {
      const paymentType = document.getElementById('paymentType').value;
      const amountHint = document.getElementById('amountHint');
      
      if (paymentType.includes('Advance')) {
        amountHint.textContent = '💰 This is an advance payment (part payment before completion)';
      } else if (paymentType.includes('Balance')) {
        amountHint.textContent = '✅ This is a balance payment (final settlement)';
      } else {
        amountHint.textContent = 'Enter the payment amount';
      }
    }
    
    function updatePaymentModeFields() {
      const mode = document.getElementById('paymentMode').value;
      const bankField = document.getElementById('bankDetailsField');
      const refField = document.getElementById('referenceNumberField');
      
      if (mode === 'Bank Transfer' || mode === 'Cheque' || mode === 'DD') {
        bankField.classList.remove('hidden');
        refField.querySelector('input').required = true;
      } else {
        bankField.classList.add('hidden');
        refField.querySelector('input').required = false;
      }
    }
    
    function toggleTDSFields() {
      const checkbox = document.getElementById('tdsApplicable');
      const percentField = document.getElementById('tdsPercentageField');
      const amountField = document.getElementById('tdsAmountField');
      
      if (checkbox.checked) {
        percentField.classList.remove('hidden');
        amountField.classList.remove('hidden');
      } else {
        percentField.classList.add('hidden');
        amountField.classList.add('hidden');
        document.getElementById('tdsPercentage').value = '';
        document.getElementById('tdsAmount').value = '';
        calculateNetAmount();
      }
    }
    
    function toggleGSTFields() {
      const checkbox = document.getElementById('gstApplicable');
      const percentField = document.getElementById('gstPercentageField');
      const amountField = document.getElementById('gstAmountField');
      
      if (checkbox.checked) {
        percentField.classList.remove('hidden');
        amountField.classList.remove('hidden');
      } else {
        percentField.classList.add('hidden');
        amountField.classList.add('hidden');
        document.getElementById('gstPercentage').value = '';
        document.getElementById('gstAmount').value = '';
        calculateNetAmount();
      }
    }
    
    function calculateTDS() {
      const amount = parseFloat(document.getElementById('paymentAmount').value) || 0;
      const tdsPercent = parseFloat(document.getElementById('tdsPercentage').value) || 0;
      const tdsAmount = (amount * tdsPercent) / 100;
      document.getElementById('tdsAmount').value = tdsAmount.toFixed(2);
      calculateNetAmount();
    }
    
    function calculateGST() {
      const amount = parseFloat(document.getElementById('paymentAmount').value) || 0;
      const gstPercent = parseFloat(document.getElementById('gstPercentage').value) || 0;
      const gstAmount = (amount * gstPercent) / 100;
      document.getElementById('gstAmount').value = gstAmount.toFixed(2);
      calculateNetAmount();
    }
    
    function calculateNetAmount() {
      const amount = parseFloat(document.getElementById('paymentAmount').value) || 0;
      const tdsAmount = parseFloat(document.getElementById('tdsAmount').value) || 0;
      const gstAmount = parseFloat(document.getElementById('gstAmount').value) || 0;
      
      // Net = Gross - TDS + GST (for most cases)
      const netAmount = amount - tdsAmount + gstAmount;
      document.getElementById('netAmount').value = netAmount.toFixed(2);
    }
    
    function validatePaymentAmount() {
      calculateNetAmount();
      
      const amount = parseFloat(document.getElementById('paymentAmount').value) || 0;
      const entryId = document.getElementById('selectPaymentEntry').value;
      
      if (!entryId || entryId === 'UNLINKED') return;
      
      const entry = allRecords.find(r => r.__backendId === entryId);
      if (!entry) return;
      
      const existingPayments = allRecords.filter(r => 
        r.type === 'payment_transaction' && r.entryId === entryId
      );
      
      const paymentType = document.getElementById('paymentType').value;
      
      if (entry.type === 'daily_register') {
        if (paymentType.includes('Company')) {
          const totalReceived = existingPayments
            .filter(p => p.paymentType.includes('Company'))
            .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
          const outstanding = (entry.companyRate || 0) - totalReceived;
          
          if (amount > outstanding) {
            const amountHint = document.getElementById('amountHint');
            amountHint.textContent = `⚠️ Amount exceeds outstanding (₹${outstanding.toLocaleString()}). Overpayment will be recorded.`;
            amountHint.classList.add('text-orange-600');
          }
        } else if (paymentType.includes('Owner')) {
          const totalPaid = existingPayments
            .filter(p => p.paymentType.includes('Owner'))
            .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
          const outstanding = (entry.truckRate || 0) - totalPaid;
          
          if (amount > outstanding) {
            const amountHint = document.getElementById('amountHint');
            amountHint.textContent = `⚠️ Amount exceeds outstanding (₹${outstanding.toLocaleString()}). Overpayment will be recorded.`;
            amountHint.classList.add('text-orange-600');
          }
        }
      }
    }
    
    function resetPaymentForm() {
      document.getElementById('selectedPaymentEntryDetails').innerHTML = '<p class="text-gray-600">No entry selected. Select an entry above to see details and outstanding amounts.</p>';
      document.getElementById('bankDetailsField').classList.add('hidden');
      document.getElementById('tdsPercentageField').classList.add('hidden');
      document.getElementById('tdsAmountField').classList.add('hidden');
      document.getElementById('gstPercentageField').classList.add('hidden');
      document.getElementById('gstAmountField').classList.add('hidden');
    }
    
    function previewPaymentSummary() {
      const form = document.getElementById('paymentForm');
      const formData = new FormData(form);
      
      const summary = `
╔════════════════════════════════════════════╗
║     PAYMENT TRANSACTION PREVIEW            ║
╚════════════════════════════════════════════╝

📅 Date: ${formData.get('paymentDate') || 'Not set'}
💰 Amount: ₹${parseFloat(formData.get('paymentAmount') || 0).toLocaleString()}
📋 Type: ${formData.get('paymentType') || 'Not selected'}
💳 Mode: ${formData.get('paymentMode') || 'Not selected'}

👤 Party: ${formData.get('paidByReceived') || 'Not specified'}
📞 Contact: ${formData.get('contactNumber') || 'N/A'}

${formData.get('tdsApplicable') === 'on' ? '📊 TDS: ₹' + (parseFloat(formData.get('tdsAmount')) || 0).toLocaleString() : ''}
${formData.get('gstApplicable') === 'on' ? '📊 GST: ₹' + (parseFloat(formData.get('gstAmount')) || 0).toLocaleString() : ''}

💵 Net Amount: ₹${(parseFloat(formData.get('netAmount')) || parseFloat(formData.get('paymentAmount')) || 0).toLocaleString()}

📒 Adjustment: ${formData.get('adjustmentStatus') || 'Pending'}
📝 Notes: ${formData.get('paymentNotes') || 'None'}

────────────────────────────────────────────
Review the details and click "Record Payment"
if everything is correct.
      `;
      
      alert(summary);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
    
    // Professional Invoice Function
    function printProfessionalInvoice(billId) {
  // Find the bill record
  const bill = allRecords.find(r => r.__backendId === billId && (r.type === 'booking_lr' || r.type === 'non_booking_lr') && r.billNumber);

  if (!bill) {
    alert('Bill not found or invalid!');
    return;
  }

  // Extract bill data
  const billNumber = bill.billNumber || '';
  const billDate = bill.billDate || new Date().toISOString().split('T')[0];
  const billAmount = parseFloat(bill.billAmount) || 0;
  const gstAmount = parseFloat(bill.gstAmount) || 0;
  const totalAmount = billAmount + gstAmount;

  // Extract LR details
  const lrNumber = bill.lrNumber || '';
  const lrDate = bill.lrDate || bill.date || '';
  const truckNumber = bill.truckNumber || '';
  const productName = bill.productName || '';
  const fromLocation = bill.from || bill.fromLocation || bill.origin || '';
  const toLocation = bill.to || bill.toLocation || bill.destination || '';
  const weight = parseFloat(bill.weight) || 0;
  const rate = parseFloat(bill.companyRate || bill.freightAmount) || 0;
  const advance = parseFloat(bill.advanceToDriver || bill.advance) || 0;
  const hammali = parseFloat(bill.hammaliCharges) || 0;
  const halting = parseFloat(bill.haltingCharges) || 0;
  const companyHalting = parseFloat(bill.companyHaltingCharges) || 0;
  
  // Get party details
  const billingTo = bill.billingTo || 'Party';
  const partyName = bill.partyName || bill.consigneeName || bill.companyName || 'Customer';
  const partyAddress = bill.partyAddress || bill.consigneeAddress || '';
  const partyGST = bill.partyGST || bill.companyGST || '';
  
  // Calculate amounts
  const subtotal = billAmount;
  const totalWithCharges = totalAmount + companyHalting + hammali;
  const balance = totalWithCharges - advance;
  
  // Convert amount to words
  const amountInWords = numberToWords(Math.round(balance));
  
  // Get current date for printing
  const printDate = new Date().toLocaleDateString('en-IN');
  
  // Create print window
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  
  printWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - ${billNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    
    .invoice-container {
      max-width: 850px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }
    
    /* Header Section */
    .invoice-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 40px;
      position: relative;
      overflow: hidden;
    }
    
    .invoice-header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
    }
    
    .company-name {
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 2px;
      margin-bottom: 8px;
      text-transform: uppercase;
      position: relative;
    }

    .company-tagline {
      font-size: 14px;
      opacity: 0.9;
      font-style: italic;
      margin-bottom: 15px;
    }
    
    .company-details {
      font-size: 12px;
      line-height: 1.6;
      opacity: 0.95;
    }
    
    .company-details strong {
      font-weight: 600;
    }
    
    /* Invoice Title */
    .invoice-title-section {
      background: #f8f9fa;
      padding: 20px 40px;
      border-bottom: 3px solid #667eea;
    }

    .invoice-title {
      font-size: 28px;
      font-weight: 700;
      color: #2d3748;
      text-align: center;
      letter-spacing: 1px;
    }
    
    /* Bill Info Section */
    .bill-info-section {
      display: flex;
      padding: 30px 40px;
      gap: 40px;
      background: white;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .billing-party {
      flex: 1;
    }
    
    .invoice-meta {
      min-width: 280px;
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    
    .section-title {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 10px;
      letter-spacing: 1px;
    }
    
    .party-name {
      font-size: 18px;
      font-weight: 700;
      color: #2d3748;
      margin-bottom: 8px;
    }
    
    .party-details {
      font-size: 13px;
      color: #4a5568;
      line-height: 1.6;
    }
    
    .invoice-meta .meta-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .invoice-meta .meta-row:last-child {
      border-bottom: none;
    }
    
    .meta-label {
      font-size: 12px;
      color: #718096;
      font-weight: 600;
    }
    
    .meta-value {
      font-size: 13px;
      color: #2d3748;
      font-weight: 600;
    }
    
    /* Table Section */
    .table-section {
      padding: 0 40px 30px 40px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    
    thead {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    th {
      padding: 12px 8px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    th.center, td.center {
      text-align: center;
    }
    
    th.right, td.right {
      text-align: right;
    }
    
    tbody tr {
      border-bottom: 1px solid #e2e8f0;
    }
    
    tbody tr:hover {
      background: #f7fafc;
    }
    
    td {
      padding: 12px 8px;
      font-size: 13px;
      color: #2d3748;
    }
    
    .item-row td {
      font-weight: 500;
    }
    
    .additional-row {
      background: #f8f9fa;
    }
    
    .additional-row td {
      font-weight: 600;
      color: #667eea;
    }
    
    /* Totals Section */
    .totals-section {
      padding: 0 40px 30px 40px;
    }
    
    .totals-grid {
      display: flex;
      justify-content: flex-end;
      gap: 20px;
    }
    
    .totals-table {
      min-width: 350px;
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border: 2px solid #e2e8f0;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }
    
    .total-row.subtotal {
      border-bottom: 1px solid #cbd5e0;
    }
    
    .total-row.grand-total {
      border-top: 2px solid #667eea;
      padding-top: 12px;
      margin-top: 8px;
      font-size: 18px;
      font-weight: 700;
      color: #667eea;
    }
    
    .total-label {
      color: #4a5568;
      font-weight: 600;
    }
    
    .total-value {
      font-weight: 700;
      color: #2d3748;
    }
    
    .grand-total .total-value {
      color: #667eea;
    }
    
    /* Amount in Words */
    .amount-words-section {
      padding: 20px 40px;
      background: linear-gradient(to right, #f7fafc, #edf2f7);
      border-top: 2px solid #e2e8f0;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .amount-words-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }

    .amount-words-value {
      font-size: 15px;
      font-weight: 700;
      color: #2d3748;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* Bank Details */
    .bank-details-section {
      padding: 30px 40px;
      background: white;
    }
    
    .bank-details-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 15px;
    }
    
    .bank-detail-item {
      display: flex;
      gap: 10px;
    }
    
    .bank-detail-label {
      font-size: 12px;
      font-weight: 700;
      color: #718096;
      min-width: 140px;
    }
    
    .bank-detail-value {
      font-size: 13px;
      color: #2d3748;
      font-weight: 600;
    }
    
    /* Footer */
    .invoice-footer {
      padding: 25px 40px;
      background: #f8f9fa;
      border-top: 3px solid #667eea;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .footer-left {
      font-size: 12px;
      color: #718096;
    }

    .footer-right {
      text-align: right;
    }
    
    .signature-line {
      margin-top: 40px;
      padding-top: 10px;
      border-top: 2px solid #2d3748;
      font-size: 13px;
      font-weight: 600;
      color: #2d3748;
      width: 200px;
    }
    
    .authorized-sig {
      font-size: 11px;
      color: #718096;
      margin-top: 5px;
    }
    
    /* Print Styles */
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .invoice-container {
        box-shadow: none;
      }
      
      @page {
        margin: 0.5cm;
        size: A4;
      }
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .bill-info-section {
        flex-direction: column;
      }
      
      .invoice-meta {
        min-width: auto;
      }
      
      .bank-details-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    
    <!-- Header -->
    <div class="invoice-header">
      <div class="company-name">SOUTH GUJRAT FREIGHT CARRIER</div>
      <div class="company-tagline">Your Trusted Transportation Partner</div>
      <div class="company-details">
        <strong>Address:</strong> 851/1 Kelod Kartal, 6 Lane Highway, Tejaji Nagar, Indore - 452020, Madhya Pradesh<br>
        <strong>GST No:</strong> 23ABZPN6880F1Z1 | <strong>PAN:</strong> ABZPN6880F | <strong>Phone:</strong> +91-XXXXXXXXXX
      </div>
    </div>

    <!-- Invoice Title -->
    <div class="invoice-title-section">
      <div class="invoice-title">FREIGHT INVOICE</div>
    </div>
    
    <!-- Bill Info -->
    <div class="bill-info-section">
      <div class="billing-party">
        <div class="section-title">Bill To</div>
        <div class="party-name">${partyName}</div>
        <div class="party-details">
          ${partyAddress ? partyAddress + '<br>' : ''}
          ${partyGST ? '<strong>GST:</strong> ' + partyGST : ''}
        </div>
      </div>
      
      <div class="invoice-meta">
        <div class="meta-row">
          <span class="meta-label">Invoice No:</span>
          <span class="meta-value">${billNumber}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Invoice Date:</span>
          <span class="meta-value">${formatDate(billDate)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">LR Number:</span>
          <span class="meta-value">${lrNumber}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">LR Date:</span>
          <span class="meta-value">${formatDate(lrDate)}</span>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="table-section">
      <table>
        <thead>
          <tr>
            <th style="width: 40px;" class="center">S.No</th>
            <th style="width: 100px;">Truck No.</th>
            <th style="width: 120px;">Product</th>
            <th class="center">From</th>
            <th class="center">To</th>
            <th class="right" style="width: 80px;">Charged Wt (MT)</th>
            <th class="right" style="width: 80px;">Rate</th>
            <th class="right" style="width: 100px;">Freight</th>
          </tr>
        </thead>
        <tbody>
          <tr class="item-row">
            <td class="center">1</td>
            <td>${truckNumber}</td>
            <td>${productName}</td>
            <td class="center">${fromLocation}</td>
            <td class="center">${toLocation}</td>
            <td class="right">${weight.toFixed(2)}</td>
            <td class="right">₹${rate.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
            <td class="right">₹${subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
          </tr>
          ${hammali > 0 ? `
          <tr class="additional-row">
            <td colspan="7" style="text-align: right; padding-right: 10px;">Hammali Charges</td>
            <td class="right">₹${hammali.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
          </tr>
          ` : ''}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="totals-section">
      <div class="totals-grid">
        <div class="totals-table">
          <div class="total-row subtotal">
            <span class="total-label">Subtotal:</span>
            <span class="total-value">₹${subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
          </div>
          ${gstAmount > 0 ? `
          <div class="total-row">
            <span class="total-label">GST Amount:</span>
            <span class="total-value">₹${gstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
          </div>
          ` : ''}
          ${companyHalting > 0 ? `
          <div class="total-row">
            <span class="total-label">Halting Charges:</span>
            <span class="total-value">₹${companyHalting.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
          </div>
          ` : ''}
          ${hammali > 0 ? `
          <div class="total-row">
            <span class="total-label">Hammali:</span>
            <span class="total-value">₹${hammali.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
          </div>
          ` : ''}
          <div class="total-row">
            <span class="total-label">Total Freight:</span>
            <span class="total-value">₹${totalWithCharges.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
          </div>
          ${advance > 0 ? `
          <div class="total-row">
            <span class="total-label">Advance Paid:</span>
            <span class="total-value" style="color: #e53e3e;">- ₹${advance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
          </div>
          ` : ''}
          <div class="total-row grand-total">
            <span class="total-label">Balance Due:</span>
            <span class="total-value">₹${balance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Amount in Words -->
    <div class="amount-words-section">
      <div class="amount-words-label">Amount in Words</div>
      <div class="amount-words-value">${amountInWords} Rupees Only</div>
    </div>
    
    <!-- Bank Details -->
    <div class="bank-details-section">
      <div class="section-title">Bank Details for Payment</div>
      <div class="bank-details-grid">
        <div class="bank-detail-item">
          <span class="bank-detail-label">Bank Name:</span>
          <span class="bank-detail-value">Canara Bank</span>
        </div>
        <div class="bank-detail-item">
          <span class="bank-detail-label">Account Name:</span>
          <span class="bank-detail-value">South Gujrat Freight Carrier</span>
        </div>
        <div class="bank-detail-item">
          <span class="bank-detail-label">Account Number:</span>
          <span class="bank-detail-value">1476261002194</span>
        </div>
        <div class="bank-detail-item">
          <span class="bank-detail-label">IFSC Code:</span>
          <span class="bank-detail-value">CNRB0001476</span>
        </div>
        <div class="bank-detail-item">
          <span class="bank-detail-label">Branch:</span>
          <span class="bank-detail-value">Naulakha Branch, Indore</span>
        </div>
        <div class="bank-detail-item">
          <span class="bank-detail-label">PAN Number:</span>
          <span class="bank-detail-value">ABZPN6880F</span>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="invoice-footer">
      <div class="footer-left">
        <strong>Terms & Conditions:</strong><br>
        Payment is due within 30 days of invoice date.<br>
        This is a computer-generated invoice.
      </div>
      <div class="footer-right">
        <div class="signature-line">
          Authorized Signature
        </div>
        <div class="authorized-sig">For South Gujrat Freight Carrier</div>
      </div>
    </div>

  </div>
  
  <script>
    // Auto print when page loads
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  <\/script>
</body>
</html>
  `);
  
  printWindow.document.close();
}

/**
 * Format date to DD-MM-YYYY
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
}

/**
 * Convert number to words (Indian numbering system)
 */
function numberToWords(num) {
  if (num === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
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
  
  if (num < 0) return 'Minus ' + numberToWords(Math.abs(num));
  
  if (num < 1000) return convertThreeDigit(num);
  
  if (num < 100000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    return convertTwoDigit(thousands) + ' Thousand' + (remainder !== 0 ? ' ' + convertThreeDigit(remainder) : '');
  }
  
  if (num < 10000000) {
    const lakhs = Math.floor(num / 100000);
    const remainder = num % 100000;
    return convertTwoDigit(lakhs) + ' Lakh' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
  }
  
  const crores = Math.floor(num / 10000000);
  const remainder = num % 10000000;
  return convertTwoDigit(crores) + ' Crore' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
}

    // Delete All Data functionality with password protection
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    const deleteAllModal = document.getElementById('deleteAllModal');
    const deleteAllPassword = document.getElementById('deleteAllPassword');
    const cancelDeleteAll = document.getElementById('cancelDeleteAll');
    const confirmDeleteAll = document.getElementById('confirmDeleteAll');
    
    // Set your password here (you can change this to any password you want)
    // ⚠️ SECURITY WARNING: This password is visible in client-side code
    // For PRODUCTION use, implement server-side authentication via Firebase Auth
    // This is acceptable for DEMO/DEVELOPMENT only
    const ADMIN_PASSWORD = 'admin123'; // TODO: Move to server-side authentication // Change this to your desired password
    
    if (deleteAllBtn) {
      deleteAllBtn.addEventListener('click', function() {
        deleteAllModal.classList.remove('hidden');
        deleteAllModal.classList.add('flex');
        deleteAllPassword.value = '';
        deleteAllPassword.focus();
      });
    }
    
    if (cancelDeleteAll) {
      cancelDeleteAll.addEventListener('click', function() {
        deleteAllModal.classList.add('hidden');
        deleteAllModal.classList.remove('flex');
        deleteAllPassword.value = '';
      });
    }
    
    if (confirmDeleteAll) {
      confirmDeleteAll.addEventListener('click', async function() {
        const password = deleteAllPassword.value;
        
        if (!password) {
          alert('⚠️ Please enter a password');
          deleteAllPassword.focus();
          return;
        }
        
        if (password !== ADMIN_PASSWORD) {
          alert('❌ Incorrect password! Access denied.');
          deleteAllPassword.value = '';
          deleteAllPassword.focus();
          return;
        }
        
        // Extra confirmation
        const finalConfirm = confirm(
          '🚨 FINAL WARNING 🚨\n\n' +
          'This will DELETE ALL DATA from:\n' +
          '• Firebase Cloud Database\n' +
          '• Local Storage\n' +
          '• All Backups\n\n' +
          'Are you ABSOLUTELY SURE?\n\n' +
          'Type YES in the next prompt to proceed.'
        );
        
        if (!finalConfirm) {
          deleteAllModal.classList.add('hidden');
          deleteAllModal.classList.remove('flex');
          return;
        }
        
        const typeYes = prompt('Type "YES" in capital letters to confirm deletion:');
        
        if (typeYes !== 'YES') {
          alert('Deletion cancelled. Data is safe.');
          deleteAllModal.classList.add('hidden');
          deleteAllModal.classList.remove('flex');
          return;
        }
        
        // Show loading
        confirmDeleteAll.disabled = true;
        confirmDeleteAll.innerHTML = '<div class="loading-spinner inline-block mr-2"></div>Deleting...';
        
        try {
          // Delete from Firebase
          if (window.firebaseDB) {
            const { db, collection, getDocs, deleteDoc, doc } = window.firebaseDB;
            
            // Delete all collections
            const collections = ['records', 'parties', 'trucks', 'drivers', 'ledger', 'payments'];
            
            for (const collectionName of collections) {
              try {
                const querySnapshot = await getDocs(collection(db, collectionName));
                const deletePromises = querySnapshot.docs.map(document => 
                  deleteDoc(doc(db, collectionName, document.id))
                );
                await Promise.all(deletePromises);
                console.log(`✅ Deleted all documents from ${collectionName}`);
              } catch (error) {
                console.error(`Error deleting ${collectionName}:`, error);
              }
            }
          }
          
          // Clear all localStorage
          localStorage.clear();
          
          // Clear sessionStorage
          sessionStorage.clear();
          
          // Show success message
          alert(
            '✅ ALL DATA DELETED SUCCESSFULLY!\n\n' +
            'The following has been removed:\n' +
            '• All Firebase data\n' +
            '• All local storage\n' +
            '• All session data\n\n' +
            'You will now be logged out.'
          );
          
          // Redirect to login
          window.location.href = 'index.html';
          
        } catch (error) {
          console.error('Error deleting data:', error);
          alert('❌ Error deleting data: ' + error.message);
          confirmDeleteAll.disabled = false;
          confirmDeleteAll.innerHTML = '<svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Delete Everything';
        }
      });
    }
    
    // Close modal on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && deleteAllModal && !deleteAllModal.classList.contains('hidden')) {
        deleteAllModal.classList.add('hidden');
        deleteAllModal.classList.remove('flex');
        deleteAllPassword.value = '';
      }
    });
    
    // Allow Enter key to submit
    if (deleteAllPassword) {
      deleteAllPassword.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          confirmDeleteAll.click();
        }
      });
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to logout?')) {
          localStorage.removeItem('sgfc_user');
          window.location.href = 'index.html';
        }
      });
    }
// ============================================================================
// ENHANCED DAILY REGISTER - JavaScript Additions
// Add this code to the END of your dashboard-main.js file
// ============================================================================

// Global variables for enhanced daily register
let companyIndexCounter = 1;
let deliveryCityCounter = 1;

// ============================================================================
// INITIALIZATION FUNCTIONS
// ============================================================================

// Initialize enhanced daily register - call this in your main initialization
function initializeEnhancedDailyRegister() {
  console.log('Initializing Enhanced Daily Register...');
  
  // Delivery Type Selection
  const deliveryTypeSelect = document.getElementById('deliveryTypeSelect');
  if (deliveryTypeSelect) {
    deliveryTypeSelect.addEventListener('change', handleDeliveryTypeChange);
  }
  
  // Commission checkbox - update the existing listener
  const commissionCheckbox = document.getElementById('commissionApplicable');
  if (commissionCheckbox) {
    // Remove old listener and add new one
    const newCheckbox = commissionCheckbox.cloneNode(true);
    commissionCheckbox.parentNode.replaceChild(newCheckbox, commissionCheckbox);
    newCheckbox.addEventListener('change', handleCommissionToggleEnhanced);
  }
  
  // Populate company selects for the first entry
  populateCompanySelects();
  
  console.log('Enhanced Daily Register initialized');
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

// Handle delivery type change
function handleDeliveryTypeChange(e) {
  const deliveryType = e.target.value;
  const additionalSection = document.getElementById('additionalDeliveriesSection');
  
  if (deliveryType === 'multiple') {
    additionalSection.classList.remove('hidden');
  } else {
    additionalSection.classList.add('hidden');
    // Clear all delivery cities when switching to single
    document.getElementById('deliveryCitiesList').innerHTML = '';
    deliveryCityCounter = 1;
  }
}

// Handle commission toggle - enhanced version
function handleCommissionToggleEnhanced(e) {
  const commissionFields = document.getElementById('commissionFields');
  
  if (e.target.checked) {
    commissionFields.classList.remove('hidden');
  } else {
    commissionFields.classList.add('hidden');
    // Reset commission fields
    const commissionInput = commissionFields.querySelector('input[name="commission"]');
    if (commissionInput) commissionInput.value = '0';
  }
}

// ============================================================================
// DELIVERY CITY FUNCTIONS
// ============================================================================

// Add a new delivery city
function addDeliveryCity() {
  const deliveryCitiesList = document.getElementById('deliveryCitiesList');
  const cityIndex = deliveryCityCounter++;
  
  const cityDiv = document.createElement('div');
  cityDiv.className = 'delivery-city-item';
  cityDiv.setAttribute('data-city-index', cityIndex);
  cityDiv.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="flex-1">
        <label class="block text-xs font-medium text-gray-700 mb-1">Delivery City #${cityIndex}</label>
        <input 
          type="text" 
          name="deliveryCities[${cityIndex}]" 
          required 
          class="input-field w-full" 
          placeholder="Enter city name"
        >
      </div>
      <button 
        type="button" 
        onclick="removeDeliveryCity(${cityIndex})" 
        class="mt-5 bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 text-sm"
      >
        ✖️ Remove
      </button>
    </div>
  `;
  
  deliveryCitiesList.appendChild(cityDiv);
}

// Remove a delivery city
function removeDeliveryCity(cityIndex) {
  const cityDiv = document.querySelector(`[data-city-index="${cityIndex}"]`);
  if (cityDiv) {
    cityDiv.remove();
  }
}

// ============================================================================
// COMPANY ENTRY FUNCTIONS
// ============================================================================

// Add a new company entry
function addCompanyEntry() {
  const companiesContainer = document.getElementById('companiesContainer');
  const companyIndex = companyIndexCounter++;
  
  const companyDiv = document.createElement('div');
  companyDiv.className = 'company-item';
  companyDiv.setAttribute('data-company-index', companyIndex);
  companyDiv.innerHTML = `
    <button 
      type="button" 
      onclick="removeCompanyEntry(${companyIndex})" 
      class="remove-btn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
    >
      ✖️ Remove
    </button>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
        <select name="companies[${companyIndex}][name]" required class="input-field w-full company-select" data-index="${companyIndex}">
          <option value="">Select Company</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Company Rate *</label>
        <input 
          type="number" 
          name="companies[${companyIndex}][rate]" 
          required 
          class="input-field w-full" 
          placeholder="0" 
          step="0.01"
        >
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Destination City *</label>
        <input 
          type="text" 
          name="companies[${companyIndex}][location]" 
          required 
          class="input-field w-full" 
          placeholder="Delivery City"
        >
      </div>
    </div>
  `;
  
  companiesContainer.appendChild(companyDiv);
  
  // Populate the new company select
  populateCompanySelect(companyIndex);
}

// Remove a company entry
function removeCompanyEntry(companyIndex) {
  const companyDiv = document.querySelector(`[data-company-index="${companyIndex}"]`);
  if (companyDiv) {
    companyDiv.remove();
  }
}

// Populate all company selects
function populateCompanySelects() {
  const companySelects = document.querySelectorAll('.company-select');
  companySelects.forEach(select => {
    const index = select.getAttribute('data-index');
    populateCompanySelect(index);
  });
}

// Populate a specific company select
function populateCompanySelect(index) {
  const select = document.querySelector(`.company-select[data-index="${index}"]`);
  if (!select) return;
  
  // Get companies from allRecords (assuming it's available globally)
  const companies = allRecords.filter(r => r.type === 'company_master');
  
  // Clear existing options except the first one
  select.innerHTML = '<option value="">Select Company</option>';
  
  // Add company options
  companies.forEach(company => {
    const option = document.createElement('option');
    option.value = company.companyName;
    option.textContent = company.companyName;
    select.appendChild(option);
  });
}

// ============================================================================
// FORM SUBMISSION - ENHANCED VERSION
// ============================================================================

// Store the original function if it exists
const originalHandleDailyRegisterSubmit = window.handleDailyRegisterSubmit;

// Enhanced daily register form submission
async function handleDailyRegisterSubmit(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const isEditing = window.editingDailyRegisterId;
  
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="loading-spinner inline-block mr-2"></span>${isEditing ? 'Updating...' : 'Saving...'}`;
  }
  
  const formData = new FormData(e.target);
  
  // Collect companies data
  const companies = [];
  const companyDivs = document.querySelectorAll('#companiesContainer .company-item');
  
  companyDivs.forEach((div, idx) => {
    const companyIndex = div.getAttribute('data-company-index') || idx;
    const name = formData.get(`companies[${companyIndex}][name]`);
    const rate = formData.get(`companies[${companyIndex}][rate]`);
    const location = formData.get(`companies[${companyIndex}][location]`);
    
    if (name && rate && location) {
      companies.push({
        name: name,
        rate: parseFloat(rate) || 0,
        location: location
      });
    }
  });
  
  // Validate at least one company
  if (companies.length === 0) {
    alert('Please add at least one company with rate and destination.');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="flex items-center gap-2"><span>Add Entry</span></span>';
    }
    return;
  }
  
  // Collect delivery cities (if multiple delivery)
  const deliveryType = formData.get('deliveryType');
  const deliveryCities = [];
  
  if (deliveryType === 'multiple') {
    const cityInputs = document.querySelectorAll('#deliveryCitiesList input[name^="deliveryCities"]');
    cityInputs.forEach(input => {
      if (input.value.trim()) {
        deliveryCities.push(input.value.trim());
      }
    });
  }
  
  // Commission data
  const commissionApplicable = formData.get('commissionApplicable') === 'on';
  const commissionAmount = commissionApplicable ? (parseFloat(formData.get('commission')) || 0) : 0;
  
  // Calculate total company rate (sum of all company rates)
  const totalCompanyRate = companies.reduce((sum, company) => sum + company.rate, 0);
  
  let result;
  
  if (isEditing) {
    // UPDATE existing entry
    const existingEntry = allRecords.find(r => r.__backendId === isEditing);
    if (existingEntry) {
      const data = { ...existingEntry };
      
      // Update basic fields
      data.date = formData.get('date');
      data.truckNumber = formData.get('truckNumber');
      data.truckSize = formData.get('truckSize');
      data.partyName = formData.get('partyName') || '';
      data.from = formData.get('from');
      data.bookingType = formData.get('bookingType');
      data.typeOfBooking = formData.get('typeOfBooking');
      data.placedBy = formData.get('placedBy');
      data.truckRate = parseFloat(formData.get('truckRate')) || 0;
      
      // Update new fields
      data.deliveryType = deliveryType;
      data.deliveryCities = deliveryCities;
      data.companies = companies;
      data.companyRate = totalCompanyRate;
      
      // Use first company's name and location for backward compatibility
      if (companies.length > 0) {
        data.companyName = companies[0].name;
        data.to = companies[0].location;
      }
      
      // Update commission
      data.commissionApplicable = commissionApplicable;
      data.commission = commissionAmount;
      data.commissionTakenBy = formData.get('commissionTakenBy') || '';
      data.commissionStatus = formData.get('commissionStatus') || 'Paid';
      data.notes = formData.get('notes') || '';
      data.updatedAt = new Date().toISOString();
      
      result = await window.dataSdk.update(data);
    } else {
      result = { isOk: false };
    }
  } else {
    // CREATE new entry
    const data = {
      type: 'daily_register',
      date: formData.get('date'),
      truckNumber: formData.get('truckNumber'),
      truckSize: formData.get('truckSize'),
      partyName: formData.get('partyName') || '',
      from: formData.get('from'),
      bookingType: formData.get('bookingType'),
      typeOfBooking: formData.get('typeOfBooking'),
      placedBy: formData.get('placedBy'),
      truckRate: parseFloat(formData.get('truckRate')) || 0,
      deliveryType: deliveryType,
      deliveryCities: deliveryCities,
      companies: companies,
      companyRate: totalCompanyRate,
      commissionApplicable: commissionApplicable,
      commission: commissionAmount,
      commissionTakenBy: formData.get('commissionTakenBy') || '',
      commissionStatus: formData.get('commissionStatus') || 'Paid',
      notes: formData.get('notes') || '',
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __backendId: 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    };
    
    // For backward compatibility
    if (companies.length > 0) {
      data.companyName = companies[0].name;
      data.to = companies[0].location;
    }
    
    result = await window.dataSdk.create(data);
  }
  
  // Handle result
  if (result.isOk) {
    showInlineMessage(
      isEditing ? '✅ Entry updated successfully!' : '✅ Entry added successfully!',
      'success'
    );
    
    // Reset form
    e.target.reset();
    resetFormToAddMode();
    
    // Reset company counter and clear additional companies
    companyIndexCounter = 1;
    const companiesContainer = document.getElementById('companiesContainer');
    const companyItems = companiesContainer.querySelectorAll('.company-item:not(.first-company)');
    companyItems.forEach(item => item.remove());
    
    // Repopulate first company select
    populateCompanySelects();
    
    // Reset delivery cities
    deliveryCityCounter = 1;
    document.getElementById('deliveryCitiesList').innerHTML = '';
    document.getElementById('additionalDeliveriesSection').classList.add('hidden');
    
    // Hide commission fields
    document.getElementById('commissionFields').classList.add('hidden');
  } else {
    showInlineMessage('❌ Failed to save entry. Please try again.', 'error');
  }
  
  // Re-enable submit button
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span class="flex items-center gap-2"><span>Add Entry</span></span>';
  }
}

// ============================================================================
// FORM RESET AND EDIT FUNCTIONS
// ============================================================================

// Reset form to add mode after editing
function resetFormToAddMode() {
  window.editingDailyRegisterId = null;
  
  const form = document.getElementById('dailyRegisterForm');
  if (!form) return;
  
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.innerHTML = '<span class="flex items-center gap-2"><span>Add Entry</span></span>';
    submitBtn.classList.remove('bg-orange-500', 'hover:bg-orange-600');
    submitBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
  }
  
  const resetBtn = form.querySelector('button[type="reset"]');
  if (resetBtn) {
    resetBtn.textContent = 'Clear';
    resetBtn.classList.remove('bg-red-500', 'hover:bg-red-600', 'text-white');
    resetBtn.classList.add('bg-gray-200', 'hover:bg-gray-300', 'text-gray-700');
  }
}

// Edit daily register with enhanced fields
function editDailyRegister(id) {
  const entry = allRecords.find(r => r.__backendId === id);
  if (!entry) {
    alert('Entry not found!');
    return;
  }
  
  // Show the form section
  const formSection = document.getElementById('dailyRegisterFormSection');
  if (formSection && formSection.classList.contains('hidden')) {
    formSection.classList.remove('hidden');
    const toggleBtn = document.getElementById('toggleDailyFormBtn');
    if (toggleBtn) {
      toggleBtn.textContent = '✖️ Cancel';
      toggleBtn.classList.remove('btn-primary');
      toggleBtn.classList.add('btn-secondary');
    }
  }
  
  window.editingDailyRegisterId = id;
  
  const form = document.getElementById('dailyRegisterForm');
  if (!form) return;
  
  // Populate basic fields
  form.querySelector('[name="date"]').value = entry.date || '';
  form.querySelector('[name="truckNumber"]').value = entry.truckNumber || '';
  form.querySelector('[name="truckSize"]').value = entry.truckSize || '';
  form.querySelector('[name="partyName"]').value = entry.partyName || '';
  form.querySelector('[name="from"]').value = entry.from || '';
  form.querySelector('[name="bookingType"]').value = entry.bookingType || '';
  form.querySelector('[name="typeOfBooking"]').value = entry.typeOfBooking || '';
  form.querySelector('[name="placedBy"]').value = entry.placedBy || '';
  form.querySelector('[name="truckRate"]').value = entry.truckRate || '';
  
  // Populate delivery type
  const deliveryTypeSelect = document.getElementById('deliveryTypeSelect');
  if (deliveryTypeSelect) {
    deliveryTypeSelect.value = entry.deliveryType || 'single';
    deliveryTypeSelect.dispatchEvent(new Event('change'));
  }
  
  // Populate delivery cities
  if (entry.deliveryType === 'multiple' && entry.deliveryCities && entry.deliveryCities.length > 0) {
    const deliveryCitiesList = document.getElementById('deliveryCitiesList');
    deliveryCitiesList.innerHTML = '';
    
    entry.deliveryCities.forEach((city, idx) => {
      const cityIndex = idx + 1;
      const cityDiv = document.createElement('div');
      cityDiv.className = 'delivery-city-item';
      cityDiv.setAttribute('data-city-index', cityIndex);
      cityDiv.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="flex-1">
            <label class="block text-xs font-medium text-gray-700 mb-1">Delivery City #${cityIndex}</label>
            <input 
              type="text" 
              name="deliveryCities[${cityIndex}]" 
              required 
              class="input-field w-full" 
              placeholder="Enter city name"
              value="${city}"
            >
          </div>
          <button 
            type="button" 
            onclick="removeDeliveryCity(${cityIndex})" 
            class="mt-5 bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 text-sm"
          >
            ✖️ Remove
          </button>
        </div>
      `;
      deliveryCitiesList.appendChild(cityDiv);
    });
    
    deliveryCityCounter = entry.deliveryCities.length + 1;
  }
  
  // Populate companies
  const companiesContainer = document.getElementById('companiesContainer');
  companiesContainer.innerHTML = '';
  
  const companiesToPopulate = entry.companies && entry.companies.length > 0 
    ? entry.companies 
    : [{name: entry.companyName || '', rate: entry.companyRate || 0, location: entry.to || ''}];
  
  companiesToPopulate.forEach((company, idx) => {
    const isFirst = idx === 0;
    const companyDiv = document.createElement('div');
    companyDiv.className = `company-item ${isFirst ? 'first-company' : ''}`;
    companyDiv.setAttribute('data-company-index', idx);
    companyDiv.innerHTML = `
      ${!isFirst ? `
      <button 
        type="button" 
        onclick="removeCompanyEntry(${idx})" 
        class="remove-btn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
      >
        ✖️ Remove
      </button>` : ''}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
          <select name="companies[${idx}][name]" required class="input-field w-full company-select" data-index="${idx}">
            <option value="">Select Company</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Company Rate *</label>
          <input 
            type="number" 
            name="companies[${idx}][rate]" 
            required 
            class="input-field w-full" 
            placeholder="0" 
            step="0.01"
            value="${company.rate || 0}"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Destination City *</label>
          <input 
            type="text" 
            name="companies[${idx}][location]" 
            required 
            class="input-field w-full" 
            placeholder="Delivery City"
            value="${company.location || ''}"
          >
        </div>
      </div>
    `;
    companiesContainer.appendChild(companyDiv);
    
    // Populate company select and set value
    populateCompanySelect(idx);
    setTimeout(() => {
      const select = document.querySelector(`.company-select[data-index="${idx}"]`);
      if (select) {
        select.value = company.name || '';
      }
    }, 100);
  });
  
  companyIndexCounter = companiesToPopulate.length;
  
  // Populate commission
  const commissionCheckbox = document.getElementById('commissionApplicable');
  if (entry.commission && entry.commission > 0) {
    commissionCheckbox.checked = true;
    commissionCheckbox.dispatchEvent(new Event('change'));
    
    form.querySelector('[name="commission"]').value = entry.commission || '';
    form.querySelector('[name="commissionTakenBy"]').value = entry.commissionTakenBy || '';
    form.querySelector('[name="commissionStatus"]').value = entry.commissionStatus || 'Paid';
  } else {
    commissionCheckbox.checked = false;
    commissionCheckbox.dispatchEvent(new Event('change'));
  }
  
  form.querySelector('[name="notes"]').value = entry.notes || '';
  
  // Change submit button
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.innerHTML = '<span class="flex items-center gap-2"><span>✏️ Update Entry</span></span>';
    submitBtn.classList.add('bg-orange-500', 'hover:bg-orange-600');
    submitBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
  }
  
  // Change clear button to cancel
  const resetBtn = form.querySelector('button[type="reset"]');
  if (resetBtn) {
    resetBtn.textContent = '❌ Cancel Edit';
    resetBtn.classList.add('bg-red-500', 'hover:bg-red-600', 'text-white');
    resetBtn.classList.remove('bg-gray-200', 'hover:bg-gray-300', 'text-gray-700');
  }
  
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showInlineMessage('📝 Editing mode: Update the fields and click "Update Entry" button.', 'info');
}

// Cancel edit
function cancelEditDailyRegister() {
  resetFormToAddMode();
  
  const form = document.getElementById('dailyRegisterForm');
  if (form) {
    form.reset();
  }
  
  // Reset companies to just one
  companyIndexCounter = 1;
  const companiesContainer = document.getElementById('companiesContainer');
  companiesContainer.innerHTML = `
    <div class="company-item first-company" data-company-index="0">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
          <select name="companies[0][name]" required class="input-field w-full company-select" data-index="0">
            <option value="">Select Company</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Company Rate *</label>
          <input type="number" name="companies[0][rate]" required class="input-field w-full" placeholder="0" step="0.01">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Destination City *</label>
          <input type="text" name="companies[0][location]" required class="input-field w-full" placeholder="Delivery City">
        </div>
      </div>
    </div>
  `;
  populateCompanySelects();
  
  // Reset delivery cities
  deliveryCityCounter = 1;
  document.getElementById('deliveryCitiesList').innerHTML = '';
  document.getElementById('additionalDeliveriesSection').classList.add('hidden');
  
  // Hide commission fields
  document.getElementById('commissionFields').classList.add('hidden');
  
  showInlineMessage('Edit cancelled. Form reset to add new entry mode.', 'info');
}

// ============================================================================
// INITIALIZE ON PAGE LOAD
// ============================================================================

// Add to your existing DOMContentLoaded or initialization function
// If you already have a DOMContentLoaded listener, add initializeEnhancedDailyRegister() to it
// Otherwise, use this:

document.addEventListener('DOMContentLoaded', function() {
  // Wait a bit for other initializations to complete
  setTimeout(function() {
    initializeEnhancedDailyRegister();
  }, 500);
});

console.log('Enhanced Daily Register module loaded');
