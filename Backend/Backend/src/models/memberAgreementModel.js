import mongoose from 'mongoose';

// Stores the initial agreement snapshot when a gym owner creates a member
// Includes payment method, agreed amount, plan info, membership duration, and a snapshot of member details
const memberAgreementSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Agreement must belong to a member']
  },
  gymOwner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Agreement must belong to a gym owner']
  },

  // Payment info
  paymentMethod: {
    type: String,
    enum: ['cash', 'online'],
    required: [true, 'Payment method is required']
  },
  paidAmount: {
    type: Number,
    required: [true, 'Agreed amount is required'],
    min: [0, 'Agreed amount must be positive']
  },

  // Plan info (optional: planId from GymOwnerPlan or planType string)
  planId: {
    type: mongoose.Schema.ObjectId,
    ref: 'GymOwnerPlan'
  },
  planType: {
    type: String,
    trim: true
  },
  durationMonths: {
    type: Number,
    min: 1
  },

  // Membership period captured at time of agreement
  membershipStartDate: {
    type: Date
  },
  membershipEndDate: {
    type: Date
  },

  // Trainer assignment at time of agreement
  assignedTrainer: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },

  // Notes from gym owner
  notes: {
    type: String,
    trim: true
  },

  // Snapshot of member details at agreement time (denormalized for audit/history)
  memberSnapshot: {
    name: String,
    email: String,
    phone: String,
    gender: String,
    dob: Date,
    goal: String,
    planType: String,
    membershipType: String,
    membershipDuration: Number,
    membershipStartDate: Date,
    membershipEndDate: Date,
    membershipStatus: String,
    address: String,
    whatsapp: String,
    height: Number,
    weight: Number,
    emergencyContact: String,
    medicalConditions: String,
    assignedTrainer: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

memberAgreementSchema.index({ gymOwner: 1, member: 1, createdAt: -1 });

const MemberAgreement = mongoose.model('MemberAgreement', memberAgreementSchema);

export default MemberAgreement;