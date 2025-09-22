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

  // Generate Half-A4 receipt PDF using shared utility
  const handleOkGeneratePDF = async (e) => {
    e.preventDefault();
    if (!selectedMember) {
      toast.error('Please select a member.');
      return;
    }
    const data = buildReceiptData();
    try {
      await (await import('@/utils/pdfUtils')).generateHalfA4ReceiptPDF(data, { gymTitle: 'GYM PAYMENT RECEIPT' });
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
              <div id="receipt-content" className="print:shadow-none print:border-none print:p-2">
                <div className="mb-2 text-center font-bold">Preview (Half A4)</div>
                <div className="border rounded-md overflow-hidden">
                  <div className="bg-white">
                    {/* Use shared preview component for consistency */}
                    {/* eslint-disable-next-line react/jsx-no-undef */}
                    {(() => {
                      const Preview = require('@/components/payments/ReceiptPreviewHalfA4').default;
                      return <Preview data={receiptData} gymTitle={'GYM PAYMENT RECEIPT'} compact={true} />;
                    })()}
                  </div>
                </div>
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
