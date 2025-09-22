import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from Backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Models
import Payment from '../src/models/paymentModel.js';
import User from '../src/models/userModel.js';

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI not set in Backend/.env');
      process.exit(1);
    }
    console.log('Connecting MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected');
  } catch (e) {
    console.error('Mongo connect error:', e.message);
    process.exit(1);
  }
};

const run = async () => {
  await connectDB();

  // Find members with a positive paidAmount
  const members = await User.find({ role: 'member', paidAmount: { $gt: 0 } })
    .select('_id name email phone paidAmount planType membershipType membershipDuration paymentMode membershipStartDate membershipEndDate createdBy gymId');

  let created = 0;
  for (const u of members) {
    try {
      // Skip if there is already at least one Payment for this member
      const hasPayment = await Payment.exists({ member: u._id });
      if (hasPayment) continue;

      const amount = Number(u.paidAmount || 0);
      if (amount <= 0) continue;

      const allowedPlans = ['Basic','Standard','Premium'];
      const rawPlan = (u.planType || u.membershipType || 'Basic');
      const planType = allowedPlans.includes(rawPlan) ? rawPlan : 'Basic';
      const duration = Math.max(1, Number(u.membershipDuration || 1));

      const paymentMethod = String(u.paymentMode || '').toLowerCase().includes('cash') ? 'Cash' : 'Online';

      const start = u.membershipStartDate ? new Date(u.membershipStartDate) : new Date();
      const end = u.membershipEndDate ? new Date(u.membershipEndDate) : addMonths(start, duration);

      const ownerId = u.createdBy || u.gymId; // prefer createdBy, fallback to gymId
      if (!ownerId) {
        console.warn(`Member ${u._id} has no owner (createdBy/gymId). Skipping.`);
        continue;
      }

      await Payment.create({
        member: u._id,
        gymOwner: ownerId,
        memberSnapshot: { id: u._id, name: u.name, email: u.email, phone: u.phone },
        gymSnapshot: { id: ownerId }, // name/email can be backfilled later
        amount,
        // With no breakdown available, set planCost = amount and trainerCost = 0
        planCost: amount,
        trainerCost: 0,
        planType,
        duration,
        paymentMethod,
        paymentStatus: 'Completed',
        transactionId: null,
        membershipPeriod: { startDate: start, endDate: end },
        notes: 'Backfilled from users.paidAmount'
      });

      created += 1;
    } catch (e) {
      console.warn(`Failed to create payment for member ${u._id}:`, e.message);
    }
  }

  console.log(`Created payments: ${created}`);
  await mongoose.connection.close();
  console.log('Done');
};

run().catch(async (e) => {
  console.error('Backfill error:', e);
  try { await mongoose.connection.close(); } catch {}
  process.exit(1);
});