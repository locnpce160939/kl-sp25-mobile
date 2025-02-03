// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBxp6LGpHO2rQjc6VIz2J4Xaa6zWtLvUFo",
  authDomain: "ftcs-16ab7.firebaseapp.com",
  projectId: "ftcs-16ab7",
  storageBucket: "ftcs-16ab7.firebasestorage.app",
  messagingSenderId: "483269218252",
  appId: "1:483269218252:web:f85e086f7ffc7146b01769",
  measurementId: "G-X96GWBKWCH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);