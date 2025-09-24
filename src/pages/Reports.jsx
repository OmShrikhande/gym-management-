import { useEffect, useMemo, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BarChart3, FileText, RefreshCw } from "lucide-react";

import RevenueFilters from "@/components/reports/RevenueFilters";
import SummaryCards from "@/components/reports/SummaryCards";


import MemberPaymentsSection from "@/components/reports/MemberPaymentsSection";

import { useAuth } from "@/contexts/AuthContext";


const todayISO = () => new Date().toISOString().slice(0, 10);

const defaultFilters = () => ({
  timeframe: 'monthly', // daily | weekly | monthly | yearly
  refDate: todayISO(),  // used by daily/weekly
  memberName: '',
  planType: '',
  methodGroup: 'all', // all | cash | online
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
});

// Compute start/end (UTC) based on timeframe
const computeRange = (filters) => {
  const { timeframe, refDate, month, year } = filters;
  if (timeframe === 'daily') {
    const d = refDate ? new Date(refDate) : new Date();
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59));
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }
  if (timeframe === 'weekly') {
    const d = refDate ? new Date(refDate) : new Date();
    // Calculate Monday as start of week
    const day = d.getUTCDay(); // 0 = Sun ... 6 = Sat
    const diffToMonday = (day + 6) % 7; // days since Monday
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
    monday.setUTCDate(monday.getUTCDate() - diffToMonday);
    const sunday = new Date(monday);
    sunday.setUTCDate(sunday.getUTCDate() + 6);
    sunday.setUTCHours(23, 59, 59, 0);
    return { startDate: monday.toISOString(), endDate: sunday.toISOString() };
  }
  if (timeframe === 'monthly') {
    const m = parseInt(month, 10) - 1;
    const y = parseInt(year, 10);
    const from = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    const to = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59));
    return { month, year, startDate: from.toISOString(), endDate: to.toISOString() };
  }
  if (timeframe === 'yearly') {
    const y = parseInt(year, 10);
    const from = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
    const to = new Date(Date.UTC(y, 11, 31, 23, 59, 59));
    return { startDate: from.toISOString(), endDate: to.toISOString(), year };
  }
  return {};
};

const buildQuery = (filters, forStats = false) => {
  const { planType, methodGroup, memberName, timeframe } = filters;
  const range = computeRange(filters);
  const params = new URLSearchParams();

  // Use startDate/endDate for all except when backend specifically wants month/year
  if (timeframe === 'monthly') {
    params.set('month', String(filters.month));
    params.set('year', String(filters.year));
  } else {
    if (range.startDate && range.endDate) {
      params.set('startDate', range.startDate);
      params.set('endDate', range.endDate);
    }
  }

  if (planType) params.set('planType', planType);
  if (methodGroup) params.set('methodGroup', methodGroup);
  if (!forStats && memberName) params.set('memberName', memberName);

  return params.toString();
};

const Reports = () => {
  const { isGymOwner, isSuperAdmin, authFetch, users, user, fetchUsers } = useAuth();

  const [filters, setFilters] = useState(defaultFilters());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    totalAmount: 0,
    uniqueMembers: 0,
    onlineTotal: 0,
    cashTotal: 0,
    onlineCount: 0,
    cashCount: 0,
  });

  // Derived summary for top cards
  const summary = useMemo(() => {
    // If super admin: prefer backend subscription revenue
    if (isSuperAdmin) {
      // Revenue will be derived from stats.totalAmount when filters applied,
      // otherwise fallback to sum of paidAmount across all members
      const allMembers = users || [];
      const totalRevenueFallback = allMembers.filter(u => u.role === 'member')
        .reduce((sum, m) => sum + Number(m.paidAmount || 0), 0);
      return {
        members: (users?.filter?.(u => u.role === 'member').length) || 0,
        revenue: Number(stats.totalAmount || 0) || totalRevenueFallback,
        trainers: (users?.filter?.(u => u.role === 'trainer').length) || 0,
        avgPerMember: 0,
        cash: Number(stats.cashTotal || 0),
        online: Number(stats.onlineTotal || 0)
      };
    }

    // Gym owner logic
    const allMembers = users || [];
    const ownerId = user?._id;
    const membersUnderOwner = ownerId ? allMembers.filter(u => u.role === 'member' && (u.gym === ownerId || u.gymId === ownerId || u.owner === ownerId)) : allMembers.filter(u => u.role === 'member');
    const totalRevenueFromPaidAmount = membersUnderOwner.reduce((sum, m) => sum + Number(m.paidAmount || 0), 0);

    const members = membersUnderOwner.length || 0;
    const trainers = (users?.filter?.(u => u.role === 'trainer').length) || 0;
    const avgPerMember = members ? (totalRevenueFromPaidAmount / members) : 0;

    return {
      members,
      revenue: totalRevenueFromPaidAmount,
      trainers,
      avgPerMember,
      cash: Number(stats.cashTotal || 0),
      online: Number(stats.onlineTotal || 0)
    };
  }, [users, user, stats, isSuperAdmin]);

  const handleFilterChange = useCallback((field, value) => {
    if (field === 'reset') return setFilters(defaultFilters());
    setFilters(prev => ({ ...prev, [field]: value }));
  }, []);

  const exportPageToPDF = () => {
    // Simple print for now; can be replaced with html2pdf if needed
    window.print();
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let nextStats = { totalAmount: 0, uniqueMembers: 0, onlineTotal: 0, cashTotal: 0, onlineCount: 0, cashCount: 0 };

      if (isSuperAdmin) {
        // For super admin, get subscription revenue total
        try {
          const subRev = await authFetch('/subscriptions/revenue/total');
          if (subRev?.success || subRev?.status === 'success') {
            nextStats.totalAmount = Number(subRev.data?.totalRevenue || 0);
          }
        } catch {}
        setStats(nextStats);
        setPayments([]); // No payments list for super admin
      } else if (isGymOwner) {
        // For gym owner, load stats and payments
        const statsQuery = buildQuery(filters, true);
        const listQuery = buildQuery(filters, false);

        // 1) Stats (member payments)
        const statsRes = await authFetch(`/payments/member-payments/stats?${statsQuery}`);
        if (statsRes?.success || statsRes?.status === 'success') {
          nextStats = statsRes.data?.stats || nextStats;
        }
        setStats(nextStats);

        // 2) List
        const listRes = await authFetch(`/payments/member-payments?${listQuery}`);
        if (listRes?.success || listRes?.status === 'success') {
          const list = listRes.data?.payments || [];
          const transformed = list.map(p => ({
            member: p.memberDetails?.name || p.memberName || 'Unknown',
            email: p.memberDetails?.email || p.memberEmail || '',
            amount: Number(p.amount || 0),
            mode: (p.paymentMethod || p.method || 'unknown').toLowerCase(),
            date: p.paymentDate?.slice?.(0,10) || '',
            planType: p.planType || p.plan || ''
          }));
          const name = (filters.memberName || '').toLowerCase();
          setPayments(name ? transformed.filter(x => (x.member || '').toLowerCase().includes(name)) : transformed);
        } else {
          setPayments([]);
        }
      }
    } catch (e) {
      console.error('Failed to load report data:', e);
      setError(e?.message || 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  }, [filters, authFetch, isSuperAdmin, isGymOwner]);

  useEffect(() => {
    // Load for gym owners and super admins
    if (!isGymOwner && !isSuperAdmin) return;
    loadData();
  }, [isGymOwner, isSuperAdmin, loadData]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600/30 border border-blue-700 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-blue-400"/>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Revenue & Reports</h1>
              <p className="text-gray-400 text-sm">Advanced filters, clean dark UI, and export options</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-gray-600 text-gray-200 hover:bg-gray-800" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}/>Refresh
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={exportPageToPDF}>
              <FileText className="h-4 w-4 mr-2"/>Export PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <RevenueFilters filters={filters} onChange={handleFilterChange} onRefresh={loadData} />

        {/* Key Stats */}
        <SummaryCards summary={summary} />





        {/* Payments Preview */}
        

        {/* Detailed Member Payments (Owner-only) */}
        {isGymOwner && (
          <div className="mt-6">
            <Separator className="my-6 bg-gray-700" />
            <MemberPaymentsSection filters={filters} />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="bg-red-900/30 border-red-800">
            <CardContent className="py-4 text-red-200">{String(error)}</CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;