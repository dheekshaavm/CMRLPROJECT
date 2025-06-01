// Example Firebase config
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyBrssX7-EYbEL8O44tvlqFb0xI3OGu5QoE",
  authDomain: "cmrl-d928c.firebaseapp.com",
  projectId: "cmrl-d928c",
  storageBucket: "cmrl-d928c.firebasestorage.app",
  messagingSenderId: "568597386840",
  appId: "1:568597386840:web:7e4315a9590e897b8f9c2d",
  measurementId: "G-JQEDTW8LQS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
export {db, auth};