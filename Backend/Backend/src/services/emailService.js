// services/emailService.js
// Sends transactional emails (member payment receipts, OTPs) using SMTP via nodemailer.
// - Uses dynamic import to avoid hard dependency if nodemailer is not installed.
// - Reads SMTP config from environment variables.

const getTransporter = async () => {
  try {
    const mod = await import('nodemailer');
    const nodemailer = mod.default || mod;

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

    if (!host || !user || !pass) {
      console.warn('[emailService] SMTP not fully configured. Skipping email send.');
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure, // true for 465, false for other ports
      auth: { user, pass }
    });
  } catch (err) {
    console.warn('[emailService] nodemailer not installed. Skipping email send.', err?.message);
    return null;
  }
};

const formatCurrency = (amount) => {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  } catch {
    return `₹${amount}`;
  }
};

const buildMemberReceiptHtml = ({
  memberName,
  memberEmail,
  gymName,
  gymOwnerName,
  gymOwnerEmail,
  trainerName,
  amount,
  planType,
  duration,
  periodStart,
  periodEnd,
  paymentMethod,
  transactionId,
  notes
}) => {
  const amountStr = formatCurrency(amount);
  const safe = (v, fallback = '-') => (v === undefined || v === null || v === '' ? fallback : v);
  const dateStr = (d) => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  return `
  <div style="font-family: Arial, Helvetica, sans-serif; color: #111;">
    <div style="max-width:640px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <div style="background:#111827;color:#fff;padding:16px 20px;">
        <h2 style="margin:0;font-size:18px;">Payment Receipt</h2>
        <div style="opacity:0.85;font-size:12px;">Thank you for your payment</div>
      </div>
      <div style="padding:16px 20px;">
        <h3 style="margin:0 0 12px 0;">Member Details</h3>
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#6b7280;">Name</td><td style="padding:6px 0;text-align:right;">${safe(memberName)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;text-align:right;">${safe(memberEmail)}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:14px 0;" />
        <h3 style="margin:0 0 12px 0;">Gym Details</h3>
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#6b7280;">Gym</td><td style="padding:6px 0;text-align:right;">${safe(gymName)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Gym Owner</td><td style="padding:6px 0;text-align:right;">${safe(gymOwnerName)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Gym Email</td><td style="padding:6px 0;text-align:right;">${safe(gymOwnerEmail)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Trainer</td><td style="padding:6px 0;text-align:right;">${safe(trainerName)}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:14px 0;" />
        <h3 style="margin:0 0 12px 0;">Payment Summary</h3>
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#6b7280;">Plan</td><td style="padding:6px 0;text-align:right;">${safe(planType)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Duration</td><td style="padding:6px 0;text-align:right;">${safe(duration)} month(s)</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Membership Period</td><td style="padding:6px 0;text-align:right;">${dateStr(periodStart)} → ${dateStr(periodEnd)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Payment Method</td><td style="padding:6px 0;text-align:right;">${safe(paymentMethod)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Transaction ID</td><td style="padding:6px 0;text-align:right;">${safe(transactionId)}</td></tr>
          <tr><td style="padding:6px 0;color:#111;font-weight:bold;">Amount Paid</td><td style="padding:6px 0;text-align:right;font-weight:bold;">${amountStr}</td></tr>
        </table>
        ${notes ? `<div style="margin-top:10px;color:#6b7280;font-size:13px;">Notes: ${notes}</div>` : ''}
      </div>
      <div style="background:#f9fafb;color:#6b7280;padding:12px 20px;font-size:12px;">
        <div style="margin-bottom:6px;color:#111827;">
          <strong>Keep going!</strong> Every rep brings you closer to your best self. — ${safe(gymName || 'Your Gym')}
        </div>
        This is an automated receipt. For questions, reply to this email.
      </div>
    </div>
  </div>
  `;
};

export const sendMemberPaymentReceipt = async ({
  to,
  memberName,
  memberEmail,
  gymName,
  gymOwnerName,
  gymOwnerEmail,
  trainerName,
  amount,
  planType,
  duration,
  periodStart,
  periodEnd,
  paymentMethod,
  transactionId,
  notes
}) => {
  const transporter = await getTransporter();
  if (!transporter) return { sent: false, reason: 'no-transporter' };

  // Prefer SMTP_FROM, then SMTP_USER, then a generic fallback
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@gymflow.local';
  const subject = `Payment Receipt - ${gymName || 'Your Gym'}`;
  const html = buildMemberReceiptHtml({
    memberName,
    memberEmail,
    gymName,
    gymOwnerName,
    gymOwnerEmail,
    trainerName,
    amount,
    planType,
    duration,
    periodStart,
    periodEnd,
    paymentMethod,
    transactionId,
    notes
  });

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html
    });
    return { sent: true, messageId: info?.messageId };
  } catch (err) {
    console.error('[emailService] Failed to send receipt email:', err?.message);
    return { sent: false, reason: err?.message };
  }
};

// Send manual receipt (for gym owners to send receipts manually)
export const sendManualReceipt = async (receiptData) => {
  const transporter = await getTransporter();
  if (!transporter) return { sent: false, reason: 'no-transporter' };

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@gymflow.local';
  const subject = `Payment Receipt - ${receiptData.gymName || 'Your Gym'}`;
  
  const html = buildMemberReceiptHtml({
    memberName: receiptData.memberName,
    memberEmail: receiptData.memberEmail,
    gymName: receiptData.gymName,
    gymOwnerName: receiptData.gymOwnerName,
    gymOwnerEmail: receiptData.gymOwnerEmail,
    trainerName: receiptData.trainerName,
    amount: receiptData.amount,
    planType: receiptData.planType,
    duration: receiptData.duration,
    periodStart: receiptData.periodStart,
    periodEnd: receiptData.periodEnd,
    paymentMethod: receiptData.paymentMethod,
    transactionId: receiptData.transactionId || `MANUAL_${Date.now()}`,
    notes: receiptData.notes
  });

  try {
    const info = await transporter.sendMail({
      from,
      to: receiptData.memberEmail,
      subject,
      html
    });
    return { sent: true, messageId: info?.messageId };
  } catch (err) {
    console.error('[emailService] Failed to send manual receipt:', err?.message);
    // Map to a meaningful reason for the controller to surface
    const transient = /ECONNRESET|ETIMEDOUT|ENOTFOUND|ECONNREFUSED|EAI_AGAIN/i.test(err?.message || '');
    return { sent: false, reason: transient ? 'email-service-unreachable' : (err?.message || 'unknown-error') };
  }
};

export const sendOtpEmail = async ({ to, memberName, gymName, otpCode, gymOwnerName }) => {
  const transporter = await getTransporter();
  if (!transporter) return { sent: false, reason: 'no-transporter' };

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@gymflow.local';
  const subject = `OTP Verification for Account Action - ${gymName || 'Your Gym'}`;
  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; color: #111;">
    <div style="max-width:640px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <div style="background:#111827;color:#fff;padding:16px 20px;">
        <h2 style="margin:0;font-size:18px;">OTP Verification</h2>
        <div style="opacity:0.85;font-size:12px;">Confirm account action for ${gymName || 'your gym'}</div>
      </div>
      <div style="padding:16px 20px;">
        <p style="margin:0 0 10px 0;">Hello ${memberName || 'Member'},</p>
        <p style="margin:0 0 10px 0;">An account action has been initiated by ${gymOwnerName || 'Gym Owner'}. Please use the OTP below to confirm:</p>
        <div style="font-size:24px;font-weight:bold;letter-spacing:2px;margin:12px 0;">${otpCode}</div>
        <p style="margin:0;color:#6b7280;">This OTP will expire in 10 minutes. If you did not request this action, please ignore this email.</p>
      </div>
      <div style="background:#f9fafb;color:#6b7280;padding:12px 20px;font-size:12px;">
        This is an automated message. Do not share your OTP with anyone.
      </div>
    </div>
  </div>`;

  try {
    const info = await transporter.sendMail({ from, to, subject, html });
    return { sent: true, messageId: info?.messageId };
  } catch (err) {
    console.error('[emailService] Failed to send OTP email:', err?.message);
    return { sent: false, reason: err?.message };
  }
};

// New: Send User Creation Receipt (Member/Trainer)
export const sendUserCreationReceipt = async ({
  to,
  userRole,
  userName,
  gymName,
  gymOwnerName,
  gymOwnerEmail,
  trainerName,
  userData
}) => {
  const transporter = await getTransporter();
  if (!transporter) return { sent: false, reason: 'no-transporter' };

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@gymflow.local';
  const roleLabel = (userRole === 'trainer') ? 'Trainer' : 'Member';
  const subject = `Welcome to ${gymName || 'your gym'} — Your ${roleLabel} Account`;

  const safe = (v, fallback = '-') => (v === undefined || v === null || v === '' ? fallback : v);
  const dateStr = (d) => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; color: #111;">
    <div style="max-width:640px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <div style="background:#111827;color:#fff;padding:16px 20px;">
        <h2 style="margin:0;font-size:18px;">Welcome to ${safe(gymName || 'your gym')}</h2>
        <div style="opacity:0.85;font-size:12px;">Your ${roleLabel} account has been created</div>
      </div>
      <div style="padding:16px 20px;">
        <p style="margin:0 0 10px 0;">Hello ${safe(userName)},</p>
        <p style="margin:0 0 12px 0;">We're excited to have you at <strong>${safe(gymName || 'your gym')}</strong>! Here are your account details:</p>

        <h3 style="margin:16px 0 8px 0;">Account Summary</h3>
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#6b7280;">Role</td><td style="padding:6px 0;text-align:right;">${roleLabel}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Name</td><td style="padding:6px 0;text-align:right;">${safe(userData?.name || userName)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;text-align:right;">${safe(userData?.email || to)}</td></tr>
          ${userData?.phone ? `<tr><td style="padding:6px 0;color:#6b7280;">Phone</td><td style="padding:6px 0;text-align:right;">${safe(userData.phone)}</td></tr>` : ''}
          ${trainerName ? `<tr><td style="padding:6px 0;color:#6b7280;">Assigned Trainer</td><td style="padding:6px 0;text-align:right;">${safe(trainerName)}</td></tr>` : ''}
        </table>

        ${userRole === 'member' ? `
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:14px 0;" />
        <h3 style="margin:0 0 12px 0;">Membership Details</h3>
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          ${userData?.planType ? `<tr><td style="padding:6px 0;color:#6b7280;">Plan</td><td style="padding:6px 0;text-align:right;">${safe(userData.planType)}</td></tr>` : ''}
          ${userData?.membershipType ? `<tr><td style="padding:6px 0;color:#6b7280;">Membership Type</td><td style="padding:6px 0;text-align:right;">${safe(userData.membershipType)}</td></tr>` : ''}
          ${userData?.membershipDuration ? `<tr><td style="padding:6px 0;color:#6b7280;">Duration</td><td style="padding:6px 0;text-align:right;">${safe(userData.membershipDuration)} month(s)</td></tr>` : ''}
          ${(userData?.membershipStartDate || userData?.membershipEndDate) ? `<tr><td style="padding:6px 0;color:#6b7280;">Membership Period</td><td style="padding:6px 0;text-align:right;">${dateStr(userData.membershipStartDate)} → ${dateStr(userData.membershipEndDate)}</td></tr>` : ''}
          ${userData?.membershipStatus ? `<tr><td style="padding:6px 0;color:#6b7280;">Status</td><td style="padding:6px 0;text-align:right;">${safe(userData.membershipStatus)}</td></tr>` : ''}
          ${userData?.goal ? `<tr><td style="padding:6px 0;color:#6b7280;">Goal</td><td style="padding:6px 0;text-align:right;">${safe(userData.goal)}</td></tr>` : ''}
        </table>
        ` : ''}

        ${userRole === 'trainer' ? `
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:14px 0;" />
        <h3 style="margin:0 0 12px 0;">Trainer Details</h3>
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          ${userData?.trainerFee ? `<tr><td style="padding:6px 0;color:#6b7280;">Trainer Fee</td><td style="padding:6px 0;text-align:right;">${safe(userData.trainerFee)}</td></tr>` : ''}
          ${userData?.whatsapp ? `<tr><td style="padding:6px 0;color:#6b7280;">WhatsApp</td><td style="padding:6px 0;text-align:right;">${safe(userData.whatsapp)}</td></tr>` : ''}
          ${userData?.address ? `<tr><td style="padding:6px 0;color:#6b7280;">Address</td><td style="padding:6px 0;text-align:right;">${safe(userData.address)}</td></tr>` : ''}
        </table>
        ` : ''}
      </div>
      <div style="background:#f9fafb;color:#6b7280;padding:12px 20px;font-size:12px;">
        <div style="margin-bottom:6px;color:#111827;">
          <strong>Stay motivated!</strong> Small steps every day lead to big results. — ${safe(gymName || 'Your Gym')}
        </div>
        Need help? You can reply to this email to reach ${safe(gymOwnerName)} (${safe(gymOwnerEmail)}).
      </div>
    </div>
  </div>`;

  try {
    const info = await transporter.sendMail({ from, to, subject, html });
    return { sent: true, messageId: info?.messageId };
  } catch (err) {
    console.error('[emailService] Failed to send user creation receipt:', err?.message);
    return { sent: false, reason: err?.message };
  }
};