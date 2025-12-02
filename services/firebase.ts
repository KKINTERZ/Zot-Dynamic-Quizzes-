
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBDFpHXg5Lvgfuq415l_-gqsRM3J9p6NoU",
  authDomain: "zot-dynamic-quizzes.firebaseapp.com",
  projectId: "zot-dynamic-quizzes",
  storageBucket: "zot-dynamic-quizzes.firebasestorage.app",
  messagingSenderId: "542106343460",
  appId: "1:542106343460:web:923625f70494c0cc9620b1",
  measurementId: "G-1S4QLWKBPE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize analytics if window is available
if (typeof window !== 'undefined') {
  const analytics = getAnalytics(app);
}
