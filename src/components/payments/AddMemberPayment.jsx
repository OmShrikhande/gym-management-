import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { X, Save, Calculator } from "lucide-react";

const AddMemberPayment = ({ isOpen, onClose, onPaymentAdded, initialMemberId = '' }) => {
  const { authFetch, users } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [formData, setFormData] = useState({
    memberId: initialMemberId || '',
    amount: '',
    planType: 'Basic',
    duration: '1', // months
    paymentMethod: 'Cash',
    transactionId: '',
    notes: '',
    membershipStartDate: new Date().toISOString().split('T')[0],
    membershipEndDate: ''
  });

  // Load members on component mount
  useEffect(() => {
    if (isOpen) {
      loadMembers();
      // If a memberId was provided, keep it in form when modal opens
      if (initialMemberId) {
        setFormData(prev => ({ ...prev, memberId: initialMemberId }));
      }
    }
  }, [isOpen, initialMemberId]);

  // Auto-fill membership end date when duration or start date changes
  useEffect(() => {
    if (formData.membershipStartDate && formData.duration) {
      const startDate = new Date(formData.membershipStartDate);
      const months = parseInt(formData.duration, 10);
      if (!isNaN(months) && months > 0) {
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + months);
        const formattedEndDate = endDate.toISOString().split('T')[0];
        setFormData(prev => ({
          ...prev,
          membershipEndDate: formattedEndDate
        }));
      }
    }
  }, [formData.membershipStartDate, formData.duration]);

  const loadMembers = async () => {
    try {
      // Fetch only members registered under this gym owner
      const response = await authFetch('/payments/members-list');
      if (response.success || response.status === 'success') {
        const memberUsers = response.data?.members || [];
        setMembers(memberUsers);
      }
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('Failed to load members');
    }
  };

  // Removed auto calculation – user will enter amount manually

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.memberId) {
      toast.error('Please select a member');
      return;
    }

    const amountValue = parseFloat(formData.amount);
    if (!formData.amount || Number.isNaN(amountValue) || amountValue <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!formData.planType) {
      toast.error('Please select a plan type');
      return;
    }

    if (!formData.duration || parseInt(formData.duration, 10) < 1) {
      toast.error('Please select a duration');
      return;
    }

    setIsLoading(true);

    try {
      const paymentData = {
        memberId: formData.memberId,
        amount: amountValue,
        planType: formData.planType,
        duration: parseInt(formData.duration, 10),
        paymentMethod: formData.paymentMethod,
        transactionId: formData.transactionId || undefined,
        notes: formData.notes || undefined,
        membershipStartDate: formData.membershipStartDate,
        membershipEndDate: formData.membershipEndDate
      };

      const response = await authFetch('/payments/member-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });

      if (response.success || response.status === 'success') {
        toast.success('Payment recorded successfully');
        
        // Show email receipt status
        if (response.data?.emailReceipt) {
          const { status, message } = response.data.emailReceipt;
          if (status === 'sent') {
            toast.success(message, { duration: 5000 });
          } else if (status === 'failed' || status === 'error') {
            toast.warning(message, { duration: 5000 });
          } else {
            toast.info('Receipt email not sent', { duration: 3000 });
          }
        }
        
        onPaymentAdded && onPaymentAdded(response.data.payment);
        onClose();
        
        // Reset form
        setFormData({
          memberId: '',
          amount: '',
          planType: 'Basic',
          duration: '1',
          paymentMethod: 'Cash',
          transactionId: '',
          notes: '',
          membershipStartDate: new Date().toISOString().split('T')[0],
          membershipEndDate: ''
        });
      } else {
        throw new Error(response.message || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedMember = members.find(member => member._id === formData.memberId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-gray-800 border-gray-700 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">Record Member Payment</CardTitle>
            <CardDescription className="text-gray-400">
              Add a new payment record for a gym member
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Member Selection */}
            <div>
              <Label className="text-gray-300 mb-2 block">Select Member *</Label>
              <Select value={formData.memberId} onValueChange={(value) => handleInputChange('memberId', value)}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Choose a member" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {members.map(member => (
                    <SelectItem key={member._id} value={member._id} className="text-white hover:bg-gray-600">
                      {member.name} ({member.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Member Info Display */}
            {selectedMember && (
              <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                <h4 className="text-white font-medium mb-2">Member Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white ml-2">{selectedMember.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white ml-2">{selectedMember.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Phone:</span>
                    <span className="text-white ml-2">{selectedMember.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Current Plan:</span>
                    <span className="text-white ml-2">{selectedMember.planType || selectedMember.membershipType || 'Basic'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Has Trainer:</span>
                    <span className="text-white ml-2">{selectedMember.assignedTrainer ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Amount */}
            <div>
              <Label className="text-gray-300 mb-2 block">Amount *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter amount (₹)"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            {/* Plan Type and Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 mb-2 block">Plan Type *</Label>
                <Select value={formData.planType} onValueChange={(value) => handleInputChange('planType', value)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="Basic" className="text-white hover:bg-gray-600">Basic</SelectItem>
                    <SelectItem value="Standard" className="text-white hover:bg-gray-600">Standard</SelectItem>
                    <SelectItem value="Premium" className="text-white hover:bg-gray-600">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300 mb-2 block">Duration (months) *</Label>
                <Select value={formData.duration} onValueChange={(value) => handleInputChange('duration', value)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    {[...Array(12)].map((_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)} className="text-white hover:bg-gray-600">
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Membership Period */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 mb-2 block">Membership Start Date *</Label>
                <Input
                  type="date"
                  value={formData.membershipStartDate}
                  onChange={(e) => handleInputChange('membershipStartDate', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300 mb-2 block">Membership End Date</Label>
                <Input
                  type="date"
                  value={formData.membershipEndDate}
                  onChange={(e) => handleInputChange('membershipEndDate', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            {/* Payment Method and Transaction ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 mb-2 block">Payment Method</Label>
                <Select value={formData.paymentMethod} onValueChange={(value) => handleInputChange('paymentMethod', value)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="Cash" className="text-white hover:bg-gray-600">Cash</SelectItem>
                    <SelectItem value="Online" className="text-white hover:bg-gray-600">Online</SelectItem>
                    
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300 mb-2 block">Transaction ID (Optional)</Label>
                <Input
                  type="text"
                  placeholder="Enter transaction ID"
                  value={formData.transactionId}
                  onChange={(e) => handleInputChange('transactionId', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-gray-300 mb-2 block">Notes (Optional)</Label>
              <Textarea
                placeholder="Add any additional notes about this payment..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !formData.memberId}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Recording...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Record Payment
                  </>
                )}
              </Button> 
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddMemberPayment;