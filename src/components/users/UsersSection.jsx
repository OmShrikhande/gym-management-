import React, { useState } from 'react';
import { toast } from 'sonner';
import UserList from '@/components/users/UserList';
import UserEditDialog from '@/components/users/UserEditDialog';
import UserDeleteDialog from '@/components/users/UserDeleteDialog';

/**
 * UsersSection: lists users and manages edit/delete flows
 */
export default function UsersSection({ users, authFetch, fetchUsers }) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    whatsapp: '',
    address: '',
    gymName: ''
  });

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      phone: user.phone || '',
      whatsapp: user.whatsapp || '',
      address: user.address || '',
      gymName: user.gymName || ''
    });
    setShowEditDialog(true);
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setIsLoading(true);
    try {
      const updateData = { ...editFormData };
      if (!updateData.password) delete updateData.password;

      const response = await authFetch(`/users/${selectedUser._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response?.success === false || response?.status === 'error') {
        throw new Error(response?.message || 'Failed to update user');
      }

      toast.success(`${selectedUser.name} updated successfully`);
      setShowEditDialog(false);
      await fetchUsers(true);
    } catch (err) {
      toast.error(err?.message || 'Failed to update user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsLoading(true);
    try {
      const response = await authFetch(`/users/${selectedUser._id}`, {
        method: 'DELETE'
      });

      if (response?.success === false || response?.status === 'error') {
        throw new Error(response?.message || 'Failed to delete user');
      }

      toast.success(`${selectedUser.name} deleted successfully`);
      setShowDeleteDialog(false);
      await fetchUsers(true);
    } catch (err) {
      toast.error(err?.message || 'Failed to delete user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <UserList users={users} onEdit={handleEditClick} onDelete={handleDeleteClick} />

      <UserEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        formData={editFormData}
        onChange={handleEditInputChange}
        onSubmit={handleUpdateUser}
        isLoading={isLoading}
      />

      <UserDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        userName={selectedUser?.name}
        onConfirm={handleDeleteUser}
        isLoading={isLoading}
      />
    </div>
  );
}