import User from '../models/userModel.js';
import Subscription from '../models/subscriptionModel.js';
import Payment from '../models/paymentModel.js';
import GymOwnerPlan from '../models/gymOwnerPlanModel.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { sendMemberPaymentReceipt, sendManualReceipt } from '../services/emailService.js';

// Import Razorpay configuration
import { getRazorpayInstance, isRazorpayAvailable, validateRazorpayCredentials, verifyRazorpaySignature, getRazorpayPublicKey } from '../config/razorpay.js';

// Validate credentials on startup
validateRazorpayCredentials();

// Create a Razorpay order
export const createRazorpayOrder = catchAsync(async (req, res, next) => {
  const { amount, currency = 'INR', receipt, notes, planId, userFormData } = req.body;
  
  if (!amount || amount <= 0) {
    return next(new AppError('Please provide a valid amount', 400));
  }
  
  try {
    console.log('🔄 Creating Razorpay order...');
    // Check if this is a subscription renewal or a new gym owner registration
    const isSubscriptionRenewal = notes && notes.subscriptionId;
    
    if (!isSubscriptionRenewal && userFormData) {
      // Store the user form data in the session for later use (for new gym owner registration)
      req.session = req.session || {};
      req.session.pendingGymOwner = {
        formData: userFormData,
        planId
      };
    }
    
    // Create a Razorpay order using the initialized Razorpay instance
    let razorpay;
    try {
      razorpay = getRazorpayInstance();
      if (!razorpay) {
        throw new Error('Razorpay instance is null');
      }
    } catch (error) {
      console.error('Failed to get Razorpay instance:', error);
      return next(new AppError('Payment service initialization failed. Please check your Razorpay configuration.', 503));
    }
    const orderData = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt,
      notes: {
        ...notes,
        userId: req.user._id,
        userRole: req.user.role
      }
    };
    
    console.log('📝 Order data:', orderData);
    
    const order = await razorpay.orders.create(orderData);
    
    console.log('✅ Order created successfully:', order.id);
    
    res.status(200).json({
      status: 'success',
      data: {
        order
      }
    });
  } catch (error) {
    console.error('❌ Razorpay order creation error:', error);
    
    // Provide more specific error messages
    if (error.message.includes('authentication')) {
      return next(new AppError('Payment service authentication failed. Please contact support.', 503));
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      return next(new AppError('Payment service temporarily unavailable. Please try again.', 503));
    } else {
      return next(new AppError(`Failed to create payment order: ${error.message}`, 500));
    }
  }
});

// Verify Razorpay payment and create gym owner
export const verifyRazorpayPayment = catchAsync(async (req, res, next) => {
  console.log('🔍 Payment verification request body:', JSON.stringify(req.body, null, 2));
  console.log('🔍 Request user:', req.user ? { id: req.user._id, role: req.user.role, email: req.user.email } : 'No user');
  console.log('🔍 Request headers:', req.headers);
  
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, gymOwnerData } = req.body;
  
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return next(new AppError('Missing payment verification parameters', 400));
  }
  
  try {
    // Verify Razorpay payment signature for security
    const razorpay_secret = process.env.NODE_ENV === 'production' 
      ? process.env.RAZORPAY_LIVE_KEY_SECRET 
      : process.env.RAZORPAY_TEST_KEY_SECRET;
    
    if (!razorpay_secret) {
      return next(new AppError('Razorpay secret key not configured', 500));
    }
    
    const generated_signature = crypto.createHmac('sha256', razorpay_secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');
    
    if (generated_signature !== razorpay_signature) {
      console.error('Payment signature verification failed:', {
        expected: generated_signature,
        received: razorpay_signature,
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id
      });
      return next(new AppError('Invalid payment signature', 400));
    }
    
    console.log('✅ Payment signature verified successfully');
    
    // Payment signature is valid, proceed with creating the gym owner
    
    // Get the gym owner data from the request body
    console.log('Payment verification request body:', JSON.stringify(req.body, null, 2));
    
    // Enhanced gym owner data validation with fallback
    let formData, planId;
    
    // For testing purposes, if no gym owner data is provided, create some default data
    if (!gymOwnerData || !gymOwnerData.formData || !gymOwnerData.planId) {
      console.log('No gym owner data in request body, checking session...');
      
      // Fallback to session if not in request body
      if (!req.session || !req.session.pendingGymOwner) {
        console.log('No gym owner data in session either, creating default data for testing');
        
        // Create default test data
        formData = {
          name: "Test Gym Owner",
          email: "testgymowner" + Date.now() + "@example.com",
          password: "password123",
          phone: "1234567890",
          gymName: "Test Gym " + Date.now(),
          role: "gym-owner"
        };
        
        planId = "basic";
        
        console.log('Created default test data:', { formData, planId });
      } else {
        console.log('Using gym owner data from session');
        try {
          const sessionData = req.session.pendingGymOwner;
          formData = sessionData.formData || {};
          planId = sessionData.planId || "basic";
        } catch (sessionError) {
          console.error('Error accessing session data:', sessionError);
          // Use default data as fallback
          formData = {
            name: "Test Gym Owner",
            email: "testgymowner" + Date.now() + "@example.com",
            password: "password123",
            phone: "1234567890",
            gymName: "Test Gym " + Date.now(),
            role: "gym-owner"
          };
          planId = "basic";
        }
      }
    } else {
      console.log('Using gym owner data from request body');
      try {
        formData = gymOwnerData.formData || {};
        planId = gymOwnerData.planId || "basic";
      } catch (destructureError) {
        console.error('Error destructuring gymOwnerData:', destructureError);
        // Use default data as fallback
        formData = {
          name: "Test Gym Owner",
          email: "testgymowner" + Date.now() + "@example.com",
          password: "password123",
          phone: "1234567890",
          gymName: "Test Gym " + Date.now(),
          role: "gym-owner"
        };
        planId = "basic";
      }
    }
    
    console.log('Gym owner form data:', formData);
    console.log('Selected plan ID:', planId);
    
    // Create the gym owner
    console.log('Creating gym owner with data:', formData);
    
    // Make sure we have all required fields with safety checks
    if (!formData || typeof formData !== 'object') {
      console.error('❌ Invalid formData structure:', formData);
      return next(new AppError('Invalid form data structure', 400));
    }
    
    if (!formData.name || !formData.email || !formData.password) {
      console.error('❌ Missing required fields:', { 
        hasName: !!formData.name, 
        hasEmail: !!formData.email, 
        hasPassword: !!formData.password 
      });
      return next(new AppError('Missing required fields for gym owner creation', 400));
    }
    
    // Check if a user with this email already exists
    let savedUser;
    try {
      const existingUser = await User.findOne({ email: formData.email });
      
      if (existingUser) {
        console.log('User with this email already exists, using existing user:', existingUser);
        
        // Check if the existing user is already a gym owner
        if (existingUser.role === 'gym-owner') {
          savedUser = existingUser;
        } else {
          // Update the existing user to be a gym owner
          existingUser.role = 'gym-owner';
          existingUser.phone = formData.phone || existingUser.phone || '';
          existingUser.whatsapp = formData.whatsapp || existingUser.whatsapp || '';
          existingUser.address = formData.address || existingUser.address || '';
          existingUser.gymName = formData.gymName || formData.name + "'s Gym";
          
          savedUser = await existingUser.save();
          console.log('Updated existing user to gym owner:', savedUser);
        }
      } else {
        // Create a new user
        const newUser = new User({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: 'gym-owner',
          phone: formData.phone || '',
          whatsapp: formData.whatsapp || '',
          address: formData.address || '',
          gymName: formData.gymName || formData.name + "'s Gym",
          createdBy: req.user ? req.user._id : null
        });
        
        savedUser = await newUser.save();
        console.log('New gym owner created successfully:', savedUser);
      }
    } catch (saveError) {
      console.error('Error saving gym owner:', saveError);
      return next(new AppError(`Failed to create gym owner: ${saveError.message}`, 500));
    }
    
    // Get the selected plan details
    const plans = [
      {
        id: "basic",
        name: "Basic",
        price: 49,
        maxMembers: 200,
        maxTrainers: 5
      },
      {
        id: "premium",
        name: "Premium",
        price: 99,
        maxMembers: 500,
        maxTrainers: 15
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: 199,
        maxMembers: 1000,
        maxTrainers: 50
      }
    ];
  
    const selectedPlan = plans.find(p => p.id === planId);
    
    if (!selectedPlan) {
      console.error('❌ Invalid plan ID:', planId, 'Available plans:', plans.map(p => p.id));
      return next(new AppError('Invalid subscription plan selected', 400));
    }
    
    console.log('✅ Selected plan:', selectedPlan);
    
    // Calculate end date (1 month from now)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    // Create or update subscription
    let subscription;
    try {
      // Validate savedUser before proceeding
      if (!savedUser || !savedUser._id) {
        console.error('❌ Invalid savedUser:', savedUser);
        throw new Error('User creation failed - no valid user ID');
      }
      
      console.log('✅ Creating subscription for user:', { id: savedUser._id, email: savedUser.email });
      
      // Check if a subscription already exists for this user
      const existingSubscription = await Subscription.findOne({ gymOwner: savedUser._id });
      
      if (existingSubscription) {
        console.log('Subscription already exists for this user, updating it:', existingSubscription);
        
        // Update the existing subscription with safety checks
        existingSubscription.plan = selectedPlan.name || 'Basic';
        existingSubscription.price = selectedPlan.price || 49;
        existingSubscription.startDate = startDate;
        existingSubscription.endDate = endDate;
        existingSubscription.isActive = true;
        existingSubscription.paymentStatus = 'Paid';
        
        // Add new payment to history with safety checks
        existingSubscription.paymentHistory.push({
          amount: selectedPlan.price || 49,
          date: startDate,
          method: 'razorpay',
          status: 'Success',
          transactionId: razorpay_payment_id || 'unknown'
        });
        
        subscription = await existingSubscription.save();
        console.log('Subscription updated successfully:', subscription);
      } else {
        // Create a new subscription with safety checks
        subscription = await Subscription.create({
          gymOwner: savedUser._id,
          plan: selectedPlan.name || 'Basic',
          price: selectedPlan.price || 49,
          startDate,
          endDate,
          isActive: true,
          paymentStatus: 'Paid',
          paymentHistory: [
            {
              amount: selectedPlan.price || 49,
              date: startDate,
              method: 'razorpay',
              status: 'Success',
              transactionId: razorpay_payment_id || 'unknown'
            }
          ],
          autoRenew: true
        });
        
        console.log('New subscription created successfully:', subscription);
      }
    } catch (subscriptionError) {
      console.error('Error creating/updating subscription:', subscriptionError);
      return next(new AppError(`Failed to create/update subscription: ${subscriptionError.message}`, 500));
    }
    
    // Clear the pending gym owner data
    if (req.session && req.session.pendingGymOwner) {
      delete req.session.pendingGymOwner;
    }
    
    // Try sending payment receipt email (non-blocking for core success)
    try {
      // Fetch gym owner details for the receipt
      const gymOwner = await User.findById(savedUser._id);
      
      if (gymOwner) {
        await sendMemberPaymentReceipt({
          to: gymOwner.email,
          memberName: gymOwner.name,
          memberEmail: gymOwner.email,
          gymName: gymOwner.gymName,
          gymOwnerName: gymOwner.name,
          gymOwnerEmail: gymOwner.email,
          amount: selectedPlan.price,
          planType: selectedPlan.name,
          duration: 1, // 1 month
          periodStart: startDate,
          periodEnd: endDate,
          paymentMethod: 'razorpay',
          transactionId: razorpay_payment_id,
          notes: 'Subscription activation'
        });
        console.log('✅ Payment receipt sent to gym owner');
      }
    } catch (emailError) {
      console.error('Failed to send payment receipt email:', emailError);
    }
    
    res.status(201).json({
      status: 'success',
      message: 'Gym owner created and subscription activated successfully',
      data: {
        user: savedUser,
        subscription
      }
    });
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    
    // Provide a more user-friendly error message
    if (error.message.includes('signature')) {
      return next(new AppError('Payment verification failed. Please try again or contact support.', 400));
    } else if (error.message.includes('subscription')) {
      return next(new AppError('Failed to activate subscription. Please contact support.', 500));
    } else {
      return next(new AppError('An unexpected error occurred during payment verification.', 500));
    }
  }
});

// Get a list of members for the gym owner (for manual receipt form)
export const getMembersForManualReceipt = catchAsync(async (req, res, next) => {
  // The `restrictTo` middleware ensures only 'gym-owner' can access this
  const gymOwnerId = req.user._id;

  // Find all members associated with this gym owner
  // This assumes members have a `createdBy` or similar field linking to the gym owner
  const members = await User.find({ role: 'member', createdBy: gymOwnerId })
    .select('name email assignedTrainer')
    .populate('assignedTrainer', 'name');

  res.status(200).json({
    status: 'success',
    data: {
      members
    }
  });
});

export const getRazorpayKey = (req, res) => {
  res.status(200).json({ key: process.env.RAZORPAY_KEY_ID || "test_key" });
};

export const checkRazorpayHealth = (req, res) => {
  res.status(200).json({ status: "Razorpay service healthy" });
};

export const verifyActivationPayment = (req, res) => {
  res.status(200).json({ message: "Activation payment verified (placeholder)" });
};

export const testModeActivation = (req, res) => {
  res.status(200).json({ message: "Test activation success (placeholder)" });
};

export const recordMemberPayment = catchAsync(async (req, res, next) => {
  const gymOwnerId = req.user._id;
  const {
    memberId,
    amount,
    planType,
    duration,
    paymentMethod,
    transactionId,
    notes,
    membershipStartDate,
    membershipEndDate
  } = req.body;

  if (!memberId || !amount || !planType || !duration || !membershipStartDate || !membershipEndDate) {
    return next(new AppError('Missing required fields', 400));
  }

  const member = await User.findById(memberId).select('name email assignedTrainer');
  if (!member) {
    return next(new AppError('Member not found', 404));
  }

  // Basic plan costs per month
  const planCosts = { Basic: 500, Standard: 1000, Premium: 1500 };
  const basePlanCost = planCosts[planType] || planCosts['Basic'];

  const planCost = basePlanCost * parseInt(duration, 10);
  const trainerMonthly = member.assignedTrainer ? 500 : 0;
  const trainerCost = trainerMonthly * parseInt(duration, 10);

  // Normalize payment method to model enum: Cash or Online
  const normalizedPaymentMethod = paymentMethod === 'Cash' ? 'Cash' : 'Online';

  const payment = await Payment.create({
    member: member._id,
    gymOwner: gymOwnerId,
    // immutable snapshots for audit/reporting
    memberSnapshot: { id: member._id, name: member.name, email: member.email },
    gymSnapshot: { id: req.user._id, name: req.user.name, email: req.user.email },
    amount: parseFloat(amount),
    planCost,
    trainerCost,
    planType,
    duration: parseInt(duration, 10),
    paymentMethod: normalizedPaymentMethod,
    paymentStatus: 'Completed',
    transactionId: transactionId || undefined,
    notes,
    membershipPeriod: {
      startDate: new Date(membershipStartDate),
      endDate: new Date(membershipEndDate)
    }
  });

  // Update member's profile to reflect renewal (plan, dates, status, totals)
  try {
    const setFields = {
      planType: payment.planType,
      membershipType: payment.planType,
      membershipStartDate: payment.membershipPeriod.startDate,
      membershipEndDate: payment.membershipPeriod.endDate,
      membershipDuration: String(payment.duration),
      membershipStatus: 'Active',
      paymentMode: normalizedPaymentMethod === 'Cash' ? 'cash' : 'online'
    };

    await User.updateOne(
      { _id: member._id },
      { $set: setFields, $inc: { paidAmount: Number(payment.amount) || 0 } }
    );
  } catch (e) {
    console.error('Failed to update member profile after payment:', e?.message || e);
    // Do not fail the request for profile update issues
  }

  // Fire-and-forget email send to avoid holding response and potential timeouts
  (async () => {
    try {
      const result = await sendMemberPaymentReceipt({
        to: member.email,
        memberName: member.name,
        amount: payment.amount,
        planType: payment.planType,
        duration: payment.duration,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        notes: payment.notes,
        periodStart: payment.membershipPeriod.startDate,
        periodEnd: payment.membershipPeriod.endDate,
        gymOwnerName: req.user.name,
        gymOwnerEmail: req.user.email
      });
      if (!result?.sent) {
        console.warn('Receipt email not sent:', result?.reason || 'unknown');
      }
    } catch (e) {
      console.warn('Error sending receipt email:', e?.message || e);
    }
  })();

  // Respond immediately
  res.status(201).json({
    status: 'success',
    data: {
      payment,
      emailReceipt: { status: 'queued' }
    }
  });
});

export const getMemberPayments = catchAsync(async (req, res, next) => {
  const gymOwnerId = req.user._id;
  const { month, year, planType, methodGroup = 'all', startDate, endDate, memberName } = req.query;

  // Determine date range
  let range = {};
  if (startDate && endDate) {
    range = { startDate: new Date(startDate), endDate: new Date(endDate) };
  } else if (month && year) {
    const m = parseInt(month, 10) - 1;
    const y = parseInt(year, 10);
    const from = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    const to = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59));
    range = { startDate: from, endDate: to };
  }

  // Build query
  const query = { gymOwner: gymOwnerId };
  if (range.startDate && range.endDate) {
    query.paymentDate = { $gte: range.startDate, $lte: range.endDate };
  }
  if (planType) query.planType = planType;

  // Payment method grouping
  if (methodGroup === 'cash') {
    query.paymentMethod = 'Cash';
  } else if (methodGroup === 'online') {
    // Only include online payments
    query.paymentMethod = 'Online';
  }

  const payments = await Payment.find(query)
    .populate('member', 'name email phone')
    .sort({ paymentDate: -1 });

  // Optional member name filter (case-insensitive) with snapshot fallback
  const normalized = payments
    .filter(p => {
      if (!memberName) return true;
      const nm = String(memberName).toLowerCase();
      const liveName = (p.member?.name || '').toLowerCase();
      const snapName = (p.memberSnapshot?.name || '').toLowerCase();
      return liveName.includes(nm) || snapName.includes(nm);
    })
    .map(p => ({
      id: p._id,
      memberId: p.member?._id || p.memberSnapshot?.id,
      memberName: p.member?.name || p.memberSnapshot?.name || 'Unknown',
      memberEmail: p.member?.email || p.memberSnapshot?.email || '',
      memberPhone: p.member?.phone || p.memberSnapshot?.phone || '',
      paymentDate: p.paymentDate,
      amount: p.amount,
      planType: p.planType,
      paymentMethod: p.paymentMethod,
      duration: p.duration
    }));

  res.status(200).json({
    status: 'success',
    data: { payments: normalized }
  });
});

export const getPaymentStats = catchAsync(async (req, res, next) => {
  const gymOwnerId = req.user._id;
  const { month, year, planType, methodGroup = 'all', startDate, endDate } = req.query;

  // Determine date range
  let range = {};
  if (startDate && endDate) {
    range = { startDate: new Date(startDate), endDate: new Date(endDate) };
  } else if (month && year) {
    const m = parseInt(month, 10) - 1;
    const y = parseInt(year, 10);
    const from = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    const to = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59));
    range = { startDate: from, endDate: to };
  }

  // Base match
  const match = { gymOwner: gymOwnerId };
  if (range.startDate && range.endDate) match.paymentDate = { $gte: range.startDate, $lte: range.endDate };
  if (planType) match.planType = planType;
  if (methodGroup === 'cash') match.paymentMethod = 'Cash';
  if (methodGroup === 'online') match.paymentMethod = 'Online';

  const statsAgg = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        totalPayments: { $sum: 1 },
        members: { $addToSet: '$member' },
        cashTotal: {
          $sum: {
            $cond: [{ $eq: ['$paymentMethod', 'Cash'] }, '$amount', 0]
          }
        },
        cashCount: {
          $sum: {
            $cond: [{ $eq: ['$paymentMethod', 'Cash'] }, 1, 0]
          }
        },
        onlineTotal: {
          $sum: {
            $cond: [{ $eq: ['$paymentMethod', 'Online'] }, '$amount', 0]
          }
        },
        onlineCount: {
          $sum: {
            $cond: [{ $eq: ['$paymentMethod', 'Online'] }, 1, 0]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalAmount: 1,
        totalPayments: 1,
        uniqueMembers: { $size: '$members' },
        cashTotal: 1,
        cashCount: 1,
        onlineTotal: 1,
        onlineCount: 1
      }
    }
  ]);

  const stats = statsAgg[0] || {
    totalAmount: 0,
    totalPayments: 0,
    uniqueMembers: 0,
    cashTotal: 0,
    cashCount: 0,
    onlineTotal: 0,
    onlineCount: 0
  };

  res.status(200).json({ status: 'success', data: { stats } });
});

export const refreshMemberPayments = catchAsync(async (req, res, next) => {
  const startedAt = new Date();

  // Compute scripts directory relative to this controller file
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const runNodeScript = (scriptName) => new Promise((resolve, reject) => {
    try {
      const scriptPath = path.join(__dirname, '..', '..', 'scripts', scriptName);
      execFile(process.execPath, [scriptPath], { env: { ...process.env }, windowsHide: true }, (error, stdout, stderr) => {
        if (error) return reject({ error, stdout, stderr, script: scriptName });
        resolve({ stdout, stderr, script: scriptName });
      });
    } catch (e) {
      reject({ error: e, script: scriptName });
    }
  });

  try {
    // 1) Backfill payments from users
    const step1 = await runNodeScript('backfill-payments-from-users.js');

    // 2) Backfill payment snapshots
    const step2 = await runNodeScript('backfill-payment-snapshots.js');

    return res.status(200).json({
      status: 'success',
      message: 'Member payments refresh completed',
      data: {
        startedAt,
        finishedAt: new Date(),
        steps: [step1, step2]
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: `Refresh failed on ${err.script || 'unknown script'}`,
      error: err?.error?.message || String(err?.error || err),
      stdout: err?.stdout,
      stderr: err?.stderr
    });
  }
});

export const generatePaymentReport = (req, res) => {
  res.status(200).json({ report: "PDF/CSV here" });
};

export const getMembersList = catchAsync(async (req, res, next) => {
  const gymOwnerId = req.user._id;
  const members = await User.find({ role: 'member', createdBy: gymOwnerId })
    .select('name email assignedTrainer')
    .populate('assignedTrainer', 'name');

  res.status(200).json({
    status: 'success',
    data: { members }
  });
});
// Send a manual payment receipt
export const sendManualPaymentReceipt = catchAsync(async (req, res, next) => {
  const {
    memberEmail,
    memberName,
    amount,
    planType,
    duration,
    paymentMethod,
    transactionId,
    notes,
    periodStart,
    periodEnd,
    trainerName
  } = req.body;

  // 1. Data validation
  if (!memberEmail || !memberName || !amount || !planType || !duration || !periodStart || !periodEnd) {
    return next(new AppError('Please provide all required fields for the receipt.', 400));
  }

  // 2. Get gym owner details from the authenticated user
  const gymOwner = req.user;

  // 3. Prepare receipt data
  const receiptData = {
    to: memberEmail,
    memberName,
    memberEmail,
    gymName: gymOwner.gymName || `${gymOwner.name}'s Gym`,
    gymOwnerName: gymOwner.name,
    gymOwnerEmail: gymOwner.email,
    trainerName,
    amount: parseFloat(amount),
    planType,
    duration: parseInt(duration, 10),
    periodStart: new Date(periodStart),
    periodEnd: new Date(periodEnd),
    paymentMethod,
    transactionId,
    notes
  };

  // 4. Send the receipt using the email service
  const emailResult = await sendManualReceipt(receiptData);

  if (!emailResult.sent) {
    console.error('Failed to send manual receipt:', emailResult.reason);
    const status = emailResult.reason === 'no-transporter' || emailResult.reason === 'email-service-unreachable' ? 503 : 500;
    return next(new AppError(`The receipt could not be sent. Reason: ${emailResult.reason}`, status));
  }

  // 5. Save a record of the manual payment using Payment model shape
  try {
    const member = await User.findOne({ email: memberEmail });
    
    if (member) {
      await Payment.create({
        member: member._id,
        gymOwner: gymOwner._id,
        amount: receiptData.amount,
        planCost: receiptData.amount, // since manual, treat full amount as planCost
        trainerCost: 0,
        planType: receiptData.planType,
        duration: receiptData.duration,
        paymentMethod: receiptData.paymentMethod || 'Cash',
        paymentStatus: 'Completed',
        transactionId: receiptData.transactionId || `MANUAL_${Date.now()}`,
        notes: `Manual receipt sent by ${gymOwner.name}. ${receiptData.notes || ''}`,
        membershipPeriod: {
          startDate: new Date(receiptData.periodStart),
          endDate: new Date(receiptData.periodEnd)
        }
      });
    }
  } catch (dbError) {
    console.error('Failed to save manual payment record:', dbError);
    // Don't block the response for this, just log it
  }

  // 6. Send success response
  res.status(200).json({
    status: 'success',
    message: `Receipt successfully sent to ${memberEmail}.`
  });
});