import { useEffect, useState } from 'react';
import { supabase, retryOperation } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type QueueEntry = Database['public']['Tables']['queue_entries']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row'];
};

export function useQueue() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function loadQueue() {
    try {
      console.log('Loading queue entries...'); // للتشخيص
      const { data, error } = await retryOperation(() =>
        supabase
          .from('queue_entries')
          .select(`
            *,
            customer:customers(*)
          `)
          .order('created_at', { ascending: true })
      );

      if (error) {
        console.error('Error loading queue:', error);
        throw error;
      }

      console.log('Loaded queue entries:', data); // للتشخيص
      setEntries(data as QueueEntry[]);
    } catch (err) {
      console.error('Error in loadQueue:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();

    const subscription = supabase
      .channel('queue_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries' }, (payload) => {
        console.log('Queue change received:', payload); // للتشخيص
        loadQueue();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function getBranchAverageWaitTime(branchId: string): Promise<number> {
    try {
      // Get entries from the last 24 hours for this branch
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data, error } = await retryOperation(() =>
        supabase
          .from('queue_entries')
          .select('wait_time')
          .eq('branch_id', branchId)
          .gte('created_at', twentyFourHoursAgo.toISOString())
          .not('status', 'eq', 'cancelled')
      );

      if (error) throw error;

      if (!data || data.length === 0) return 0;

      // Calculate average wait time
      const totalWaitTime = data.reduce((sum, entry) => sum + entry.wait_time, 0);
      return Math.round(totalWaitTime / data.length);
    } catch (err) {
      console.error('Error calculating branch average wait time:', err);
      return 0;
    }
  }

  async function addToQueue(customerData: {
    name: string;
    phone: string;
    guests: number;
    branch_id: string;
  }) {
    try {
      console.log('Adding to queue with data:', customerData); // للتشخيص

      // Calculate average wait time for this branch
      const averageWaitTime = await getBranchAverageWaitTime(customerData.branch_id);

      // Create or find the customer
      const { data: customer, error: customerError } = await retryOperation(() =>
        supabase
          .from('customers')
          .upsert({
            name: customerData.name,
            phone: customerData.phone,
          })
          .select()
          .single()
      );

      if (customerError) {
        console.error('Error creating customer:', customerError);
        throw customerError;
      }

      console.log('Customer created/found:', customer); // للتشخيص

      // Create the queue entry with calculated average wait time
      const { data: entry, error: queueError } = await retryOperation(() =>
        supabase
          .from('queue_entries')
          .insert({
            customer_id: customer.id,
            branch_id: customerData.branch_id,
            guests: customerData.guests,
            wait_time: averageWaitTime || 15, // Use 15 minutes as fallback if no average
            status: 'waiting',
          })
          .select()
          .single()
      );

      if (queueError) {
        console.error('Error creating queue entry:', queueError);
        throw queueError;
      }

      console.log('Queue entry created:', entry); // للتشخيص
      await loadQueue();
    } catch (err) {
      console.error('Error in addToQueue:', err);
      setError(err as Error);
      throw err;
    }
  }

  async function updateEntry(id: string, updates: { status?: string; wait_time?: number }) {
    try {
      const { error } = await retryOperation(() =>
        supabase
          .from('queue_entries')
          .update(updates)
          .eq('id', id)
      );

      if (error) {
        console.error('Error updating queue entry:', error);
        throw error;
      }

      await loadQueue();
    } catch (err) {
      console.error('Error in updateEntry:', err);
      setError(err as Error);
      throw err;
    }
  }

  return {
    entries,
    loading,
    error,
    addToQueue,
    updateEntry,
    refresh: loadQueue,
    getBranchAverageWaitTime,
  };
}