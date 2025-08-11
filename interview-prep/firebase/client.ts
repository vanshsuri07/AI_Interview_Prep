import {initializeApp, getApps, getApp} from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
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

export const auth = getAuth(app);
export const db = getFirestore(app);

