// Utility functions for PDF generation and lazy-loading jsPDF
// Generates receipts formatted to the upper half of an A4 page (210mm x 297mm / 2 = 148.5mm)

// Lazy-load jsPDF UMD from CDN and return constructor
export const ensureJsPDF = async () => {
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load jsPDF'));
    document.head.appendChild(script);
  });
  return window.jspdf?.jsPDF;
};

// Generate a receipt PDF that fits in the top half of an A4 page
// data: { memberName, memberEmail, amount, planType, duration, paymentMethod, transactionId, notes, periodStart, periodEnd, trainerName }
// options: { gymTitle?: string }
export const generateHalfA4ReceiptPDF = async (data, options = {}) => {
  const jsPDF = await ensureJsPDF();
  if (!jsPDF) throw new Error('jsPDF not available');

  // A4 page in mm
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Layout constants (top half only)
  const pageWidth = 210;
  const pageHeight = 297;
  const halfHeight = pageHeight / 2; // 148.5mm

  const marginLeft = 15;
  const marginRight = pageWidth - 15;
  const contentWidth = pageWidth - marginLeft - (pageWidth - marginRight);
  let y = 18; // start a bit below top

  // Branding header in the top half
  const gymTitle = (options.gymTitle || 'GYM PAYMENT RECEIPT').toUpperCase();
  doc.setDrawColor(30, 41, 59);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginLeft - 5, 8, contentWidth + 10, 18, 3, 3, 'S');

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(gymTitle, pageWidth / 2, y - 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const formattedDate = `${dd}/${mm}/${yy}`;
  doc.text(`Date: ${formattedDate}`, pageWidth / 2, y + 1, { align: 'center' });

  // Section: Member Details
  y = 30;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Member Details', marginLeft, y);
  doc.setDrawColor(59, 130, 246);
  doc.line(marginLeft, y + 1, marginRight, y + 1);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const addRow = (label, value) => {
    const leftX = marginLeft;
    const rightX = marginLeft + 32; // label width ~32mm
    doc.setFont('helvetica', 'bold');
    doc.text(String(label), leftX, y);
    doc.setFont('helvetica', 'normal');
    const text = String(value || '');
    doc.text(text, rightX, y, { maxWidth: contentWidth - (rightX - marginLeft) });
    y += 6;
  };

  addRow('Name:', data.memberName);
  addRow('Email:', data.memberEmail);
  if (data.trainerName) addRow('Trainer:', data.trainerName);

  // Section: Payment Details
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Details', marginLeft, y);
  doc.line(marginLeft, y + 1, marginRight, y + 1);
  y += 6;
  doc.setFont('helvetica', 'normal');

  addRow('Plan:', data.planType);
  addRow('Duration:', `${data.duration || '0'} month(s)`);
  addRow('Method:', data.paymentMethod);

  // Amount styled
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`Amount: ₹${data.amount || '0'}`, marginLeft, y);
  y += 6;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');

  addRow('Period:', `${data.periodStart || ''} to ${data.periodEnd || ''}`);
  if (data.transactionId) addRow('Txn ID:', data.transactionId);
  if (data.notes) {
    const label = 'Notes:';
    doc.setFont('helvetica', 'bold');
    doc.text(label, marginLeft, y);
    doc.setFont('helvetica', 'normal');
    const rightX = marginLeft + 32;
    const lines = doc.splitTextToSize(String(data.notes), contentWidth - (rightX - marginLeft));
    doc.text(lines, rightX, y);
    y += Math.max(6, lines.length * 5.5);
  }

  // Footer inside top half
  y = Math.min(halfHeight - 10, y + 6);
  doc.setDrawColor(203, 213, 225);
  doc.line(marginLeft, y, marginRight, y);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Thank you for your payment!', pageWidth / 2, y + 6, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Powered by Gym Management System', pageWidth / 2, y + 11, { align: 'center' });

  const safeName = (data.memberName || 'Member').replace(/\s+/g, '_');
  doc.save(`Receipt_${safeName}_${Date.now()}.pdf`);
};