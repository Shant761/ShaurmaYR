// Конфиг Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDrOAhG2hQphTC8xmI_L1HD835Z101GPAI",
  authDomain: "grean-mafia.firebaseapp.com",
  databaseURL: "https://grean-mafia-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "grean-mafia",
  storageBucket: "grean-mafia.firebasestorage.app",
  messagingSenderId: "603308315781",
  appId: "1:603308315781:web:053d9551ed6516477905ec"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();
