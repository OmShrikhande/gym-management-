// Test script to verify receipt email functionality
// Run with: node test-receipt-email.js

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Import email service
import { sendMemberPaymentReceipt, sendManualReceipt } from './src/services/emailService.js';

const testEmailConfiguration = () => {
  console.log('🔧 Checking Email Configuration...');
  
  const requiredEnvVars = [
    'SMTP_HOST',
    'SMTP_PORT', 
    'SMTP_USER',
    'SMTP_PASS'
  ];
  
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing);
    return false;
  }
  
  console.log('✅ All email environment variables are set');
  console.log(`📧 SMTP Host: ${process.env.SMTP_HOST}`);
  console.log(`📧 SMTP Port: ${process.env.SMTP_PORT}`);
  console.log(`📧 SMTP User: ${process.env.SMTP_USER}`);
  console.log(`📧 SMTP From: ${process.env.SMTP_FROM || process.env.SMTP_USER}`);
  
  return true;
};

const testMemberReceipt = async () => {
  console.log('\n🧪 Testing Member Payment Receipt...');
  
  const testReceiptData = {
    to: 'test@example.com', // Change to your test email
    memberName: 'John Test Member',
    memberEmail: 'test@example.com',
    gymName: 'Test Gym',
    gymOwnerName: 'Test Gym Owner',
    gymOwnerEmail: 'owner@testgym.com',
    trainerName: 'Test Trainer',
    amount: 1500,
    planType: 'Premium',
    duration: 3,
    periodStart: new Date(),
    periodEnd: new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)), // 90 days from now
    paymentMethod: 'UPI',
    transactionId: 'TEST_' + Date.now(),
    notes: 'This is a test receipt - please ignore'
  };
  
  try {
    const result = await sendMemberPaymentReceipt(testReceiptData);
    
    if (result.sent) {
      console.log('✅ Member receipt sent successfully!');
      console.log(`📧 Message ID: ${result.messageId}`);
      console.log(`📧 Sent to: ${testReceiptData.to}`);
    } else {
      console.log('❌ Member receipt failed to send');
      console.log(`📧 Reason: ${result.reason}`);
    }
    
    return result.sent;
  } catch (error) {
    console.error('❌ Error testing member receipt:', error.message);
    return false;
  }
};

const testManualReceipt = async () => {
  console.log('\n🧪 Testing Manual Receipt...');
  
  const testReceiptData = {
    memberName: 'Jane Test Member',
    memberEmail: 'test@example.com', // Change to your test email
    gymName: 'Test Gym - Manual Receipt',
    gymOwnerName: 'Test Gym Owner',
    gymOwnerEmail: 'owner@testgym.com',
    trainerName: 'Test Trainer 2',
    amount: 2000,
    planType: 'Basic',
    duration: 1,
    periodStart: new Date(),
    periodEnd: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)), // 30 days from now
    paymentMethod: 'Cash',
    transactionId: 'MANUAL_' + Date.now(),
    notes: 'This is a manual test receipt - please ignore'
  };
  
  try {
    const result = await sendManualReceipt(testReceiptData);
    
    if (result.sent) {
      console.log('✅ Manual receipt sent successfully!');
      console.log(`📧 Message ID: ${result.messageId}`);
      console.log(`📧 Sent to: ${testReceiptData.memberEmail}`);
    } else {
      console.log('❌ Manual receipt failed to send');
      console.log(`📧 Reason: ${result.reason}`);
    }
    
    return result.sent;
  } catch (error) {
    console.error('❌ Error testing manual receipt:', error.message);
    return false;
  }
};

const runTests = async () => {
  console.log('🚀 Starting Receipt Email Test Suite');
  console.log('=====================================\n');
  
  // Test 1: Configuration
  const configOk = testEmailConfiguration();
  if (!configOk) {
    console.error('\n❌ Email configuration test failed. Please check your environment variables.');
    process.exit(1);
  }
  
  // Test 2: Member Receipt
  const memberReceiptOk = await testMemberReceipt();
  
  // Test 3: Manual Receipt
  const manualReceiptOk = await testManualReceipt();
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log(`Configuration: ${configOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Member Receipt: ${memberReceiptOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Manual Receipt: ${manualReceiptOk ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = configOk && memberReceiptOk && manualReceiptOk;
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Receipt system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the configuration and try again.');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. Check your test email inbox for received receipts');
  console.log('2. Verify the receipt formatting looks correct');
  console.log('3. Test the manual receipt form from the frontend');
  console.log('4. Record a test payment to verify automatic receipts');
  
  process.exit(allPassed ? 0 : 1);
};

// Run the tests
runTests().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});