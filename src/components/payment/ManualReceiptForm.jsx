import React, { useState, useEffect } from 'react';
import { Calendar, Mail, User, CreditCard, DollarSign, FileText, Printer, Send } from 'lucide-react';
import apiClient from '@/lib/apiClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

const ManualReceiptForm = ({ onReceiptSent }) => {
  const [formData, setFormData] = useState({
    memberEmail: '',
    memberName: '',
    amount: '',
    planType: 'Basic',
    duration: '1',
    paymentMethod: 'Cash',
    transactionId: '',
    notes: '',
    periodStart: new Date().toISOString().split('T')[0],
    periodEnd: '',
    trainerName: ''
  });

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // AuthContext members (Users collection)
  const { users, user, fetchUsers, authFetch } = useAuth();

  // Sync members from AuthContext and ensure they are loaded
  useEffect(() => {
    const load = async () => {
      try {
        // Trigger fetch if users not present
        if (!users || users.length === 0) {
          await fetchUsers?.(true);
        }
        // Scope: only members, optionally by owner
        const ownerId = user?.gymId || user?._id;
        const scoped = (users || []).filter(u => u.role === 'member' && (
          !ownerId || u.gymId === ownerId || u.gym === ownerId || u.owner === ownerId
        ));
        setMembers(scoped);
      } catch (e) {
        console.error('Failed to load users from context:', e);
      }
    };
    load();
  }, [users, user, fetchUsers]);

  // Calculate end date automatically when start date or duration changes
  useEffect(() => {
    if (formData.periodStart && formData.duration) {
      const startDate = new Date(formData.periodStart);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + parseInt(formData.duration));
      setFormData(prev => ({
        ...prev,
        periodEnd: endDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.periodStart, formData.duration]);

  // Disabled old API-based member fetch; using AuthContext users instead.
  // useEffect(() => { ... }) removed.

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMemberSelect = (member) => {
    const normalizeMethod = (val) => {
      const s = String(val || '').toLowerCase();
      return s.includes('cash') ? 'Cash' : 'Online';
    };
    const planType = member.planType || member.membershipType || 'Basic';
    const paymentMethod = normalizeMethod(member.paymentMethod || member.paymentMode);
    const duration = String(member.membershipDuration || member.durationMonths || member.duration || formData.duration || '1');
    const amount = String(member.paidAmount || member.agreedAmount || member.planAmount || member.amount || formData.amount || '');
    const start = (member.membershipStartDate || member.joiningDate || formData.periodStart || new Date().toISOString().slice(0,10)).slice(0,10);
    let end = member.membershipEndDate ? member.membershipEndDate.slice(0,10) : '';
    if (!end && start && duration) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + parseInt(duration || '0', 10));
      end = d.toISOString().slice(0,10);
    }

    setFormData(prev => ({
      ...prev,
      memberEmail: member.email,
      memberName: member.name,
      trainerName: member.assignedTrainer?.name || '',
      planType,
      paymentMethod,
      duration,
      amount,
      periodStart: start,
      periodEnd: end
    }));
  };

  // Send manual receipt via backend + record payment; also supports print-only
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      // Basic validation
      if (!formData.memberEmail || !formData.memberName || !formData.amount || !formData.periodStart || !formData.duration) {
        setMessage({ type: 'error', text: 'Please fill all required fields.' });
        return;
      }

      // Ensure periodEnd exists
      let periodEnd = formData.periodEnd;
      if (!periodEnd && formData.periodStart && formData.duration) {
        const d = new Date(formData.periodStart);
        d.setMonth(d.getMonth() + parseInt(formData.duration || '0', 10));
        periodEnd = d.toISOString().slice(0,10);
        setFormData(prev => ({ ...prev, periodEnd }));
      }

      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        duration: parseInt(formData.duration, 10),
        periodEnd
      };

      const res = await authFetch('/payments/send-manual-receipt', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'Receipt sent successfully and recorded.' });
        onReceiptSent?.();
      } else {
        setMessage({ type: 'error', text: res.message || 'Failed to send receipt.' });
      }
    } catch (err) {
      console.error('Manual receipt send failed:', err);
      setMessage({ type: 'error', text: 'Request failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (e) => {
    e.preventDefault();
    window.print();
  };

  // Lazy-load jsPDF UMD from CDN and return constructor
  const ensureJsPDF = async () => {
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

  // Generate small two-column PDF receipt (80mm x 120mm)
  const handleGeneratePDF = async (e) => {
    e.preventDefault();
    try {
      const jsPDF = await ensureJsPDF();
      if (!jsPDF) throw new Error('jsPDF not available');

      const data = { ...formData };

      // Ensure periodEnd is computed if missing
      if (!data.periodEnd && data.periodStart && data.duration) {
        const d = new Date(data.periodStart);
        d.setMonth(d.getMonth() + parseInt(data.duration || '0', 10));
        data.periodEnd = d.toISOString().slice(0,10);
        setFormData(prev => ({ ...prev, periodEnd: data.periodEnd }));
      }

      // Enhanced PDF layout
      const doc = new jsPDF({ unit: 'mm', format: [80, 120] });
      let y = 12;

  // Header: white rectangle with black text + gym owner branding
  doc.setFillColor(255, 255, 255); // White
  doc.roundedRect(5, 5, 70, 20, 3, 3, 'F');
  doc.setDrawColor(30, 41, 59);
  doc.roundedRect(5, 5, 70, 20, 3, 3, 'S');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const gymTitle = (user?.gymName || `${user?.name || 'Gym Owner'}'s Gym`).toUpperCase();
  doc.text(gymTitle, 40, 13, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('GYM PAYMENT RECEIPT', 40, 18, { align: 'center' });
  // Format date as DD/MM/YY
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const formattedDate = `${dd}/${mm}/${yy}`;
  doc.text('Date: ' + formattedDate, 40, 23, { align: 'center' });

      // Main body
      y = 28;
      doc.setTextColor(30, 41, 59); // Slate-900
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Member Details', 8, y);
      doc.setDrawColor(59, 130, 246); // Blue border
      doc.line(7, y + 1, 73, y + 1);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Name:`, 10, y); doc.text(data.memberName || '', 35, y);
      y += 5;
      doc.text(`Email:`, 10, y); doc.text(data.memberEmail || '', 35, y);
      y += 5;
      if (data.trainerName) { doc.text(`Trainer:`, 10, y); doc.text(data.trainerName, 35, y); y += 5; }

      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Details', 8, y);
      doc.line(7, y + 1, 73, y + 1);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(`Plan:`, 10, y); doc.text(data.planType || '', 35, y);
      y += 5;
      doc.text(`Duration:`, 10, y); doc.text(`${data.duration || '0'} month(s)`, 35, y);
      y += 5;
      doc.text(`Method:`, 10, y); doc.text(data.paymentMethod || '', 35, y);
      y += 5;
      doc.text(`Amount:`, 10, y); doc.setFont('helvetica', 'bold'); doc.setTextColor(16, 185, 129); doc.text(`₹${data.amount || '0'}`, 35, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 41, 59);
      y += 5;
      doc.text(`Period:`, 10, y); doc.text(`${data.periodStart || ''} to ${data.periodEnd || ''}`, 35, y);
      y += 5;
      if (data.transactionId) { doc.text(`Txn ID:`, 10, y); doc.text(data.transactionId, 35, y); y += 5; }
      if (data.notes) { doc.text(`Notes:`, 10, y); doc.text(data.notes, 35, y, { maxWidth: 38 }); y += 8; }

      // Footer
      y = 110;
      doc.setDrawColor(203, 213, 225);
      doc.line(10, y, 70, y);
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Thank you for your payment!', 40, y + 6, { align: 'center' });
      doc.setFontSize(8);
      doc.text('Powered by Gym Management System', 40, y + 11, { align: 'center' });

      // Save
      const safeName = (data.memberName || 'Member').replace(/\s+/g, '_');
      doc.save(`Receipt_${safeName}_${Date.now()}.pdf`);

      setMessage({ type: 'success', text: 'PDF generated and downloaded.' });
    } catch (err) {
      console.error('PDF generation failed:', err);
      setMessage({ type: 'error', text: 'PDF generation failed. Falling back to Print.' });
      window.print();
    }
  };

  const planTypes = ['Basic', 'Standard', 'Premium'];
  const paymentMethods = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Razorpay', 'Online'];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-800/50 border border-gray-700 rounded-lg shadow-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
          <FileText className="mr-3 text-blue-400" />
          Manual Receipt (Print Only)
        </h2>
        <p className="text-gray-400">
          Fill the details and print the receipt. Manual email sending is disabled.
        </p>
      </div>

      {message.text && (
        <div className={`mb-4 p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-900/30 text-green-300 border border-green-700' 
            : 'bg-red-900/30 text-red-300 border border-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Member Information */}
        <div className="bg-gray-800/40 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
            <User className="mr-2 text-gray-300" />
            Member Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Member Name *
              </label>
              <input
                type="text"
                name="memberName"
                value={formData.memberName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                list="members-list"
                placeholder="Type to search members..."
              />
              <datalist id="members-list">
                {members.map((member) => (
                  <option key={member._id} value={member.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Member Email *
              </label>
              <input
                type="email"
                name="memberEmail"
                value={formData.memberEmail}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="member@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Assigned Trainer
              </label>
              <input
                type="text"
                name="trainerName"
                value={formData.trainerName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Trainer name (optional)"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Quick Select Member
              </label>
              <select 
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const selectedMember = members.find(m => m._id === e.target.value);
                  if (selectedMember) handleMemberSelect(selectedMember);
                }}
              >
                <option value="">-- Select a member --</option>
                {members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="bg-gray-800/40 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
            <DollarSign className="mr-2 text-gray-300" />
            Payment Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount *
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="0"
                step="0.01"
                placeholder="₹0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Plan Type *
              </label>
              <select
                name="planType"
                value={formData.planType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {planTypes.map(plan => (
                  <option key={plan} value={plan}>{plan}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Duration (months) *
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="1"
                max="12"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Method
              </label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {paymentMethods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Transaction ID
              </label>
              <input
                type="text"
                name="transactionId"
                value={formData.transactionId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional transaction ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Membership Period Start *
              </label>
              <input
                type="date"
                name="periodStart"
                value={formData.periodStart}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes for the receipt..."
            />
          </div>
        </div>

        {/* Preview Section */}
        <div className="bg-blue-900/20 p-6 rounded-lg border border-blue-800">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-blue-300">
            <Printer className="mr-2" />
            Receipt Preview (Printable)
          </h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-200">
            <div>
              <p><strong>Member:</strong> {formData.memberName || 'Not specified'}</p>
              <p><strong>Email:</strong> {formData.memberEmail || 'Not specified'}</p>
              <p><strong>Amount:</strong> ₹{formData.amount || '0'}</p>
              <p><strong>Plan:</strong> {formData.planType} ({formData.duration} month{formData.duration > 1 ? 's' : ''})</p>
            </div>
            <div>
              <p><strong>Payment Method:</strong> {formData.paymentMethod}</p>
              <p><strong>Transaction ID:</strong> {formData.transactionId || 'Auto-generated'}</p>
              <p><strong>Period:</strong> {formData.periodStart} to {formData.periodEnd || 'Calculating...'}</p>
              <p><strong>Trainer:</strong> {formData.trainerName || 'Not assigned'}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleGeneratePDF}
            disabled={!formData.memberEmail || !formData.memberName || !formData.amount}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            title="Generate compact PDF receipt"
          >
            OK (Generate PDF)
          </button>
        </div>
      </form>
    </div>
  );
};

export default ManualReceiptForm;