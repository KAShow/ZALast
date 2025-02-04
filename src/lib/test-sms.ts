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
  
  // Professional message in Arabic
  const message = 'مرحباً بكم في زاد السلطان. نتشرف بخدمتكم.';
  
  // Send to the provided number
  const result = await twilio.sendSMS({
    to: '+97333461653',
    body: message
  });

  console.log('WhatsApp Result:', result);
}

sendTestMessage()
  .then(() => console.log('Message sent successfully'))
  .catch(error => console.error('Error sending message:', error));