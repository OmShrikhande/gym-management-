import { useState, useEffect } from "react";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { useAuth } from "@/contexts/AuthContext";

// Currency formatter for INR
const formatINR = (amount = 0) => {
  try {
    return Number(amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  } catch (e) {
    return `₹${Number(amount || 0).toFixed(2)}`;
  }
};

export default function MemberPaymentsSection() {
  const { user, isGymOwner, authFetch } = useAuth();
  const [memberPayments, setMemberPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [paymentFilters, setPaymentFilters] = useState({
    memberName: '',
    planType: '',
    methodGroup: 'all',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [paymentStats, setPaymentStats] = useState({
    totalAmount: 0,
    totalPayments: 0,
    uniqueMembers: 0,
    cashTotal: 0,
    cashCount: 0,
    onlineTotal: 0,
    onlineCount: 0
  });
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);

  // Load member payments
  useEffect(() => {
    if (!isGymOwner) return;
    setIsLoadingPayments(true);
    authFetch(`/payments/member-payments?month=${paymentFilters.month}&year=${paymentFilters.year}&planType=${encodeURIComponent(paymentFilters.planType || '')}&methodGroup=${paymentFilters.methodGroup || 'all'}`)
      .then(res => {
        if (res.success) {
          const payments = res.data?.payments || [];
          setMemberPayments(payments);
        } else {
          setMemberPayments([]);
        }
      })
      .catch(() => setMemberPayments([]))
      .finally(() => setIsLoadingPayments(false));
  }, [isGymOwner, paymentFilters.month, paymentFilters.year, paymentFilters.planType, paymentFilters.methodGroup, authFetch]);

  // Filter payments and calculate stats
  useEffect(() => {
    if (!memberPayments.length) {
      setFilteredPayments([]);
      setPaymentStats({ totalAmount: 0, totalPayments: 0, uniqueMembers: 0, cashTotal: 0, cashCount: 0, onlineTotal: 0, onlineCount: 0 });
      return;
    }
    const normalize = (m) => (m || '').toString().trim().toLowerCase();
    const isCash = (m) => ['cash', 'hand cash', 'hand-cash', 'cash_payment', 'cashpayment'].includes(normalize(m));
    let baseFiltered = [...memberPayments];
    if (paymentFilters.memberName.trim()) {
      const searchTerm = paymentFilters.memberName.toLowerCase();
      baseFiltered = baseFiltered.filter(payment =>
        (payment.memberName || '').toLowerCase().includes(searchTerm) ||
        (payment.memberEmail || '').toLowerCase().includes(searchTerm)
      );
    }
    if (paymentFilters.planType) {
      baseFiltered = baseFiltered.filter(payment => payment.planType === paymentFilters.planType);
    }
    // Date filtering handled by backend (to avoid timezone issues)
    const totalAmount = baseFiltered.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    const uniqueMembers = new Set(baseFiltered.map(payment => payment.memberId)).size;
    const cashPayments = baseFiltered.filter(p => isCash(p.paymentMethod));
    const onlinePayments = baseFiltered.filter(p => !isCash(p.paymentMethod));
    setPaymentStats({
      totalAmount,
      totalPayments: baseFiltered.length,
      uniqueMembers,
      cashTotal: cashPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
      cashCount: cashPayments.length,
      onlineTotal: onlinePayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
      onlineCount: onlinePayments.length,
    });
    let tableFiltered = [...baseFiltered];
    if (paymentFilters.methodGroup && paymentFilters.methodGroup !== 'all') {
      if (paymentFilters.methodGroup === 'cash') {
        tableFiltered = tableFiltered.filter(p => isCash(p.paymentMethod));
      } else if (paymentFilters.methodGroup === 'online') {
        tableFiltered = tableFiltered.filter(p => !isCash(p.paymentMethod));
      }
    }
    setFilteredPayments(tableFiltered);
  }, [memberPayments, paymentFilters]);

  // Filter handlers
  const handleFilterChange = (field, value) => {
    setPaymentFilters(prev => ({ ...prev, [field]: value }));
    if (field === 'memberName') {
      const name = String(value || '').toLowerCase();
      const filtered = name ? memberPayments.filter(p => (p.memberName || '').toLowerCase().includes(name)) : memberPayments;
      setFilteredPayments(filtered);
    }
  };

  // Excel export
  const exportPaymentsToExcel = () => {
    if (!filteredPayments.length) {
      toast.error('No payment data to export');
      return;
    }
    const excelData = filteredPayments.map(payment => ({
      'Member Name': payment.memberName,
      'Payment Date': new Date(payment.paymentDate).toLocaleDateString('en-IN'),
      'Amount (₹)': payment.amount,
      'Plan Type': payment.planType,
      'Duration (Months)': payment.duration,
      'Plan Cost (₹)': payment.planCost,
      'Trainer Cost (₹)': payment.trainerCost,
      'Payment Method': payment.paymentMethod,
      'Reference ID': payment.referenceId,
      'Status': payment.status,
      'Member Email': payment.memberEmail,
      'Member Phone': payment.memberPhone
    }));
    const summaryData = [
      {},
      {
        'Member Name': 'SUMMARY',
        'Payment Date': '',
        'Amount (₹)': paymentStats.totalAmount,
        'Plan Type': `${paymentStats.totalPayments} payments`,
        'Duration (Months)': `${paymentStats.uniqueMembers} members`,
        'Plan Cost (₹)': '',
        'Trainer Cost (₹)': '',
        'Payment Method': '',
        'Reference ID': '',
        'Status': '',
        'Member Email': '',
        'Member Phone': ''
      }
    ];
    const finalData = [...excelData, ...summaryData];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(finalData);
    ws['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Member Payments');
    const monthName = new Date(paymentFilters.year, paymentFilters.month - 1).toLocaleString('default', { month: 'long' });
    const filename = `Member_Payments_${monthName}_${paymentFilters.year}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success('Payment report exported to Excel successfully');
  };

  // Get unique plan types for filter dropdown
  const uniquePlanTypes = [...new Set(memberPayments.map(payment => payment.planType))].filter(Boolean);

  return (
    <>
      <CardHeader>
        <CardTitle className="text-white">Member Payments</CardTitle>
        <CardDescription className="text-gray-400">View and filter member payment records</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 bg-green-900/30 p-4 rounded-lg flex flex-col items-center border border-green-800">
            <span className="text-gray-300 text-sm">Online Payments</span>
            <span className="text-2xl font-bold text-white">{formatINR(paymentStats.onlineTotal || 0)}</span>
            <span className="text-green-400 text-xs">{paymentStats.onlineCount || 0} payments</span>
          </div>
          <div className="flex-1 bg-yellow-900/30 p-4 rounded-lg flex flex-col items-center border border-yellow-800">
            <span className="text-gray-300 text-sm">Cash Payments</span>
            <span className="text-2xl font-bold text-white">{formatINR(paymentStats.cashTotal || 0)}</span>
            <span className="text-yellow-400 text-xs">{paymentStats.cashCount || 0} payments</span>
          </div>
        </div>
        <div className="flex gap-2 mb-4">
          <Button
            variant={paymentFilters.methodGroup === 'all' ? 'default' : 'outline'}
            className="border-gray-600 text-gray-300"
            onClick={() => handleFilterChange('methodGroup', 'all')}
          >All</Button>
          <Button
            variant={paymentFilters.methodGroup === 'cash' ? 'default' : 'outline'}
            className="border-gray-600 text-gray-300"
            onClick={() => handleFilterChange('methodGroup', 'cash')}
          >Cash</Button>
          <Button
            variant={paymentFilters.methodGroup === 'online' ? 'default' : 'outline'}
            className="border-gray-600 text-gray-300"
            onClick={() => handleFilterChange('methodGroup', 'online')}
          >Online</Button>
          <Input
            placeholder="Search by name..."
            value={paymentFilters.memberName}
            onChange={e => handleFilterChange('memberName', e.target.value)}
            className="ml-auto w-56 bg-gray-700 border-gray-600 text-white"
          />
          <Button
            className="bg-blue-600 hover:bg-blue-700 ml-2"
            onClick={exportPaymentsToExcel}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
        <div className="rounded-md border border-gray-700 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700 hover:bg-gray-800/50">
                <TableHead className="text-gray-300">Name</TableHead>
                <TableHead className="text-gray-300">Email</TableHead>
                <TableHead className="text-gray-300">Payment Method</TableHead>
                <TableHead className="text-gray-300 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingPayments ? (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-400">Loading...</TableCell></TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-400">No payments found.</TableCell></TableRow>
              ) : (
                filteredPayments.map(payment => (
                  <TableRow key={payment.id} className="border-gray-700 hover:bg-gray-800/30">
                    <TableCell className="text-white">{payment.memberName}</TableCell>
                    <TableCell className="text-white">{payment.memberEmail}</TableCell>
                    <TableCell className="text-white capitalize">{payment.paymentMethod}</TableCell>
                    <TableCell className="text-white text-right">{formatINR(payment.amount)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </>
  );
}
