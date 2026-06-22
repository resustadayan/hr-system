// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDzqhj7KWcKz3PXaUxEtwLnxPxX4BAKMo0",
  authDomain: "digital-hr-system.firebaseapp.com",
  projectId: "digital-hr-system",
  storageBucket: "digital-hr-system.firebasestorage.app",
  messagingSenderId: "123829923823",
  appId: "1:123829923823:web:5f57b0cb59f3979870d01a",
  measurementId: "G-3BXD547DC4"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Auth functions
export const login = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const logout = async () => {
  return await signOut(auth);
};

export const register = async (email, password) => {
  return await createUserWithEmailAndPassword(auth, email, password);
};

// Employee functions
export const addEmployee = async (employeeData) => {
  return await addDoc(collection(db, "employees"), employeeData);
};

export const getEmployees = async () => {
  const querySnapshot = await getDocs(collection(db, "employees"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateEmployee = async (id, data) => {
  return await updateDoc(doc(db, "employees", id), data);
};

export const deleteEmployee = async (id) => {
  return await deleteDoc(doc(db, "employees", id));
};

// Leave functions
export const addLeaveRequest = async (leaveData) => {
  return await addDoc(collection(db, "leaveRequests"), leaveData);
};

export const getLeaveRequests = async () => {
  const querySnapshot = await getDocs(collection(db, "leaveRequests"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateLeaveStatus = async (id, status) => {
  return await updateDoc(doc(db, "leaveRequests", id), { status });
};

// Add this function to check if Firebase is properly configured
export const checkFirebaseConnection = async () => {
  try {
    // Test write to a temp collection
    const testRef = collection(db, '_test');
    await addDoc(testRef, { test: true, timestamp: new Date() });
    console.log('Firebase connection successful');
    return true;
  } catch (error) {
    console.error('Firebase connection error:', error.message);
    return false;
  }
};

export default app;