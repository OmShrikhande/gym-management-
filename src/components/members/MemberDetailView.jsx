import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, X, Calendar, AlertCircle } from "lucide-react";

/*
  MemberDetailView Component
  - Extracted from Members.jsx "Member Detail View" block
  - Supports both View and Edit modes
  - Expects parent to manage all state/handlers and pass them as props
*/

const MemberDetailView = ({
  // Visibility and selection
  showDetailView,
  selectedMember,

  // Mode and actions
  isEditMode,
  handleEditMember,
  handleCloseDetailView,
  handleUpdateMember,
  setShowDeleteConfirm,

  // Form state
  formData,
  setFormData,
  handleInputChange,
  formSubmitting,
  message,

  // Data helpers
  gymOwnerPlans = [],
  availableTrainers = [],
  getTrainerFee = () => 0,
  getStatusBadge = () => null,
  getPlanBadge = () => null,
  getGoalBadge = () => null,

  // Navigation
  navigate,
}) => {
  if (!showDetailView || !selectedMember) return null;

  return (
    <Card key={`detail-${selectedMember.id}`} className="bg-gray-800/50 border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white">
            {isEditMode ? "Edit Member" : "Member Details"}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {isEditMode
              ? "Update information for " + selectedMember.name
              : "Complete information about " + selectedMember.name}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {!isEditMode && (
            <>
              {/* Only show edit button for trainers, not gym owners */}
              {handleEditMember && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditMember(selectedMember)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {setShowDeleteConfirm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border-red-800 text-red-300 hover:bg-red-900/30"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCloseDetailView}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isEditMode ? (
          // Edit Form
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateMember && handleUpdateMember();
            }}
          >
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-800/30 p-6 rounded-lg border border-gray-700">
                <h4 className="text-lg font-semibold mb-4 text-white">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="name" className="mb-2 block text-gray-300">
                      Full Name *
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                      className="w-full bg-gray-700 border-gray-600 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="mb-2 block text-gray-300">
                      Email Address *
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                      className="w-full bg-gray-700 border-gray-600 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="mb-2 block text-gray-300">
                      Password (leave blank to keep current)
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter new password (min 8 characters)"
                      className="w-full bg-gray-700 border-gray-600 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobile" className="mb-2 block text-gray-300">
                      Mobile Number *
                    </Label>
                    <Input
                      id="mobile"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleInputChange}
                      placeholder="Enter mobile number"
                      className="w-full bg-gray-700 border-gray-600 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender" className="mb-2 block text-gray-300">
                      Gender
                    </Label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="whatsapp" className="mb-2 block text-gray-300">
                      WhatsApp Number
                    </Label>
                    <Input
                      id="whatsapp"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleInputChange}
                      placeholder="Enter WhatsApp number"
                      className="w-full bg-gray-700 border-gray-600 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="joiningDate" className="mb-2 block text-gray-300">
                      Joining Date *
                    </Label>
                    <Input
                      id="joiningDate"
                      name="joiningDate"
                      type="date"
                      value={formData.joiningDate || ""}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 border-gray-600 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Membership Details */}
              <div className="bg-gray-800/30 p-6 rounded-lg border border-gray-700">
                <h4 className="text-lg font-semibold mb-4 text-white">Membership Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="goal" className="mb-2 block text-gray-300">
                      Fitness Goal
                    </Label>
                    <select
                      id="goal"
                      name="goal"
                      value={formData.goal}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    >
                      <option value="weight-loss">Weight Loss</option>
                      <option value="weight-gain">Weight Gain</option>
                      <option value="general-fitness">General Fitness</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="planType" className="mb-2 block text-gray-300">
                      Plan Type
                    </Label>
                    <select
                      id="planType"
                      name="planType"
                      value={formData.planType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    >
                      {gymOwnerPlans.map((plan) => (
                        <option key={plan.id} value={plan.name}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="flex items-center space-x-2 mb-2 text-gray-300">
                      <input
                        type="checkbox"
                        checked={formData.requiresTrainer}
                        onChange={(e) => setFormData({ ...formData, requiresTrainer: e.target.checked })}
                        className="rounded bg-gray-700 border-gray-600 text-blue-600"
                      />
                      <span>Assign Trainer</span>
                    </Label>
                    {formData.requiresTrainer && (
                      <select
                        name="assignedTrainer"
                        value={formData.assignedTrainer}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                      >
                        <option value="">Select a trainer</option>
                        {availableTrainers.map((trainer) => {
                          const trainerFee = getTrainerFee(trainer);
                          return (
                            <option key={trainer._id} value={trainer._id}>
                              {trainer.name} {trainerFee > 0 ? `(₹${trainerFee})` : '(Fee not set)'}
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="fitnessGoalDescription" className="mb-2 block text-gray-300">
                      Goal Description
                    </Label>
                    <Textarea
                      id="fitnessGoalDescription"
                      name="fitnessGoalDescription"
                      value={formData.fitnessGoalDescription}
                      onChange={handleInputChange}
                      placeholder="Describe fitness goals in detail"
                      className="w-full bg-gray-700 border-gray-600 focus:border-blue-500"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDetailView}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  disabled={formSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Updating...' : 'Update Member'}
                </Button>
              </div>

              {/* Display message */}
              {message?.text && (
                <div
                  className={`mt-6 p-4 rounded-lg flex items-center ${
                    message.type === "error"
                      ? "bg-red-900/30 text-red-200 border border-red-600"
                      : message.type === "info"
                      ? "bg-blue-900/30 text-blue-600 border border-blue-600"
                      : "bg-green-900/30 text-green-600 border border-green-600"
                  }`}
                >
                  <div
                    className={`mr-3 p-2 rounded-full ${
                      message.type === "error"
                        ? "bg-red-600"
                        : message.type === "info"
                        ? "bg-blue-600"
                        : "bg-green-600"
                    }`}
                  >
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>{message.text}</div>
                </div>
              )}
            </div>
          </form>
        ) : (
          // View Mode
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-800/30 p-6 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold mb-4 text-white">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Full Name</p>
                  <p className="text-white">{selectedMember.name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Email Address</p>
                  <p className="text-white">{selectedMember.email}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Member ID</p>
                  <p className="text-white">{selectedMember.id}</p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gray-800/30 p-6 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold mb-4 text-white">Contact Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Mobile Number</p>
                  <p className="text-white">{selectedMember.mobile || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">WhatsApp Number</p>
                  <p className="text-white">{selectedMember.whatsapp || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Address</p>
                  <p className="text-white">{selectedMember.address || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Emergency Contact</p>
                  <p className="text-white">{selectedMember.emergencyContact || "Not provided"}</p>
                </div>
              </div>
            </div>

            {/* Membership Details */}
            <div className="bg-gray-800/30 p-6 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold mb-4 text-white">Membership Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Join Date</p>
                  <p className="text-white">{new Date(selectedMember.joinDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Membership Status</p>
                  <div>{getStatusBadge(selectedMember.membershipStatus)}</div>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Plan Type</p>
                  <div>{getPlanBadge(selectedMember.planType)}</div>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Membership Start</p>
                  <p className="text-white">
                    {selectedMember.membershipStartDate
                      ? new Date(selectedMember.membershipStartDate).toLocaleDateString()
                      : new Date(selectedMember.joinDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Membership Expiry</p>
                  {selectedMember.membershipEndDate ? (
                    <div className="space-y-1">
                      <p className="text-white">{new Date(selectedMember.membershipEndDate).toLocaleDateString()}</p>
                      {(() => {
                        const today = new Date();
                        const endDate = new Date(selectedMember.membershipEndDate);
                        const diffTime = endDate - today;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        const daysRemaining = diffDays > 0 ? diffDays : 0;
                        const isExpired = endDate < today;
                        if (isExpired) {
                          return (
                            <div className="flex items-center gap-1 text-red-400 text-sm">
                              <AlertCircle className="h-3 w-3" />
                              <span>Expired</span>
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex items-center gap-1 text-sm">
                              <span className={`${
                                daysRemaining > 30
                                  ? 'text-green-400'
                                  : daysRemaining > 10
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                              }`}>
                                {daysRemaining} days remaining
                              </span>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  ) : (
                    <p className="text-gray-400">Not set</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Fitness Goal</p>
                  <div>{getGoalBadge(selectedMember.goal)}</div>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Assigned Trainer</p>
                  <p className="text-white">
                    {(() => {
                      if (selectedMember.assignedTrainer) {
                        const trainer = availableTrainers.find((t) => t._id === selectedMember.assignedTrainer);
                        return trainer ? trainer.name : "Not assigned";
                      }
                      return "Not assigned";
                    })()}
                  </p>
                </div>
              </div>
            </div>



            {/* Attendance Information */}
            <div className="bg-gray-800/30 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-white">Attendance Information</h4>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                  onClick={() => navigate && navigate(`/attendance/${selectedMember.id}`)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View Full History
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Last Check-in</p>
                  <p className="text-white">
                    {selectedMember.attendance && selectedMember.attendance.length > 0
                      ? new Date(selectedMember.attendance[selectedMember.attendance.length - 1].timestamp).toLocaleString()
                      : "No check-ins recorded"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Visits</p>
                  <p className="text-white">{selectedMember.attendance ? selectedMember.attendance.length : 0}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">This Month</p>
                  <p className="text-white">
                    {selectedMember.attendance
                      ? selectedMember.attendance.filter((record) => {
                          const recordDate = new Date(record.timestamp);
                          const now = new Date();
                          return (
                            recordDate.getMonth() === now.getMonth() &&
                            recordDate.getFullYear() === now.getFullYear()
                          );
                        }).length
                      : 0}
                  </p>
                </div>
              </div>
              {selectedMember.attendance && selectedMember.attendance.length > 0 && (
                <div className="mt-4">
                  <p className="text-gray-400 text-sm mb-2">Recent Check-ins</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedMember.attendance
                      .slice(-5)
                      .reverse()
                      .map((record, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-gray-300">
                            {new Date(record.timestamp).toLocaleDateString()}
                          </span>
                          <span className="text-gray-400">
                            {new Date(record.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-gray-800/30 p-6 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold mb-4 text-white">Notes</h4>
              <p className="text-white">{selectedMember.notes || "No notes recorded for this member."}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MemberDetailView;