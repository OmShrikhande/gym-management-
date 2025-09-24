import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * UserCreationForm: handles creation form for gym-owner/trainer/member
 */
export default function UserCreationForm({
  isSuperAdmin,
  isGymOwner,
  formData,
  isLoading,
  isProcessingPayment,
  showPaymentCompletion,
  onInputChange,
  onReset,
  onCreateGymOwner,
  onCreateTrainer,
  onCreateMember,
  onCompleteRegistration
}) {
  return (
    <form className="space-y-6">
      {/* Basic user information */}
      <h4 className="text-lg font-semibold mb-4 text-white">Basic Information</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <Label htmlFor="name" className="mb-2 block text-gray-300">Full Name</Label>
          <Input id="name" name="name" value={formData.name} onChange={onInputChange} placeholder="Enter full name" className="w-full bg-gray-700 border-gray-600 focus:border-blue-500" />
        </div>
        <div>
          <Label htmlFor="email" className="mb-2 block text-gray-300">Email Address</Label>
          <Input id="email" name="email" type="email" value={formData.email} onChange={onInputChange} placeholder="Enter email address" className="w-full bg-gray-700 border-gray-600 focus:border-blue-500" />
        </div>
        <div>
          <Label htmlFor="password" className="mb-2 block text-gray-300">Password</Label>
          <Input id="password" name="password" type="password" value={formData.password} onChange={onInputChange} placeholder="Enter password (min 8 characters)" className="w-full bg-gray-700 border-gray-600 focus:border-blue-500" />
        </div>
      </div>

      {(isSuperAdmin || isGymOwner) && (
        <div className="bg-gray-800/30 p-6 rounded-lg border border-gray-700">
          <h4 className="text-lg font-semibold mb-4 text-white">{isSuperAdmin ? 'Gym Information' : 'Additional Information'}</h4>

          {isSuperAdmin && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <Label htmlFor="gymName" className="mb-2 block text-gray-300">Gym Name</Label>
                  <Input id="gymName" name="gymName" value={formData.gymName} onChange={onInputChange} placeholder="Enter gym name" className="w-full bg-gray-700 border-gray-600 focus:border-blue-500" />
                </div>
                <div>
                  <Label htmlFor="totalMembers" className="mb-2 block text-gray-300">Total Members</Label>
                  <Input id="totalMembers" name="totalMembers" type="number" value={formData.totalMembers} onChange={onInputChange} placeholder="Enter total members" className="w-full bg-gray-700 border-gray-600 focus:border-blue-500" />
                </div>
              </div>

              <div className="mb-5">
                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                  <h4 className="text-blue-300 font-medium mb-2">📋 Account Activation</h4>
                  <p className="text-sm text-gray-300">The gym owner account will be created with an <strong>inactive</strong> status. The gym owner must log in and complete their subscription payment to activate their account and access the dashboard.</p>
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <Label htmlFor="phone" className="mb-2 block text-gray-300">Phone Number</Label>
              <Input id="phone" name="phone" value={formData.phone} onChange={onInputChange} placeholder="Enter phone number" className="w-full bg-gray-700 border-gray-600 focus:border-blue-500" />
            </div>
            <div>
              <Label htmlFor="whatsapp" className="mb-2 block text-gray-300">WhatsApp Number</Label>
              <Input id="whatsapp" name="whatsapp" value={formData.whatsapp} onChange={onInputChange} placeholder="Enter WhatsApp number" className="w-full bg-gray-700 border-gray-600 focus:border-blue-500" />
            </div>
            <div>
              <Label htmlFor="address" className="mb-2 block text-gray-300">{isSuperAdmin ? 'Gym Address' : 'Member Address'}</Label>
              <Input id="address" name="address" value={formData.address} onChange={onInputChange} placeholder={isSuperAdmin ? 'Enter gym address' : 'Enter member address'} className="w-full bg-gray-700 border-gray-600 focus:border-blue-500" />
            </div>
          </div>

          {isGymOwner && (
            <div className="mt-5">
              <div>
                <Label htmlFor="trainerFee" className="mb-2 block text-gray-300">Trainer Fee (₹)</Label>
                <Input id="trainerFee" name="trainerFee" type="number" value={formData.trainerFee} onChange={onInputChange} placeholder="Enter trainer fee amount" className="w-full bg-gray-700 border-gray-600 focus:border-blue-500" />
                <p className="text-sm text-gray-400 mt-1">This fee will be added when members are assigned to this trainer</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-4 mt-6 justify-end">
        <Button variant="outline" onClick={onReset} disabled={isLoading || isProcessingPayment} className="border-gray-600 text-gray-300 hover:bg-gray-700">Reset Form</Button>

        {isSuperAdmin && (
          <>
            {showPaymentCompletion ? (
              <Button onClick={onCompleteRegistration} className="bg-blue-600 hover:bg-blue-700 px-6" disabled={isProcessingPayment}>
                {isProcessingPayment ? 'Completing...' : 'Complete Registration'}
              </Button>
            ) : (
              <Button onClick={() => onCreateGymOwner()} className="bg-green-600 hover:bg-green-700 px-6" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Gym Owner'}
              </Button>
            )}
          </>
        )}

        {isGymOwner && (
          <>
            <Button onClick={() => onCreateTrainer()} className="bg-purple-600 hover:bg-purple-700 px-6" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Trainer'}
            </Button>
            <Button onClick={() => onCreateMember()} className="bg-blue-600 hover:bg-blue-700 px-6" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Member'}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}