import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCSbMCh8C2XGSnMCdfMOkXJy5pxt3F-0XU",
  authDomain: "fastathon.firebaseapp.com",
  databaseURL: "https://fastathon-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "fastathon",
  storageBucket: "fastathon.firebasestorage.app",
  messagingSenderId: "177591344445",
  appId: "1:177591344445:web:6591ced60b92092f257954",
  measurementId: "G-7XLJ2RM3YV"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
