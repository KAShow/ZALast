import { supabase } from './supabase';

async function createTestBooking() {
  try {
    // 1. إنشاء عميل جديد
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .upsert({
        name: "محمد العتيبي",
        phone: "0512345678"
      })
      .select()
      .single();

    if (customerError) throw customerError;

    // 2. إنشاء حجز جديد
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id: customer.id,
        branch_id: "d87c0ea4-1c4c-4d47-b7c7-7c8bb23946b2", // فرع الرياض العليا
        guests: 4,
        date: new Date().toISOString().split('T')[0], // اليوم
        time: "21:00",
        status: "pending"
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    console.log('تم إنشاء الحجز بنجاح:', booking);
    return booking;
  } catch (error) {
    console.error('خطأ في إنشاء الحجز:', error);
    throw error;
  }
}

// تنفيذ الحجز
createTestBooking();