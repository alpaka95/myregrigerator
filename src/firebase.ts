import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCBWCYdUI4NjOtXHFrvOGByq8TfosN3Gdk",
  authDomain: "my-fridge-a4ddb.firebaseapp.com", // 기본 도메인으로 복구
  projectId: "my-fridge-a4ddb",
  storageBucket: "my-fridge-a4ddb.firebasestorage.app",
  messagingSenderId: "346659154483",
  appId: "1:346659154483:web:fe81d7649545b8c9215146",
  measurementId: "G-7WPK6G57FE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 인증 상태 유지 설정
setPersistence(auth, browserLocalPersistence);

export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export const googleProvider = new GoogleAuthProvider();

// 불필요한 prompt 파라미터 제거 (중복 창 방지)

export { auth };
export default app;
