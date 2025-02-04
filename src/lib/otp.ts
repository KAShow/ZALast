import { supabase } from '@/lib/supabase';

// Generate a fixed OTP code for testing
function generateOTPCode(): string {
  return '123456'; // Fixed OTP code for testing
}

// Send OTP code
export async function sendOTP(phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First check if there's an existing valid OTP
    const { data: existingOTP } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone', phone)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingOTP && existingOTP.length > 0) {
      // Return success if there's a valid OTP
      return { success: true };
    }

    const code = generateOTPCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Store OTP in database
    const { error: dbError } = await supabase
      .from('otp_verifications')
      .insert({
        phone,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (dbError) throw dbError;

    // For testing: Log OTP to console
    console.log('Fixed OTP code for testing:', code);

    return { success: true };
  } catch (error) {
    console.error('Error sending OTP:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send OTP'
    };
  }
}

// Verify OTP code
export async function verifyOTP(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    // For testing: Always accept 123456 as valid OTP
    if (code === '123456') {
      // Mark any existing OTPs as verified
      await supabase
        .from('otp_verifications')
        .update({ verified: true })
        .eq('phone', phone)
        .eq('verified', false);

      return { success: true };
    }

    // Get latest unverified OTP for this phone number
    const { data: otps, error: fetchError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone', phone)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;

    if (!otps || otps.length === 0) {
      return {
        success: false,
        error: 'No valid OTP found'
      };
    }

    const otp = otps[0];

    // Check if code matches
    if (otp.code !== code) {
      return {
        success: false,
        error: 'Invalid OTP code'
      };
    }

    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from('otp_verifications')
      .update({ verified: true })
      .eq('id', otp.id);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify OTP'
    };
  }
}