// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAv6jZa4Ocp-t-SqdzaJahNVTF5mfxn5PE",
  authDomain: "haunted-blocks.firebaseapp.com",
  projectId: "haunted-blocks",
  storageBucket: "haunted-blocks.firebasestorage.app",
  messagingSenderId: "916784093731",
  appId: "G-8X710QX39N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
