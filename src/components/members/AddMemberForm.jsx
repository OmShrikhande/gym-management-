import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: "member",
  active: true,
  createdBy: "",
  gymId: "",
  phone: "",
  gender: "Male",
  goal: "",
  planType: "",
  paymentMode: "online",
  paidAmount: "",
  whatsapp: "",
  notes: "",
  membershipStatus: "Active",
  membershipStartDate: "",
  membershipEndDate: "",
  membershipDuration: "1",
  membershipType: "",
  accountStatus: "active",
  assignedTrainer: "",
};

export default function AddMemberForm({ onSubmit, onCancel, loading, trainers = [] }) {
  const [form, setForm] = useState(initialForm);
  const [requiresTrainer, setRequiresTrainer] = useState(false);

  // Auto-calculate membershipEndDate when membershipStartDate or membershipDuration changes
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      assignedTrainer: requiresTrainer ? prev.assignedTrainer || "" : "",
    }));
  }, [requiresTrainer]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let updatedForm = { ...form, [name]: type === "checkbox" ? checked : value };

    // If joining date or duration changes, update end date
    if (
      (name === "membershipStartDate" && updatedForm.membershipDuration) ||
      (name === "membershipDuration" && updatedForm.membershipStartDate)
    ) {
      const startDate = updatedForm.membershipStartDate;
      const duration = parseInt(
        name === "membershipDuration" ? value : updatedForm.membershipDuration
      );
      if (startDate && duration > 0) {
        const start = new Date(startDate);
        start.setMonth(start.getMonth() + duration);
        // Format as yyyy-mm-dd for input[type=date]
        const endDate = start.toISOString().split("T")[0];
        updatedForm.membershipEndDate = endDate;
      } else {
        updatedForm.membershipEndDate = "";
      }
    }

    setForm(updatedForm);
  };

  const handleTrainerRequiredChange = (e) => {
    setRequiresTrainer(e.target.value === "yes");
    if (e.target.value !== "yes") {
      setForm(prev => ({ ...prev, assignedTrainer: "" }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl w-full max-w-3xl mx-auto p-10 overflow-y-auto"
        style={{ maxHeight: "95vh" }}
      >
        <h2 className="text-3xl font-bold text-white mb-8 text-center">Add New Member</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <Label className="text-gray-300">Name</Label>
            <Input name="name" value={form.name} onChange={handleChange} required className="bg-gray-700 border-gray-600 text-white" />
          </div>
          <div>
            <Label className="text-gray-300">Email</Label>
            <Input name="email" type="email" value={form.email} onChange={handleChange} required className="bg-gray-700 border-gray-600 text-white" />
          </div>
          <div>
            <Label className="text-gray-300">Password</Label>
            <Input name="password" type="password" value={form.password} onChange={handleChange} required className="bg-gray-700 border-gray-600 text-white" />
          </div>
          <div>
            <Label className="text-gray-300">Phone</Label>
            <Input name="phone" value={form.phone} onChange={handleChange} className="bg-gray-700 border-gray-600 text-white" />
          </div>
          <div>
            <Label className="text-gray-300">Gender</Label>
            <select name="gender" value={form.gender} onChange={handleChange} className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white">
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <Label className="text-gray-300">WhatsApp</Label>
            <Input name="whatsapp" value={form.whatsapp} onChange={handleChange} className="bg-gray-700 border-gray-600 text-white" />
          </div>
          <div>
            <Label className="text-gray-300">Goal</Label>
            <select
              name="goal"
              value={form.goal}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white"
              required
            >
              <option value="">Select goal</option>
              <option value="weight-loss">Weight Loss</option>
              <option value="weight-gain">Weight Gain</option>
              <option value="general-fitness">General Fitness</option>
            </select>
          </div>
          <div>
            <Label className="text-gray-300">Plan Type</Label>
            <Input name="planType" value={form.planType} onChange={handleChange} className="bg-gray-700 border-gray-600 text-white" />
          </div>
          <div>
            <Label className="text-gray-300">Payment Mode</Label>
            <select name="paymentMode" value={form.paymentMode} onChange={handleChange} className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white">
              <option value="online">Online</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <div>
            <Label className="text-gray-300">Membership Status</Label>
            <select name="membershipStatus" value={form.membershipStatus} onChange={handleChange} className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white">
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
          <div>
            <Label className="text-gray-300">Membership Start Date</Label>
            <Input
              name="membershipStartDate"
              type="date"
              value={form.membershipStartDate}
              onChange={handleChange}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          <div>
            <Label className="text-gray-300">Membership End Date</Label>
            <Input
              name="membershipEndDate"
              type="date"
              value={form.membershipEndDate}
              onChange={handleChange}
              className="bg-gray-700 border-gray-600 text-white"
              readOnly // prevent manual editing
            />
          </div>
          <div>
            <Label className="text-gray-300">Membership Duration (months)</Label>
            <Input
              name="membershipDuration"
              type="number"
              min="1"
              value={form.membershipDuration}
              onChange={handleChange}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          <div>
            <Label className="text-gray-300">Membership Type</Label>
            <Input name="membershipType" value={form.membershipType} onChange={handleChange} className="bg-gray-700 border-gray-600 text-white" />
          </div>
          <div>
            <Label className="text-gray-300">Account Status</Label>
            <select name="accountStatus" value={form.accountStatus} onChange={handleChange} className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <Label className="text-gray-300">Trainer Required?</Label>
            <select
              name="requiresTrainer"
              value={requiresTrainer ? "yes" : "no"}
              onChange={handleTrainerRequiredChange}
              className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          {requiresTrainer && (
            <div>
              <Label className="text-gray-300">Select Trainer</Label>
              <select
                name="assignedTrainer"
                value={form.assignedTrainer || ""}
                onChange={handleChange}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white"
                required
              >
                <option value="">Select trainer</option>
                {trainers.map(trainer => (
                  <option key={trainer._id} value={trainer._id}>
                    {trainer.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <Label className="text-gray-300">Paid Amount</Label>
            <Input
              name="paidAmount"
              type="number"
              min="0"
              value={form.paidAmount || ""}
              onChange={handleChange}
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>
        </div>
        <div className="mt-8">
          <Label className="text-gray-300">Notes</Label>
          <Textarea name="notes" value={form.notes} onChange={handleChange} className="bg-gray-700 border-gray-600 text-white" />
        </div>
        <div className="flex gap-4 justify-end mt-10">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="border-gray-600 text-gray-300 hover:bg-gray-700">Cancel</Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 px-8 py-2 text-lg text-white" disabled={loading}>{loading ? "Saving..." : "Add Member"}</Button>
        </div>
      </form>
    </div>
  );
}
