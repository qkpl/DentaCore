import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const buildNativePersistence = () => {
  // getReactNativePersistence is available in newer firebase/auth versions.
  // Guard the require so the build still works if the helper is missing.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getReactNativePersistence } = require("firebase/auth");
    return getReactNativePersistence(AsyncStorage);
  } catch (error) {
    return null;
  }
};

const firebaseConfig = {
  apiKey: "AIzaSyCrBCEoC7KNG44Kkh9vlCDaroKhTaGPOa4",
  authDomain: "dentacore-ccfac.firebaseapp.com",
  projectId: "dentacore-ccfac",
  storageBucket: "dentacore-ccfac.firebasestorage.app",
  messagingSenderId: "970875966750",
  appId: "1:970875966750:web:9af5928558888b978ea50f",
  measurementId: "G-GRM1LH59TJ",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = (() => {
  if (Platform.OS === "web") {
    return getAuth(app);
  }

  try {
    return getAuth(app);
  } catch (error: unknown) {
    const persistence = buildNativePersistence();
    return initializeAuth(app, persistence ? { persistence } : undefined);
  }
})();

// Use long-polling to make Firestore work reliably in Expo Go / React Native
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export { app, auth, db };
export default app;
