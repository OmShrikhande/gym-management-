import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const ManualReceiptModal = ({ show, onClose }) => {
  const { authFetch } = useAuth();
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    planType: '',
    duration: '',
    paymentMethod: 'Cash',
    transactionId: '',
    notes: '',
    periodStart: '',
    periodEnd: ''
  });
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await authFetch('/payments/members-for-receipt');
        if (response.data.members) {
          setMembers(response.data.members);
        }
      } catch (error) {
        console.error('Error fetching members:', error);
        toast.error('Failed to fetch members for receipt.');
      }
    };
    if (show) fetchMembers();
  }, [show, authFetch]);

  const handleMemberChange = (e) => {
    const memberId = e.target.value;
    const member = members.find(m => m._id === memberId);
    setSelectedMember(member);

    if (member) {
      const normalizeMethod = (val) => {
        const s = String(val || '').toLowerCase();
        return s.includes('cash') ? 'Cash' : 'Online';
      };
      const planType = member.planType || member.membershipType || '';
      const paymentMethod = normalizeMethod(member.paymentMethod || member.paymentMode);
      const duration = String(member.membershipDuration || member.durationMonths || member.duration || '1');
      const amount = String(member.paidAmount || member.agreedAmount || member.planAmount || member.amount || '');
      const start = (member.membershipStartDate || member.joiningDate || new Date().toISOString().slice(0,10)).slice(0,10);
      let end = member.membershipEndDate ? member.membershipEndDate.slice(0,10) : '';
      if (!end && start && duration) {
        const d = new Date(start);
        d.setMonth(d.getMonth() + parseInt(duration || '0', 10));
        end = d.toISOString().slice(0,10);
      }
      setFormData(prev => ({
        ...prev,
        amount,
        planType,
        paymentMethod,
        duration,
        periodStart: start,
        periodEnd: end,
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Build unified receipt data from current form + selected member
  const buildReceiptData = () => {
    if (!selectedMember) return null;
    let { periodStart, periodEnd, duration } = formData;
    if (periodStart && (!periodEnd || periodEnd.length === 0)) {
      const d = new Date(periodStart);
      d.setMonth(d.getMonth() + parseInt(duration || '0', 10));
      periodEnd = d.toISOString().slice(0,10);
    }
    return {
      ...formData,
      periodStart,
      periodEnd,
      memberEmail: selectedMember.email,
      memberName: selectedMember.name,
      trainerName: selectedMember.assignedTrainer?.name || 'N/A'
    };
  };

  const handlePreview = (e) => {
    e.preventDefault();
    if (!selectedMember) {
      toast.error('Please select a member.');
      return;
    }
    const data = buildReceiptData();
    setReceiptData(data);
    setShowReceipt(true);
  };

  // Lazy-load jsPDF from CDN if needed
  const ensureJsPDF = () => new Promise((resolve, reject) => {
    if (window.jspdf?.jsPDF) return resolve(window.jspdf.jsPDF);
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => resolve(window.jspdf?.jsPDF);
    script.onerror = () => reject(new Error('Failed to load jsPDF'));
    document.body.appendChild(script);
  });

  const handleOkGeneratePDF = async (e) => {
    e.preventDefault();
    if (!selectedMember) {
      toast.error('Please select a member.');
      return;
    }
    const data = buildReceiptData();
    try {
      const jsPDF = await ensureJsPDF();
      if (!jsPDF) throw new Error('PDF library unavailable');
      // Small receipt: 80mm x 120mm
      const doc = new jsPDF({ unit: 'mm', format: [80, 120] });
      let y = 10;
      const leftX = 6;
      const rightX = 40;
      doc.setFontSize(12);
      doc.text('Payment Receipt', 40, y, { align: 'center' });
      y += 8;
      doc.setFontSize(9);
      const addRow = (label, value) => {
        doc.text(String(label), leftX, y);
        doc.text(String(value ?? ''), rightX, y);
        y += 6;
      };
      addRow('Member', data.memberName);
      addRow('Email', data.memberEmail);
      addRow('Plan', data.planType);
      addRow('Duration', `${data.duration} mo`);
      addRow('Method', data.paymentMethod);
      addRow('Amount', `₹${data.amount}`);
      addRow('Period', `${data.periodStart} to ${data.periodEnd}`);
      if (data.transactionId) addRow('Txn ID', data.transactionId);
      if (data.notes) addRow('Notes', data.notes);
      doc.setFontSize(8);
      doc.text('Thank you!', 40, y + 2, { align: 'center' });
      doc.save(`Receipt_${data.memberName?.replace(/\s+/g,'_') || 'Member'}_${Date.now()}.pdf`);
      setReceiptData(data);
      setShowReceipt(true);
      toast.success('PDF generated');
    } catch (err) {
      console.error('PDF generation failed, falling back to print:', err);
      setReceiptData(data);
      setShowReceipt(true);
      toast.warning('PDF generation failed. Use Print instead.');
    }
  };

const handlePrint = () => {
  if (!receiptData) return;

  const receiptHTML = document.getElementById('receipt-content').outerHTML;

  // Create a completely isolated window
  const printWindow = window.open('', '_blank', 'width=400,height=600');

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; background: white; }
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          td { padding: 6px 10px; vertical-align: top; }
          td:first-child { font-weight: bold; width: 40%; }
          .thank-you { text-align: center; margin-top: 10px; font-weight: bold; }
        </style>
      </head>
      <body>
        ${receiptHTML}
      </body>
    </html>
  `);
  printWindow.document.close();

  // Wait for the popup DOM to load before printing
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };
};


  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gray-800/80 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative text-white" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10">
          <X className="h-6 w-6" />
        </button>
        <div className="p-8">
          {!showReceipt ? (
            <>
              <h2 className="text-2xl font-bold mb-6">Manual Receipt (Print Only)</h2>
              <form className="space-y-6">
                <div>
                  <Label htmlFor="member" className="mb-2 block text-gray-300">Select Member *</Label>
                  <select id="member" name="member" onChange={handleMemberChange} className="w-full bg-gray-700 border-gray-600 focus:border-blue-500 rounded-md p-2" required>
                    <option value="">-- Select a Member --</option>
                    {members.map(member => (
                      <option key={member._id} value={member._id}>{member.name} ({member.email})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="amount" className="mb-2 block text-gray-300">Amount *</Label>
                    <Input type="number" id="amount" name="amount" value={formData.amount} onChange={handleInputChange} required />
                  </div>
                  <div>
                    <Label htmlFor="planType" className="mb-2 block text-gray-300">Plan Type *</Label>
                    <Input type="text" id="planType" name="planType" value={formData.planType} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="duration" className="mb-2 block text-gray-300">Duration (months) *</Label>
                    <Input type="number" id="duration" name="duration" value={formData.duration} onChange={handleInputChange} required />
                  </div>
                  <div>
                    <Label htmlFor="paymentMethod" className="mb-2 block text-gray-300">Payment Method *</Label>
                    <select id="paymentMethod" name="paymentMethod" value={formData.paymentMethod} onChange={handleInputChange} className="w-full bg-gray-700 border-gray-600 focus:border-blue-500 rounded-md p-2" required>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Razorpay">Razorpay</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="periodStart" className="mb-2 block text-gray-300">Period Start *</Label>
                    <Input type="date" id="periodStart" name="periodStart" value={formData.periodStart} onChange={handleInputChange} required />
                  </div>
                  <div>
                    <Label htmlFor="periodEnd" className="mb-2 block text-gray-300">Period End *</Label>
                    <Input type="date" id="periodEnd" name="periodEnd" value={formData.periodEnd} onChange={handleInputChange} required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="transactionId" className="mb-2 block text-gray-300">Transaction ID (optional)</Label>
                  <Input type="text" id="transactionId" name="transactionId" value={formData.transactionId} onChange={handleInputChange} />
                </div>
                <div>
                  <Label htmlFor="notes" className="mb-2 block text-gray-300">Notes (optional)</Label>
                  <textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} className="w-full bg-gray-700 border-gray-600 focus:border-blue-500 rounded-md p-2 min-h-[100px]" />
                </div>
                <div className="flex justify-end pt-4 gap-2">
                  <Button type="button" onClick={onClose} variant="ghost" className="mr-2">Cancel</Button>
                  <Button type="button" variant="outline" onClick={handlePreview}>Preview</Button>
                  <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={handleOkGeneratePDF}>OK (Generate PDF)</Button>
                </div>
              </form>
            </>
          ) : (
            <div className="print:bg-white print:text-black">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold">Payment Receipt</h2>
                <Button onClick={() => setShowReceipt(false)} variant="ghost" className="print:hidden">Edit</Button>
              </div>
              <div id="receipt-content" className="bg-white text-black rounded-lg shadow p-4 print:shadow-none print:border-none print:p-2" style={{maxWidth:'400px', margin:'0 auto'}}>
                <table className="w-full text-sm">
                  <tbody>
                    <tr><td className="font-semibold">Member:</td><td>{receiptData?.memberName}</td></tr>
                    <tr><td className="font-semibold">Plan:</td><td>{receiptData?.planType}</td></tr>
                    <tr><td className="font-semibold">Duration:</td><td>{receiptData?.duration} mo</td></tr>
                    <tr><td className="font-semibold">Method:</td><td>{receiptData?.paymentMethod}</td></tr>
                    <tr><td className="font-semibold">Amount:</td><td>₹{receiptData?.amount}</td></tr>
                    <tr><td className="font-semibold">Period:</td><td>{receiptData?.periodStart} to {receiptData?.periodEnd}</td></tr>
                    {receiptData?.transactionId && <tr><td className="font-semibold">Transaction ID:</td><td>{receiptData.transactionId}</td></tr>}
                    {receiptData?.notes && <tr><td className="font-semibold">Notes:</td><td>{receiptData.notes}</td></tr>}
                  </tbody>
                </table>
                <div className="mt-3 text-center text-xs font-bold">Thank you!</div>
              </div>
              <div className="flex justify-end mt-4 gap-2 print:hidden">
                <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700">Print Receipt</Button>
                <Button onClick={onClose} variant="ghost">Close</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManualReceiptModal;
