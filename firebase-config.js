// Firebase Web SDK configuration using ES Modules CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC3hrH5xgIv693tJKlywgQYHtQdPTkaRE0",
  authDomain: "fazar-site.firebaseapp.com",
  projectId: "fazar-site",
  storageBucket: "fazar-site.firebasestorage.app",
  messagingSenderId: "854820135089",
  appId: "1:854820135089:web:0f3efd71beb16dc9564290",
  measurementId: "G-K80C7WB17Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
