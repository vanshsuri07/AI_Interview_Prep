import {initializeApp, getApps, cert} from 'firebase-admin/app'
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';

const initFirebaseAdmin = () => {
    const app = getApps();
  if (!app.length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }


return {
    auth: getAuth(),
    db: getFirestore()


}
};

export const  { auth, db} = initFirebaseAdmin();