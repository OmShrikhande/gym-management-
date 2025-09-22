import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ManualReceiptForm from '../components/payment/ManualReceiptForm';
import { Receipt, FileText, Users, CreditCard } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext.jsx';

const PaymentReceipts = () => {
  const { t } = useTranslation();
  const { authFetch, users, fetchUsers } = useAuth();
  const [activeTab, setActiveTab] = useState('manual');

  // Stats state
  const [todayCount, setTodayCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [activeMembers, setActiveMembers] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const tabs = [
    { id: 'manual', name: 'Manual Receipt', icon: FileText, description: 'Send payment receipts manually to members' },
    { id: 'history', name: 'Receipt History', icon: Receipt, description: 'View previously sent receipts' }
  ];

  const todayRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { startISO: encodeURIComponent(start.toISOString()), endISO: encodeURIComponent(end.toISOString()) };
  }, []);

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      // Today stats
      const todayRes = await authFetch(`/payments/member-payments/stats?startDate=${todayRange.startISO}&endDate=${todayRange.endISO}`);
      if (todayRes.success) setTodayCount(todayRes.data.stats?.totalPayments || 0);

      // Total stats
      const totalRes = await authFetch('/payments/member-payments/stats');
      if (totalRes.success) setTotalCount(totalRes.data.stats?.totalPayments || 0);

      // Active members (basic: count members from context)
      if (!users || users.length === 0) {
        await fetchUsers?.(true);
      }
      const membersCount = (users || []).filter(u => u.role === 'member').length;
      setActiveMembers(membersCount);
    } catch (e) {
      console.error('Failed to load stats:', e);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ReceiptHistory = () => {
    const { authFetch } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await authFetch('/payments/member-payments');
        if (res.success) setItems(res.data.payments || []);
      } catch (e) {
        console.error('Failed to load receipt history:', e);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => { fetchHistory(); }, []);

    return (
      <div className="max-w-4xl mx-auto p-4 bg-gray-800/50 border border-gray-700 rounded-lg shadow-md">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white mb-1 flex items-center">
            <Receipt className="mr-2 text-blue-400" />
            Receipt History
          </h2>
          <p className="text-gray-400 text-sm">View and manage previously sent payment receipts</p>
        </div>
        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="mx-auto h-12 w-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No receipts found</h3>
            <p className="text-gray-400">Receipts you send will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Member</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Amount</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Method</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {items.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 text-gray-300">{new Date(p.paymentDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-gray-300">{p.memberName} ({p.memberEmail})</td>
                    <td className="px-3 py-2 text-gray-300">₹{p.amount}</td>
                    <td className="px-3 py-2 text-gray-300">{p.paymentMethod}</td>
                    <td className="px-3 py-2 text-gray-300">{p.planType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Callback to refresh stats/history after sending a receipt
  const handleReceiptSent = async () => {
    await loadStats();
    if (activeTab !== 'history') setActiveTab('history');
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center">
            <CreditCard className="mr-3 text-blue-400" />
            Payment Receipts
          </h1>
          <p className="text-gray-400 max-w-2xl text-sm">
            Manage payment receipts for your gym members. Send receipts manually
            or view the history of previously sent receipts.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Receipt className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-2">
                <p className="text-xs font-medium text-gray-400">Receipts Sent Today</p>
                <p className="text-xl font-semibold text-white">{isLoadingStats ? '-' : todayCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-2">
                <p className="text-xs font-medium text-gray-400">Total Receipts</p>
                <p className="text-xl font-semibold text-white">{isLoadingStats ? '-' : totalCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-2">
                <p className="text-xs font-medium text-gray-400">Active Members</p>
                <p className="text-xl font-semibold text-white">{isLoadingStats ? '-' : activeMembers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-4">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      isActive
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                    }`}
                  >
                    <Icon
                      className={`mr-1 h-4 w-4 ${isActive ? 'text-blue-400' : 'text-gray-400'}`}
                    />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Description */}
          <div className="mt-2">
            <p className="text-xs text-gray-400">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'manual' && <ManualReceiptForm onReceiptSent={handleReceiptSent} />}
          {activeTab === 'history' && <ReceiptHistory />}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PaymentReceipts;