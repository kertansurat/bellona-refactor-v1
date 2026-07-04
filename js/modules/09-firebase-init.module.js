/* BELLONA Refactor v2.0 - extracted Firebase bootstrap. Firebase config unchanged. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBv_QQ_O8SE88WFTwro2hJJYGDRA4Jdds8',
  authDomain: 'bellona-gvg.firebaseapp.com',
  projectId: 'bellona-gvg',
  storageBucket: 'bellona-gvg.firebasestorage.app',
  messagingSenderId: '871679564546',
  appId: '1:871679564546:web:c4b43efd62a2d57f8c001b'
};

try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    window.bellonaFirebaseReady = true;
    window.bellonaDB = db;
    getDocs(collection(db, 'players')).then(snap => console.log('Firebase Connected ✅ players:', snap.size)).catch(err => console.warn('Firebase test error:', err.message));
} catch (err) {
    console.warn('Firebase init error:', err.message);
}
