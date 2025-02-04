import { supabase } from './supabase';

export async function sendQueueNotification(
  phone: string,
  message: string
): Promise<boolean> {
  try {
    // Format phone number to E.164
    const formattedPhone = formatPhoneNumber(phone);
    
    // Log notification in database
    const { error: dbError } = await supabase
      .from('notifications')
      .insert({
        phone: formattedPhone,
        message,
        status: 'sent',
        message_id: 'TEST_' + Date.now()
      });

    if (dbError) {
      console.error('Failed to log notification:', dbError);
      return false;
    }

    // Always return true since we're not actually sending messages
    return true;
  } catch (error) {
    console.error('Error in sendQueueNotification:', error);
    return false;
  }
}

// Helper function to format phone numbers to E.164
function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If the number starts with '0', remove it and add Saudi Arabia country code
  if (digits.startsWith('0')) {
    return `+966${digits.slice(1)}`;
  }
  
  // If the number doesn't start with '+', add it
  if (!phone.startsWith('+')) {
    return `+${digits}`;
  }
  
  return phone;
}