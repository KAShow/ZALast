import { initTwilio, getTwilioInstance } from './twilio';

// Initialize Twilio with credentials
initTwilio({
  accountSid: 'AC8c553eaeab12ee0071f87990516ec462',
  authToken: '35af238103665b0456e1f13da0598284',
  phoneNumber: '+97334054887'
});

// Send test message
async function sendTestMessage() {
  const twilio = getTwilioInstance();
  
  // Professional message in Arabic (65 characters)
  const message = 'مرحباً بكم في زاد السلطان. طاولتكم جاهزة، نرجو التفضل للجلوس.';
  
  // Send to test number (replace with actual recipient)
  const result = await twilio.sendSMS({
    to: '+966500000000', // Replace with actual recipient number
    body: message
  });

  console.log('WhatsApp Result:', result);
}

sendTestMessage();