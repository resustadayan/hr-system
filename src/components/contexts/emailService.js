// src/components/contexts/emailService.js
import emailjs from '@emailjs/browser';

const PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;
const SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID;
const ADMIN_TEMPLATE = process.env.REACT_APP_EMAILJS_TEMPLATE_ADMIN;
const APPROVED_TEMPLATE = process.env.REACT_APP_EMAILJS_TEMPLATE_APPROVED;

// Replace with your real admin email
export const ADMIN_EMAIL = 'dianneresusta@gmail.com';

// Initialize once
let initialized = false;
function ensureInit() {
  if (!initialized) {
    emailjs.init(PUBLIC_KEY);
    initialized = true;
  }
}

/*** Send "new registration" email to admin*/
export async function sendAdminRegistrationEmail({ employeeName, employeeEmail, employeeDepartment, employeePosition }) {
  if (!PUBLIC_KEY || !SERVICE_ID || !ADMIN_TEMPLATE) {
    console.warn('EmailJS not configured — skipping admin email');
    return { success: false, reason: 'not_configured' };
  }
  ensureInit();
  try {
    const result = await emailjs.send(SERVICE_ID, ADMIN_TEMPLATE, {
      to_email: ADMIN_EMAIL,
      employee_name: employeeName,
      employee_email: employeeEmail,
      employee_department: employeeDepartment,
      employee_position: employeePosition,
      approval_link: `${window.location.origin}/employees`,
    });
    return { success: true, result };
  } catch (error) {
    console.error('Admin email failed:', error);
    return { success: false, error: error.message };
  }
}

/*** Send "account approved" email to the employee*/
export async function sendEmployeeApprovalEmail({ employeeName, employeeEmail }) {
  if (!PUBLIC_KEY || !SERVICE_ID || !APPROVED_TEMPLATE) {
    console.warn('EmailJS not configured — skipping employee email');
    return { success: false, reason: 'not_configured' };
  }
  ensureInit();
  try {
    const result = await emailjs.send(SERVICE_ID, APPROVED_TEMPLATE, {
      to_email: employeeEmail,
      employee_name: employeeName,
      employee_email: employeeEmail,
      login_link: `${window.location.origin}/login`,
    });
    return { success: true, result };
  } catch (error) {
    console.error('Employee email failed:', error);
    return { success: false, error: error.message };
  }
}