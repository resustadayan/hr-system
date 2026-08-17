// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
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

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

export const login = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const logout = async () => {
  return await signOut(auth);
};

export const register = async (email, password) => {
  return await createUserWithEmailAndPassword(auth, email, password);
};

// ============================================
// USERS COLLECTION
// ============================================

export const addUser = async (userData) => {
  return await addDoc(collection(db, "users"), userData);
};

export const getUsers = async () => {
  const querySnapshot = await getDocs(collection(db, "users"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getUserById = async (userId) => {
  const docRef = doc(db, "users", userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const getUserByEmail = async (email) => {
  const q = query(collection(db, "users"), where("email", "==", email));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))[0] || null;
};

export const updateUser = async (id, data) => {
  return await updateDoc(doc(db, "users", id), data);
};

export const deleteUser = async (id) => {
  return await deleteDoc(doc(db, "users", id));
};

// ============================================
// EMPLOYEES COLLECTION
// ============================================

export const addEmployee = async (employeeData) => {
  return await addDoc(collection(db, "employees"), employeeData);
};

export const getEmployees = async () => {
  const querySnapshot = await getDocs(collection(db, "employees"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getEmployeeById = async (employeeId) => {
  const docRef = doc(db, "employees", employeeId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const getEmployeesByDepartment = async (department) => {
  const q = query(collection(db, "employees"), where("department", "==", department));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getEmployeeByEmail = async (email) => {
  const q = query(collection(db, "employees"), where("email", "==", email));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))[0] || null;
};

export const updateEmployee = async (id, data) => {
  return await updateDoc(doc(db, "employees", id), data);
};

export const deleteEmployee = async (id) => {
  return await deleteDoc(doc(db, "employees", id));
};

// ============================================
// ATTENDANCE COLLECTION
// ============================================

export const addAttendance = async (attendanceData) => {
  return await addDoc(collection(db, "attendance"), attendanceData);
};

export const getAttendance = async () => {
  const querySnapshot = await getDocs(collection(db, "attendance"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getAttendanceByEmployee = async (employeeId) => {
  const q = query(collection(db, "attendance"), where("employeeId", "==", employeeId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getAttendanceByDate = async (date) => {
  const q = query(collection(db, "attendance"), where("date", "==", date));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getAttendanceByDepartment = async (department) => {
  const employees = await getEmployeesByDepartment(department);
  const employeeIds = employees.map(emp => emp.id);
  if (employeeIds.length === 0) return [];
  const q = query(collection(db, "attendance"), where("employeeId", "in", employeeIds));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateAttendance = async (id, data) => {
  return await updateDoc(doc(db, "attendance", id), data);
};

export const deleteAttendance = async (id) => {
  return await deleteDoc(doc(db, "attendance", id));
};

// ============================================
// LEAVE REQUESTS COLLECTION
// ============================================

export const addLeaveRequest = async (leaveData) => {
  return await addDoc(collection(db, "leaveRequests"), leaveData);
};

export const getLeaveRequests = async () => {
  const querySnapshot = await getDocs(collection(db, "leaveRequests"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getLeaveRequestsByEmployee = async (employeeId) => {
  const q = query(collection(db, "leaveRequests"), where("employeeId", "==", employeeId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getLeaveRequestsByStatus = async (status) => {
  const q = query(collection(db, "leaveRequests"), where("status", "==", status));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getLeaveRequestsByDepartment = async (department) => {
  const employees = await getEmployeesByDepartment(department);
  const employeeIds = employees.map(emp => emp.id);
  if (employeeIds.length === 0) return [];
  const q = query(collection(db, "leaveRequests"), where("employeeId", "in", employeeIds));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateLeaveStatus = async (id, status) => {
  return await updateDoc(doc(db, "leaveRequests", id), { status });
};

export const deleteLeaveRequest = async (id) => {
  return await deleteDoc(doc(db, "leaveRequests", id));
};

// ============================================
// LEAVE BALANCES COLLECTION
// ============================================

export const addLeaveBalance = async (balanceData) => {
  return await addDoc(collection(db, "leaveBalances"), balanceData);
};

export const getLeaveBalances = async () => {
  const querySnapshot = await getDocs(collection(db, "leaveBalances"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getLeaveBalanceByEmployee = async (employeeId) => {
  const q = query(collection(db, "leaveBalances"), where("employeeId", "==", employeeId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.length > 0 
    ? { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } 
    : null;
};

export const updateLeaveBalance = async (id, data) => {
  return await updateDoc(doc(db, "leaveBalances", id), data);
};

export const deleteLeaveBalance = async (id) => {
  return await deleteDoc(doc(db, "leaveBalances", id));
};

// ============================================
// DOCUMENTS COLLECTION (Compliance)
// ============================================

export const addDocument = async (documentData) => {
  return await addDoc(collection(db, "documents"), documentData);
};

export const getDocuments = async () => {
  const querySnapshot = await getDocs(collection(db, "documents"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getDocumentsByEmployee = async (employeeId) => {
  const q = query(collection(db, "documents"), where("employeeId", "==", employeeId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getDocumentsByStatus = async (status) => {
  const q = query(collection(db, "documents"), where("status", "==", status));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getDocumentsByDepartment = async (department) => {
  const employees = await getEmployeesByDepartment(department);
  const employeeIds = employees.map(emp => emp.id);
  if (employeeIds.length === 0) return [];
  const q = query(collection(db, "documents"), where("employeeId", "in", employeeIds));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateDocument = async (id, data) => {
  return await updateDoc(doc(db, "documents", id), data);
};

export const deleteDocument = async (id) => {
  return await deleteDoc(doc(db, "documents", id));
};

// ============================================
// PAYROLL COLLECTION
// ============================================

export const addPayroll = async (payrollData) => {
  return await addDoc(collection(db, "payroll"), payrollData);
};

export const getPayroll = async () => {
  const querySnapshot = await getDocs(collection(db, "payroll"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getPayrollByEmployee = async (employeeId) => {
  const q = query(collection(db, "payroll"), where("employeeId", "==", employeeId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getPayrollByPeriod = async (periodStart, periodEnd) => {
  const q = query(
    collection(db, "payroll"), 
    where("periodStart", ">=", periodStart),
    where("periodEnd", "<=", periodEnd)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getPayrollByDepartment = async (department) => {
  const employees = await getEmployeesByDepartment(department);
  const employeeIds = employees.map(emp => emp.id);
  if (employeeIds.length === 0) return [];
  const q = query(collection(db, "payroll"), where("employeeId", "in", employeeIds));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updatePayroll = async (id, data) => {
  return await updateDoc(doc(db, "payroll", id), data);
};

export const deletePayroll = async (id) => {
  return await deleteDoc(doc(db, "payroll", id));
};

// ============================================
// INTERVENTIONS COLLECTION
// ============================================

export const addIntervention = async (interventionData) => {
  return await addDoc(collection(db, "interventions"), interventionData);
};

export const getInterventions = async () => {
  const querySnapshot = await getDocs(collection(db, "interventions"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getInterventionsByEmployee = async (employeeId) => {
  const q = query(collection(db, "interventions"), where("employeeId", "==", employeeId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getInterventionsByStatus = async (status) => {
  const q = query(collection(db, "interventions"), where("status", "==", status));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getInterventionsByDepartment = async (department) => {
  const employees = await getEmployeesByDepartment(department);
  const employeeIds = employees.map(emp => emp.id);
  if (employeeIds.length === 0) return [];
  const q = query(collection(db, "interventions"), where("employeeId", "in", employeeIds));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateIntervention = async (id, data) => {
  return await updateDoc(doc(db, "interventions", id), data);
};

export const deleteIntervention = async (id) => {
  return await deleteDoc(doc(db, "interventions", id));
};

// ============================================
// NOTIFICATIONS COLLECTION (NEW)
// ============================================

export const addNotification = async (notificationData) => {
  return await addDoc(collection(db, "notifications"), {
    ...notificationData,
    read: false,
    createdAt: new Date().toISOString()
  });
};

export const getNotifications = async () => {
  const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getNotificationsByEmployee = async (employeeId) => {
  const q = query(
    collection(db, "notifications"), 
    where("employeeId", "==", employeeId),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getNotificationsByDepartment = async (department) => {
  const q = query(
    collection(db, "notifications"), 
    where("department", "==", department),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const markNotificationAsRead = async (id) => {
  return await updateDoc(doc(db, "notifications", id), { read: true });
};

export const markAllNotificationsAsRead = async (employeeId) => {
  const q = query(
    collection(db, "notifications"), 
    where("employeeId", "==", employeeId),
    where("read", "==", false)
  );
  const querySnapshot = await getDocs(q);
  const promises = querySnapshot.docs.map(doc => 
    updateDoc(doc.ref, { read: true })
  );
  return await Promise.all(promises);
};

export const deleteNotification = async (id) => {
  return await deleteDoc(doc(db, "notifications", id));
};

// ============================================
// AUDIT LOGS COLLECTION
// ============================================

export const addAuditLog = async (logData) => {
  return await addDoc(collection(db, "auditLogs"), {
    ...logData,
    timestamp: new Date().toISOString()
  });
};

export const getAuditLogs = async () => {
  const q = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getAuditLogsByUser = async (userId) => {
  const q = query(collection(db, "auditLogs"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getRecentAuditLogs = async (limitCount = 10) => {
  const q = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"), limit(limitCount));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ============================================
// CONNECTION TEST
// ============================================

export const checkFirebaseConnection = async () => {
  try {
    const testRef = collection(db, '_test');
    await addDoc(testRef, { test: true, timestamp: new Date() });
    console.log('✅ Firebase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Firebase connection error:', error.message);
    return false;
  }
};

// ============================================
// DEFAULT EXPORT
// ============================================

export default app;