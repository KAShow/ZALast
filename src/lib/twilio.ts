import { z } from "zod";

// Twilio configuration schema
const twilioConfigSchema = z.object({
  accountSid: z.string(),
  authToken: z.string(),
  phoneNumber: z.string().regex(/^\+\d+$/, "Invalid phone number format"),
});

type TwilioConfig = z.infer<typeof twilioConfigSchema>;

class TwilioService {
  private config: TwilioConfig;
  private initialized: boolean = false;
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000;

  constructor(config: TwilioConfig) {
    try {
      twilioConfigSchema.parse(config);
      this.config = config;
      this.initialized = true;
    } catch (error) {
      console.error('Twilio configuration error:', error);
      this.initialized = false;
      throw new Error('Invalid Twilio configuration');
    }
  }

  private async retryWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    retryCount = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retryCount >= this.MAX_RETRIES) {
        throw error;
      }

      const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Retrying after ${delay}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryWithExponentialBackoff(operation, retryCount + 1);
    }
  }

  async sendTemplateMessage(params: { to: string; code: string }): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      if (!this.initialized) {
        throw new Error('Twilio service not properly initialized');
      }

      // Format phone number to E.164 if needed
      const toNumber = params.to.startsWith('+') ? params.to : `+${params.to}`;

      // Validate phone number format
      if (!/^\+\d{10,15}$/.test(toNumber)) {
        throw new Error(`Invalid phone number format: ${toNumber}`);
      }

      // Use proxy server to avoid CORS issues
      const proxyUrl = 'https://api.twilio.com';
      const endpoint = `/2010-04/Accounts/${this.config.accountSid}/Messages.json`;
      
      // Make API request to Twilio with retry logic
      const response = await this.retryWithExponentialBackoff(async () => {
        const res = await fetch(`${proxyUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${this.config.accountSid}:${this.config.authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          },
          mode: 'cors',
          body: new URLSearchParams({
            To: `whatsapp:${toNumber}`,
            From: `whatsapp:${this.config.phoneNumber}`,
            Body: `Your verification code is: ${params.code}`,
            // Use direct message instead of template due to CORS
            // ContentSid and ContentVariables removed
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
        }

        return res;
      });

      const data = await response.json();

      return {
        success: true,
        messageId: data.sid,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      console.error('Message sending error:', {
        error: errorMessage,
        details: error
      });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async getMessageStatus(messageId: string): Promise<{
    success: boolean;
    status?: string;
    error?: string;
  }> {
    try {
      if (!this.initialized) {
        throw new Error('Twilio service not properly initialized');
      }

      const response = await this.retryWithExponentialBackoff(async () => {
        const res = await fetch(
          `https://api.twilio.com/2010-04/Accounts/${this.config.accountSid}/Messages/${messageId}.json`,
          {
            headers: {
              'Authorization': 'Basic ' + btoa(`${this.config.accountSid}:${this.config.authToken}`),
              'Accept': 'application/json',
            },
          }
        );

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
        }

        return res;
      });

      const data = await response.json();

      return {
        success: true,
        status: data.status,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get message status';
      console.error('Error fetching message status:', {
        error: errorMessage,
        details: error
      });
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

// Create singleton instance
let twilioInstance: TwilioService | null = null;

export function initTwilio(config: TwilioConfig): TwilioService {
  if (!twilioInstance) {
    twilioInstance = new TwilioService(config);
  }
  return twilioInstance;
}

export function getTwilioInstance(): TwilioService {
  if (!twilioInstance) {
    twilioInstance = new TwilioService({
      accountSid: 'AC30489b1b4ca8712fa8f3c2dc5a3b83b4',
      authToken: '5e4257b6ea4d75fe8fc4e586c348cf7a',
      phoneNumber: '+14155238886'
    });
  }
  return twilioInstance;
}