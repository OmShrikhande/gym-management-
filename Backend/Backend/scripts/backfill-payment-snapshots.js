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

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI not set');
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

const backfill = async () => {
  await connectDB();

  // Find payments missing snapshots
  const cursor = Payment.find({
    $or: [
      { memberSnapshot: { $exists: false } },
      { 'memberSnapshot.name': { $exists: false } },
      { gymSnapshot: { $exists: false } },
      { 'gymSnapshot.name': { $exists: false } }
    ]
  }).cursor();

  let processed = 0;
  let updated = 0;

  for await (const p of cursor) {
    processed += 1;
    try {
      // Load member and owner minimal fields
      const [member, owner] = await Promise.all([
        p.member ? User.findById(p.member).select('name email phone') : null,
        p.gymOwner ? User.findById(p.gymOwner).select('name email') : null,
      ]);

      const memberSnapshot = p.memberSnapshot || {};
      const gymSnapshot = p.gymSnapshot || {};

      let needsUpdate = false;

      if (!memberSnapshot.name || !memberSnapshot.id) {
        memberSnapshot.id = p.member;
        memberSnapshot.name = member?.name || memberSnapshot.name || 'Unknown';
        memberSnapshot.email = member?.email || memberSnapshot.email || undefined;
        memberSnapshot.phone = member?.phone || memberSnapshot.phone || undefined;
        needsUpdate = true;
      }

      if (!gymSnapshot.name || !gymSnapshot.id) {
        gymSnapshot.id = p.gymOwner;
        gymSnapshot.name = owner?.name || gymSnapshot.name || 'Unknown Gym';
        gymSnapshot.email = owner?.email || gymSnapshot.email || undefined;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await Payment.updateOne(
          { _id: p._id },
          { $set: { memberSnapshot, gymSnapshot } }
        );
        updated += 1;
      }
    } catch (e) {
      console.warn(`Failed to update payment ${p._id}:`, e.message);
    }
  }

  console.log(`Processed: ${processed}, Updated: ${updated}`);
  await mongoose.connection.close();
  console.log('Done');
};

backfill().catch(async (e) => {
  console.error('Backfill error:', e);
  try { await mongoose.connection.close(); } catch {}
  process.exit(1);
});