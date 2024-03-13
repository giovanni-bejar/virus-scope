import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  browserLocalPersistence,
  onAuthStateChanged,
  updateProfile,
  signOut,
  sendEmailVerification,
} from "firebase/auth";

// Requirements to work with Firebase
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Signup with email and password
export const userEmailSignup = async (email, password, displayName) => {
  return setPersistence(auth, browserLocalPersistence).then(async () => {
    try {
      const userCredentials = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const uid = userCredentials.user.uid;

      // Update the user's profile with the displayName
      await updateProfile(userCredentials.user, {
        displayName: displayName,
      });

      // Set user document in Firestore
      await setDoc(doc(db, "users", uid), {
        UID: uid,
        membership: "free",
      });

      sendEmail();
      return "success";
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        return "User already exists";
      } else {
        return "Something went wrong, please try again later.";
      }
    }
  });
};

// Login with email and password and save user logged in
export const userEmailLogin = async (email, password) => {
  return setPersistence(auth, browserLocalPersistence)
    .then(() => {
      return signInWithEmailAndPassword(auth, email, password);
    })
    .catch((error) => {
      throw error;
    });
};

// check auth status
export const authStatus = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        if (user) {
          resolve(true);
        } else {
          resolve(false);
        }
      },
      reject
    );
  });
};

// log out fully
export const userLogout = () => {
  signOut(auth).catch((error) => {
    throw error;
  });
};

// Send email
export const sendEmail = () => {
  if (auth.currentUser) {
    sendEmailVerification(auth.currentUser);
  }
};
