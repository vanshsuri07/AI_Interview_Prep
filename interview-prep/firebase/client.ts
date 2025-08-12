// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB_O2uh-zH8BgFYigq2L5_ykhk3XVWd5tU",
  authDomain: "prepwise-4ab46.firebaseapp.com",
  projectId: "prepwise-4ab46",
  storageBucket: "prepwise-4ab46.firebasestorage.app",
  messagingSenderId: "785559806558",
  appId: "1:785559806558:web:cf73f7ec2328dc17f20acf",
  measurementId: "G-WTF1CR6EHN"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);

