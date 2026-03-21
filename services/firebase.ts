import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCrBCEoC7KNG44Kkh9vlCDaroKhTaGPOa4",
  authDomain: "dentacore-ccfac.firebaseapp.com",
  projectId: "dentacore-ccfac",
  storageBucket: "dentacore-ccfac.firebasestorage.app",
  messagingSenderId: "970875966750",
  appId: "1:970875966750:web:9af5928558888b978ea50f",
  measurementId: "G-GRM1LH59TJ",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export { analytics, app, auth, db };
export default app;