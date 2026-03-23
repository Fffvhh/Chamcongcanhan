import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Khởi tạo Firebase App
const app = initializeApp(firebaseConfig);

// Khởi tạo Firestore (Giữ lại để lưu trữ dữ liệu chấm công/kỉ niệm)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Đã loại bỏ hoàn toàn các hàm: auth, googleProvider, signInWithGoogle, logout

export * from './utils/firestoreError';
