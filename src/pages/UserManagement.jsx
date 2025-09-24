import DashboardLayout from "@/components/layout/DashboardLayout";
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import UsersSection from '@/components/users/UsersSection';
import UserCreationForm from '@/components/users/UserCreationForm';

const UserManagementPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-gray-400">Manage users with role-based hierarchy</p>
        </div>
        <UserManagement />
      </div>
    </DashboardLayout>
  );
};

function UserManagement() {
  const {
    users,
    fetchUsers,
    createGymOwner,
    createTrainer,
    createMember,
    isSuperAdmin,
    isGymOwner,
    authFetch
  } = useAuth();

  // Creation form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    whatsapp: '',
    address: '',
    totalMembers: '',
    gymName: '',
    trainerFee: ''
  });

  // UI state
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentCompletion, setShowPaymentCompletion] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Optional: detect pending payment completion flag (kept for compatibility)
  useEffect(() => {
    const pendingPayment = sessionStorage.getItem('pendingPaymentVerification');
    if (pendingPayment) {
      setShowPaymentCompletion(true);
      setMessage({ type: 'info', text: 'Payment successful! Click "Complete Registration" to finish creating the gym owner account.' });
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      whatsapp: '',
      address: '',
      totalMembers: '',
      gymName: '',
      trainerFee: ''
    });
    setMessage({ type: '', text: '' });
  };

  // Create handlers (short and clear)
  const onCreateGymOwner = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      setMessage({ type: 'error', text: 'Name, email, and password are required' });
      return;
    }
    if (formData.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    if (!formData.phone || !formData.address) {
      setMessage({ type: 'error', text: 'Phone and address are required for gym owners' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: 'info', text: 'Creating gym owner...' });
    try {
      const result = await createGymOwner(formData);
      if (result?.success) {
        setMessage({ type: 'success', text: 'Gym owner created successfully!' });
        resetForm();
        await fetchUsers(true);
      } else {
        setMessage({ type: 'error', text: result?.message || 'Failed to create gym owner' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'An error occurred while creating the gym owner' });
    } finally {
      setIsLoading(false);
    }
  };

  const onCreateTrainer = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      setMessage({ type: 'error', text: 'Name, email, and password are required' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: 'info', text: 'Creating trainer...' });
    try {
      const result = await createTrainer(formData);
      if (result?.success) {
        setMessage({ type: 'success', text: 'Trainer created successfully!' });
        resetForm();
        await fetchUsers(true);
      } else {
        setMessage({ type: 'error', text: result?.message || 'Failed to create trainer' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'An error occurred while creating the trainer' });
    } finally {
      setIsLoading(false);
    }
  };

  const onCreateMember = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      setMessage({ type: 'error', text: 'Name, email, and password are required' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: 'info', text: 'Creating member...' });
    try {
      const result = await createMember(formData);
      if (result?.success) {
        setMessage({ type: 'success', text: 'Member created successfully!' });
        resetForm();
        await fetchUsers(true);
      } else {
        setMessage({ type: 'error', text: result?.message || 'Failed to create member' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'An error occurred while creating the member' });
    } finally {
      setIsLoading(false);
    }
  };

  const onCompleteRegistration = () => {
    // Kept for compatibility with existing flow
    setIsProcessingPayment(true);
    try {
      sessionStorage.removeItem('pendingPaymentVerification');
      setShowPaymentCompletion(false);
      setMessage({ type: 'success', text: 'Registration completed.' });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Users list and actions */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Users</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersSection users={users} authFetch={authFetch} fetchUsers={fetchUsers} />
        </CardContent>
      </Card>

      {/* Creation form */}
      {(isSuperAdmin || isGymOwner) && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">
              {isSuperAdmin ? 'Create New Gym Owner' : 'Create New Trainer or Member'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UserCreationForm
              isSuperAdmin={isSuperAdmin}
              isGymOwner={isGymOwner}
              formData={formData}
              isLoading={isLoading}
              isProcessingPayment={isProcessingPayment}
              showPaymentCompletion={showPaymentCompletion}
              onInputChange={handleInputChange}
              onReset={resetForm}
              onCreateGymOwner={onCreateGymOwner}
              onCreateTrainer={onCreateTrainer}
              onCreateMember={onCreateMember}
              onCompleteRegistration={onCompleteRegistration}
            />

            {/* Message banner */}
            {message.text && (
              <div className={`mt-6 p-4 rounded-lg ${
                message.type === 'error' ? 'bg-red-900/50 text-red-200 border border-red-700' :
                message.type === 'info' ? 'bg-blue-900/50 text-blue-200 border border-blue-700' :
                'bg-green-900/50 text-green-200 border border-green-700'
              }`}>
                {message.text}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default UserManagementPage;