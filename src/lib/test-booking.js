import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gijcwkyvqqnzlrxqbwjw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpamN3a3l2cXFuemxyeHFid2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyMzcxOTAsImV4cCI6MjA1MzgxMzE5MH0.bIWaPa_XUYlVZ01D3_KFoKs5_IJlFUFbOue6axNFz8I';

const supabase = createClient(supabaseUrl, supabaseKey);

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

    if (customerError) {
      console.error('خطأ في إنشاء العميل:', customerError);
      throw customerError;
    }

    console.log('تم إنشاء العميل:', customer);

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

    if (bookingError) {
      console.error('خطأ في إنشاء الحجز:', bookingError);
      throw bookingError;
    }

    console.log('تم إنشاء الحجز بنجاح:', booking);
    return booking;
  } catch (error) {
    console.error('خطأ في العملية:', error);
    throw error;
  }
}

// تنفيذ الحجز
createTestBooking()
  .then(() => console.log('تمت العملية بنجاح'))
  .catch(err => console.error('فشلت العملية:', err))
  .finally(() => process.exit());