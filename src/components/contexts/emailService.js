// src/components/contexts/emailService.js
import emailjs from '@emailjs/browser';

const PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;
const SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID;
const ADMIN_TEMPLATE = process.env.REACT_APP_EMAILJS_TEMPLATE_ADMIN;
const APPROVED_TEMPLATE = process.env.REACT_APP_EMAILJS_TEMPLATE_APPROVED;

// Replace with your real admin email
export const ADMIN_EMAIL = ['dianneresusta@gmail.com', 'leiannmabilin1018@gmail.com', 'lgu.hrmo@gmail.com'];

// ============================================
// DEBUG: log config on load (helps diagnose)
// ============================================
console.log('EmailJS Config Loaded:', {
  PUBLIC_KEY: PUBLIC_KEY ? `${PUBLIC_KEY.substring(0, 8)}…` : 'MISSING',
  SERVICE_ID: SERVICE_ID || 'MISSING',
  ADMIN_TEMPLATE: ADMIN_TEMPLATE || 'MISSING',
  APPROVED_TEMPLATE: APPROVED_TEMPLATE || 'MISSING',
  ADMIN_EMAIL: ADMIN_EMAIL,
});

// Initialize once
let initialized = false;
function ensureInit() {
  if (!initialized && PUBLIC_KEY) {
    try {
      emailjs.init(PUBLIC_KEY);
      initialized = true;
      console.log('EmailJS initialized');
    } catch (err) {
      console.error('emailjs.init failed:', err);
    }
  }
}

// ============================================
// Internal helper: parse EmailJS error properly
// EmailJS throws an object { status, text }, not a standard Error
// ============================================
function extractError(error) {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error.text) return `${error.status || ''} ${error.text}`.trim();
  if (error.message) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unparseable error';
  }
}

// ============================================
// Internal helper: retry emailjs.send() up to N times
// ============================================
async function sendWithRetry(templateId, params, retries = 2) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      console.log(`Sending (attempt ${attempt}/${retries + 1})…`);
      const result = await emailjs.send(SERVICE_ID, templateId, params);
      console.log('Sent:', result.status, result.text);
      return { success: true, result };
    } catch (error) {
      lastError = error;
      const msg = extractError(error);
      console.warn(`Attempt ${attempt} failed: ${msg}`);

      // Don't retry on config/auth errors — they won't fix themselves
      if (
        msg.includes('Invalid public key') ||
        msg.includes('Invalid service ID') ||
        msg.includes('Invalid template ID') ||
        msg.includes('412') ||
        msg.includes('403')
      ) {
        console.warn('Non-retryable error — aborting');
        break;
      }

      // Wait before retrying (exponential: 500ms, 1000ms)
      if (attempt <= retries) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
  }

  return { success: false, error: extractError(lastError) };
}

// ============================================
// Send "new registration" email to ADMIN
// ============================================
export async function sendAdminRegistrationEmail({
  employeeName,
  employeeEmail,
  employeeDepartment,
  employeePosition,
}) {
  if (!PUBLIC_KEY || !SERVICE_ID || !ADMIN_TEMPLATE) {
    console.warn('EmailJS not configured — skipping admin email', {
      hasPublicKey: !!PUBLIC_KEY,
      hasServiceId: !!SERVICE_ID,
      hasTemplate: !!ADMIN_TEMPLATE,
    });
    return { success: false, reason: 'not_configured' };
  }

  ensureInit();

  const params = {
    to_email: ADMIN_EMAIL,
    employee_name: employeeName,
    employee_email: employeeEmail,
    employee_department: employeeDepartment,
    employee_position: employeePosition,
    approval_link: `${window.location.origin}/pending-approvals`,
  };

  console.log('[Admin email] Params:', params);

  return await sendWithRetry(ADMIN_TEMPLATE, params, 2);
}

// ============================================
// Send "account approved" email to EMPLOYEE
// ============================================
export async function sendEmployeeApprovalEmail({ employeeName, employeeEmail }) {
  if (!PUBLIC_KEY || !SERVICE_ID || !APPROVED_TEMPLATE) {
    console.warn('EmailJS not configured — skipping employee email', {
      hasPublicKey: !!PUBLIC_KEY,
      hasServiceId: !!SERVICE_ID,
      hasTemplate: !!APPROVED_TEMPLATE,
    });
    return { success: false, reason: 'not_configured' };
  }

  ensureInit();

  const params = {
    to_email: employeeEmail,
    employee_name: employeeName,
    employee_email: employeeEmail,
    login_link: `${window.location.origin}/login`,
  };

  console.log('[Employee email] Params:', params);

  return await sendWithRetry(APPROVED_TEMPLATE, params, 2);
}