import MemberAgreement from '../models/memberAgreementModel.js';
import User from '../models/userModel.js';
import catchAsync from '../utils/catchAsync.js';

// GET /payments/member-agreements
// Returns agreements created by the logged-in gym owner, most recent first
export const getMemberAgreements = catchAsync(async (req, res, next) => {
  const gymOwnerId = req.user._id;

  const agreements = await MemberAgreement.find({ gymOwner: gymOwnerId })
    .sort({ createdAt: -1 })
    .populate('member', 'name email phone')
    .populate('assignedTrainer', 'name');

  // Map to a concise shape for frontend
  const data = agreements.map(a => ({
    id: a._id,
    memberId: a.member?._id || null,
    memberName: a.member?.name || a.memberSnapshot?.name || 'Unknown',
    memberEmail: a.member?.email || a.memberSnapshot?.email || '',
    memberPhone: a.member?.phone || a.memberSnapshot?.phone || '',
    paymentMethod: a.paymentMethod,
    paidAmount: a.paidAmount,
    planId: a.planId || null,
    planType: a.planType || a.memberSnapshot?.planType || '',
    durationMonths: a.durationMonths || a.memberSnapshot?.membershipDuration || null,
    membershipStartDate: a.membershipStartDate || a.memberSnapshot?.membershipStartDate || null,
    membershipEndDate: a.membershipEndDate || a.memberSnapshot?.membershipEndDate || null,
    assignedTrainerName: a.assignedTrainer?.name || null,
    notes: a.notes || '',
    createdAt: a.createdAt
  }));

  res.status(200).json({ status: 'success', data: { agreements: data } });
});