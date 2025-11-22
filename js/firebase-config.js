/**
 * Firebase Configuration and Initialization
 * SGFC Transportation Management System
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDXjS_eZykW2vCBUvb0cFRQemsAd2A6AFQ",
  authDomain: "sgfc-transportation-ba8ec.firebaseapp.com",
  databaseURL: "https://sgfc-transportation-ba8ec-default-rtdb.firebaseio.com",
  projectId: "sgfc-transportation-ba8ec",
  storageBucket: "sgfc-transportation-ba8ec.firebasestorage.app",
  messagingSenderId: "859899954518",
  appId: "1:859899954518:web:520b1a0aa9150637df02f7",
  measurementId: "G-GJ2P24Q8PG"
};

try {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  window.firebaseDB = { db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, onSnapshot };
  window.firebaseReady = true;
  console.log('✅ Firebase initialized - Cloud sync enabled');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  window.firebaseReady = false;
  alert('Failed to connect to database. Some features may not work properly. Please refresh the page.');
}
