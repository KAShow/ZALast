import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Booking = Database['public']['Tables']['bookings']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row'];
};

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function loadBookings() {
    try {
      console.log('Loading bookings...'); // للتشخيص
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:customers(*)
        `)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) {
        console.error('Error loading bookings:', error);
        throw error;
      }

      console.log('Loaded bookings:', data); // للتشخيص
      setBookings(data as Booking[]);
    } catch (err) {
      console.error('Error in loadBookings:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();

    const subscription = supabase
      .channel('booking_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        console.log('Booking change received:', payload); // للتشخيص
        loadBookings();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function createBooking(bookingData: {
    name: string;
    phone: string;
    guests: number;
    date: string;
    time: string;
    branch_id?: string;
  }) {
    try {
      console.log('Creating booking with data:', bookingData); // للتشخيص

      // First, create or find the customer
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .upsert({
          name: bookingData.name,
          phone: bookingData.phone,
        })
        .select()
        .single();

      if (customerError) {
        console.error('Error creating customer:', customerError);
        throw customerError;
      }

      console.log('Customer created/found:', customer); // للتشخيص

      // Then, create the booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_id: customer.id,
          branch_id: bookingData.branch_id,
          guests: bookingData.guests,
          date: bookingData.date,
          time: bookingData.time,
          status: 'pending',
        })
        .select()
        .single();

      if (bookingError) {
        console.error('Error creating booking:', bookingError);
        throw bookingError;
      }

      console.log('Booking created:', booking); // للتشخيص
      await loadBookings();
    } catch (err) {
      console.error('Error in createBooking:', err);
      setError(err as Error);
      throw err;
    }
  }

  async function updateBooking(id: string, status: string) {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', id);

      if (error) {
        console.error('Error updating booking:', error);
        throw error;
      }

      await loadBookings();
    } catch (err) {
      console.error('Error in updateBooking:', err);
      setError(err as Error);
      throw err;
    }
  }

  return {
    bookings,
    loading,
    error,
    createBooking,
    updateBooking,
    refresh: loadBookings,
  };
}