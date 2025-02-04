import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = 'https://gijcwkyvqqnzlrxqbwjw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpamN3a3l2cXFuemxyeHFid2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyMzcxOTAsImV4cCI6MjA1MzgxMzE5MH0.bIWaPa_XUYlVZ01D3_KFoKs5_IJlFUFbOue6axNFz8I';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: { 'x-my-custom-header': 'my-app-name' }
  },
  // Add retry configuration
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Helper function to retry failed requests
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i))); // Exponential backoff
      }
    }
  }
  
  throw lastError;
}

// Helper function to check if a branch exists
export async function checkBranchExists(branchId: string) {
  try {
    const { data, error } = await retryOperation(() => 
      supabase
        .from('branches')
        .select('id')
        .eq('id', branchId)
        .single()
    );
      
    if (error) {
      console.error('Error checking branch:', error);
      return false;
    }
    
    return !!data;
  } catch (err) {
    console.error('Error in checkBranchExists:', err);
    return false;
  }
}