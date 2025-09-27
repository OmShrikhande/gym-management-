import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, CreditCard } from "lucide-react";

const RoleSpecificInfo = ({ user, profileData, handleInputChange, isEditing }) => {
  const getRoleTitle = () => {
    switch (user?.role) {
      case 'super-admin': return 'Admin Information';
      case 'gym-owner': return 'Gym Information';
      case 'member': return 'Personal Information';
      default: return 'Professional Information';
    }
  };

  const getRoleDescription = () => {
    switch (user?.role) {
      case 'super-admin': return 'Manage your admin details';
      case 'gym-owner': return 'Manage your gym details';
      case 'member': return 'Manage your personal details';
      default: return 'Manage your specialization, experience, and availability';
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          {getRoleTitle()}
        </CardTitle>
        <CardDescription className="text-gray-400">
          {getRoleDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Super Admin Fields */}
        {user?.role === 'super-admin' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="whatsapp" className="text-gray-300">WhatsApp Number</Label>
              <Input
                id="whatsapp"
                value={profileData.whatsapp}
                onChange={(e) => handleInputChange("whatsapp", e.target.value)}
                disabled={!isEditing}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="experience" className="text-gray-300">Experience</Label>
              <Input
                id="experience"
                value={profileData.experience}
                onChange={(e) => handleInputChange("experience", e.target.value)}
                disabled={!isEditing}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
        )}
        
        {/* Gym Owner Fields */}
        {user?.role === 'gym-owner' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gymName" className="text-gray-300">Gym Name</Label>
                <Input
                  id="gymName"
                  value={profileData.gymName}
                  onChange={(e) => handleInputChange("gymName", e.target.value)}
                  disabled={!isEditing}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="whatsapp" className="text-gray-300">WhatsApp Number</Label>
                <Input
                  id="whatsapp"
                  value={profileData.whatsapp}
                  onChange={(e) => handleInputChange("whatsapp", e.target.value)}
                  disabled={!isEditing}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address" className="text-gray-300">Gym Address</Label>
              <Textarea
                id="address"
                value={profileData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                disabled={!isEditing}
                className="bg-gray-700 border-gray-600 text-white"
                rows={2}
              />
            </div>

            {/* Payment Settings for Gym Owners */}
            <div className="border-t border-gray-600 pt-4 mt-4">
              <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Payment Settings
              </h4>
              <p className="text-gray-400 text-sm mb-4">
                Set up your UPI ID to receive payments from members directly
              </p>
              <div>
                <Label htmlFor="upiId" className="text-gray-300">UPI ID</Label>
                <Input
                  id="upiId"
                  value={profileData.upiId}
                  onChange={(e) => handleInputChange("upiId", e.target.value)}
                  disabled={!isEditing}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="e.g., yourname@paytm, 9876543210@ybl"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This UPI ID will be shown to members when they make payments for membership fees
                </p>
              </div>
            </div>
          </>
        )}
        
        {/* Trainer Fields */}
        {user?.role === 'trainer' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="specialization" className="text-gray-300">Specialization</Label>
                <Input
                  id="specialization"
                  value={profileData.specialization}
                  onChange={(e) => handleInputChange("specialization", e.target.value)}
                  disabled={!isEditing}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="experience" className="text-gray-300">Experience</Label>
                <Input
                  id="experience"
                  value={profileData.experience}
                  onChange={(e) => handleInputChange("experience", e.target.value)}
                  disabled={!isEditing}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="certifications" className="text-gray-300">Certifications</Label>
              <Input
                id="certifications"
                value={profileData.certifications}
                onChange={(e) => handleInputChange("certifications", e.target.value)}
                disabled={!isEditing}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="availability" className="text-gray-300 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Availability Schedule
              </Label>
              <Textarea
                id="availability"
                value={profileData.availability}
                onChange={(e) => handleInputChange("availability", e.target.value)}
                disabled={!isEditing}
                className="bg-gray-700 border-gray-600 text-white"
                rows={4}
              />
            </div>
          </>
        )}
        
        {/* Member Fields */}
        {user?.role === 'member' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="address" className="text-gray-300">Address</Label>
              <Textarea
                id="address"
                value={profileData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                disabled={!isEditing}
                className="bg-gray-700 border-gray-600 text-white"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="whatsapp" className="text-gray-300">WhatsApp Number</Label>
              <Input
                id="whatsapp"
                value={profileData.whatsapp}
                onChange={(e) => handleInputChange("whatsapp", e.target.value)}
                disabled={!isEditing}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RoleSpecificInfo;