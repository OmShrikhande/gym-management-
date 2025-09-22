import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import AddMemberPayment from "@/components/payments/AddMemberPayment";

// Currency formatter for INR (local to component)
const formatINR = (amount = 0) => {
  try {
    return Number(amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  } catch (e) {
    return `₹${Number(amount || 0).toFixed(2)}`;
  }
};

// Build query string compatible with backend (supports monthly via month/year, others via start/end)
const buildQuery = (filters, forStats = false) => {
  const { timeframe, refDate, month, year, planType, methodGroup, memberName } = filters || {};

  const params = new URLSearchParams();

  if (timeframe === 'monthly' || (!timeframe && month && year)) {
    params.set('month', String(month));
    params.set('year', String(year));
  } else if (timeframe) {
    // compute range
    const d = refDate ? new Date(refDate) : new Date();
    if (timeframe === 'daily') {
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
      const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59));
      params.set('startDate', start.toISOString());
      params.set('endDate', end.toISOString());
    } else if (timeframe === 'weekly') {
      const day = d.getUTCDay();
      const diffToMonday = (day + 6) % 7;
      const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
      monday.setUTCDate(monday.getUTCDate() - diffToMonday);
      const sunday = new Date(monday);
      sunday.setUTCDate(sunday.getUTCDate() + 6);
      sunday.setUTCHours(23, 59, 59, 0);
      params.set('startDate', monday.toISOString());
      params.set('endDate', sunday.toISOString());
    } else if (timeframe === 'yearly') {
      const y = parseInt(year || String(new Date().getFullYear()), 10);
      const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
      const end = new Date(Date.UTC(y, 11, 31, 23, 59, 59));
      params.set('startDate', start.toISOString());
      params.set('endDate', end.toISOString());
    }
  }

  if (planType) params.set('planType', planType);
  if (methodGroup) params.set('methodGroup', methodGroup);
  if (!forStats && memberName) params.set('memberName', memberName);

  return params.toString();
};

const MemberPaymentsSection = ({ filters: parentFilters }) => {
  const { isGymOwner, authFetch, users, user } = useAuth();

  // Local-only controls: name search and method toggle can override parent
  const [paymentFilters, setPaymentFilters] = useState({
    memberName: '',
    methodGroup: 'all', // all | cash | online
  });

  // Merge parent filters with local overrides
  const effectiveFilters = useMemo(() => ({
    timeframe: parentFilters?.timeframe,
    refDate: parentFilters?.refDate,
    month: parentFilters?.month ?? (new Date().getMonth() + 1),
    year: parentFilters?.year ?? new Date().getFullYear(),
    planType: parentFilters?.planType || '',
    methodGroup: paymentFilters.methodGroup || parentFilters?.methodGroup || 'all',
    memberName: paymentFilters.memberName || '',
  }), [parentFilters, paymentFilters]);

  const [memberPayments, setMemberPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [paymentStats, setPaymentStats] = useState({
    totalAmount: 0,
    totalPayments: 0,
    uniqueMembers: 0,
    onlineTotal: 0,
    cashTotal: 0,
    onlineCount: 0,
    cashCount: 0,
  });
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!isGymOwner) return;
    setIsRefreshing(true);
    try {
      const res = await authFetch('/payments/member-payments/refresh', { method: 'POST' });
      if (res?.status === 'success' || res?.success) {
        toast.success('Payments refreshed');
        await loadPaymentsData();
      } else {
        toast.error(res?.message || 'Refresh failed');
      }
    } catch (e) {
      toast.error(e?.message || 'Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Pagination (10 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = useMemo(() => Math.max(1, Math.ceil((filteredPayments?.length || 0) / pageSize)), [filteredPayments]);
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return (filteredPayments || []).slice(start, start + pageSize);
  }, [filteredPayments, currentPage]);

  // Reset page when filters change or when result size shrinks below current page range
  useEffect(() => {
    const max = Math.max(1, Math.ceil((filteredPayments?.length || 0) / pageSize));
    if (currentPage > max) setCurrentPage(1);
  }, [filteredPayments]);

  // Compute members registered under current gym owner
  const ownerId = user?._id;
  const ownerMemberIds = useMemo(() => {
    const all = users || [];
    const membersUnderOwner = ownerId
      ? all.filter(u => u.role === 'member' && (u.gym === ownerId || u.gymId === ownerId || u.owner === ownerId))
      : all.filter(u => u.role === 'member');
    return new Set(membersUnderOwner.map(m => m._id));
  }, [users, ownerId]);

  // Load payments list from backend (each payment entry)
  const loadPaymentsData = async () => {
    setIsLoadingPayments(true);
    setPaymentError(null);
    try {
      const query = buildQuery(effectiveFilters, false);
      const res = await authFetch(`/payments/member-payments?${query}`);
      if (res?.success || res?.status === 'success') {
        const list = res.data?.payments || [];

        // Normalize payment mode
        const normalizeMode = (val) => {
          const raw = String(val || '').toLowerCase();
          if (!raw) return 'online';
          if (raw.includes('cash')) return 'cash';
          const onlineAliases = ['online','upi','card','razorpay','stripe','netbanking','wallet','gpay','phonepe','paytm'];
          return onlineAliases.includes(raw) ? 'online' : 'online';
        };

        // Transform API payments -> table rows
        const rows = list.map(p => ({
          id: p.id || p._id,
          memberId: p.memberId || p.member?._id || p.memberDetails?._id || p.member?._id,
          memberName: p.memberDetails?.name || p.memberName || 'Unknown Member',
          memberEmail: p.memberDetails?.email || p.memberEmail || 'N/A',
          memberPhone: p.memberDetails?.phone || p.memberPhone || 'N/A',
          paymentDate: p.paymentDate || p.createdAt || null,
          amount: Number(p.amount || 0),
          planType: p.planType || p.plan || 'N/A',
          paymentMode: normalizeMode(p.paymentMethod || p.method),
        }));

        // Apply local filters
        const name = (effectiveFilters.memberName || '').toLowerCase();
        const afterName = name ? rows.filter(p => (p.memberName || '').toLowerCase().includes(name)) : rows;
        const methodGroup = effectiveFilters.methodGroup || 'all';
        const finalFiltered = methodGroup === 'all' ? afterName : afterName.filter(p => p.paymentMode === methodGroup);

        // Stats
        const sum = arr => arr.reduce((s, x) => s + Number(x.amount || 0), 0);
        const onlineArr = finalFiltered.filter(p => p.paymentMode === 'online');
        const cashArr = finalFiltered.filter(p => p.paymentMode === 'cash');
        setPaymentStats({
          totalAmount: sum(finalFiltered),
          totalPayments: finalFiltered.length,
          uniqueMembers: new Set(finalFiltered.map(p => p.memberId || p.memberEmail || p.memberName)).size,
          onlineTotal: sum(onlineArr),
          cashTotal: sum(cashArr),
          onlineCount: onlineArr.length,
          cashCount: cashArr.length,
        });

        setMemberPayments(rows);
        setFilteredPayments(finalFiltered);
      } else {
        setMemberPayments([]);
        setFilteredPayments([]);
      }
    } catch (err) {
      console.error('Failed to load payments list:', err);
      setPaymentError(err?.message || 'Failed to load payment data');
      setMemberPayments([]);
      setFilteredPayments([]);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  // Auto-load when filters change
  useEffect(() => {
    if (!isGymOwner) return;
    loadPaymentsData();
  }, [isGymOwner, effectiveFilters.timeframe, effectiveFilters.refDate, effectiveFilters.month, effectiveFilters.year, effectiveFilters.planType, effectiveFilters.methodGroup, effectiveFilters.memberName, authFetch]);

  // Filter handlers (local overrides)
  const handleFilterChange = (field, value) => {
    setPaymentFilters(prev => ({ ...prev, [field]: value }));
    if (field === 'memberName') {
      const name = String(value || '').toLowerCase();
      const filtered = name ? memberPayments.filter(p => (p.memberName || '').toLowerCase().includes(name)) : memberPayments;
      setFilteredPayments(filtered);
    }
  };

  const handlePaymentAdded = () => {
    toast.success('Payment added');
    setShowAddPayment(false);
    loadPaymentsData();
  };

  if (!isGymOwner) return null;

  return (
    <Card className="bg-gray-800/50 border-gray-700 mt-10">
      <CardHeader>
        <CardTitle className="text-white">Member Payments</CardTitle>
        <CardDescription className="text-gray-400">View and filter member payment records</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stats Row */}
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

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={effectiveFilters.methodGroup === 'all' ? 'default' : 'outline'}
            className="border-gray-600 text-gray-300"
            onClick={() => handleFilterChange('methodGroup', 'all')}
          >All</Button>
          <Button
            variant={effectiveFilters.methodGroup === 'cash' ? 'default' : 'outline'}
            className="border-gray-600 text-gray-300"
            onClick={() => handleFilterChange('methodGroup', 'cash')}
          >Cash</Button>
          <Button
            variant={effectiveFilters.methodGroup === 'online' ? 'default' : 'outline'}
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
            variant="outline"
            className="border-gray-600 text-gray-300"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoadingPayments}
          >{isRefreshing ? 'Refreshing...' : 'Refresh'}</Button>
        </div>

        {/* Payments Table */}
        <div className="rounded-md border border-gray-700 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700 hover:bg-gray-800/50">
                <TableHead className="text-gray-300">Name</TableHead>
                <TableHead className="text-gray-300">Email</TableHead>
                <TableHead className="text-gray-300">Payment Mode</TableHead>
                <TableHead className="text-gray-300 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingPayments ? (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-400">Loading...</TableCell></TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-400">No payments found.</TableCell></TableRow>
              ) : (
                paginatedPayments.map(payment => (
                  <TableRow key={payment.id} className="border-gray-700 hover:bg-gray-800/30">
                    <TableCell className="text-white">{payment.memberName}</TableCell>
                    <TableCell className="text-white">{payment.memberEmail}</TableCell>
                    <TableCell className="text-white capitalize">{payment.paymentMode}</TableCell>
                    <TableCell className="text-white text-right">{formatINR(payment.amount)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-gray-400 text-sm">
            Page {currentPage} of {totalPages} • Showing {paginatedPayments.length} of {filteredPayments.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >Prev</Button>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >Next</Button>
          </div>
        </div>
      </CardContent>

      {/* Add Member Payment Modal */}
      <AddMemberPayment
        isOpen={showAddPayment}
        onClose={() => setShowAddPayment(false)}
        onPaymentAdded={handlePaymentAdded}
      />
    </Card>
  );
};

export default MemberPaymentsSection;