import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Users, Clock, Home, Plus, Minus } from "lucide-react";
import { useBookings } from '@/hooks/use-bookings';
import { useQueue } from '@/hooks/use-queue';
import { useSettings } from '@/hooks/use-settings';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type Branch = {
  id: string;
  name: string;
  address: string;
  rooms_count: number;
};

export default function Dashboard() {
  const { bookings } = useBookings();
  const { entries: queueEntries } = useQueue();
  const { settings } = useSettings();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const isDeveloper = sessionStorage.getItem('developerAuth') === 'true';

  useEffect(() => {
    async function loadBranches() {
      try {
        const { data, error } = await supabase
          .from('branches')
          .select('*')
          .order('name');

        if (error) throw error;

        setBranches(data || []);
        if (data && data.length > 0) {
          setSelectedBranch(data[0]);
        }
      } catch (error) {
        console.error('Error loading branches:', error);
        toast({
          title: "خطأ",
          description: "لم نتمكن من تحميل بيانات الفروع",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    loadBranches();
  }, [toast]);

  // Filter data for selected branch
  const branchBookings = bookings?.filter(b => b.branch_id === selectedBranch?.id);
  const branchQueueEntries = queueEntries?.filter(e => e.branch_id === selectedBranch?.id);

  const occupiedRooms = branchBookings?.filter(b => b.status === 'confirmed').length || 0;
  const waitingCustomers = branchQueueEntries?.filter(e => e.status === 'waiting').length || 0;
  const averageWaitTime = branchQueueEntries?.reduce((acc, curr) => acc + curr.wait_time, 0) / (branchQueueEntries?.length || 1) || 0;
  const totalRooms = selectedBranch?.rooms_count || 0;

  const updateRoomCount = async (increment: boolean) => {
    if (!selectedBranch) return;

    const newCount = increment ? selectedBranch.rooms_count + 1 : Math.max(1, selectedBranch.rooms_count - 1);

    try {
      const { error } = await supabase
        .from('branches')
        .update({ rooms_count: newCount })
        .eq('id', selectedBranch.id);

      if (error) throw error;

      setSelectedBranch({ ...selectedBranch, rooms_count: newCount });
      setBranches(branches.map(branch => 
        branch.id === selectedBranch.id 
          ? { ...branch, rooms_count: newCount }
          : branch
      ));

      toast({
        title: "تم التحديث",
        description: `تم تحديث عدد الغرف إلى ${newCount} غرفة`,
      });
    } catch (error) {
      console.error('Error updating room count:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث عدد الغرف",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <header className="mb-8 text-right">
        <h1 className="text-4xl font-amiri mb-4">لوحة التحكم</h1>
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">نظرة عامة على حالة المطعم</p>
        </div>
        {selectedBranch && (
          <p className="text-muted-foreground mt-2">{selectedBranch.address}</p>
        )}
      </header>

      {selectedBranch ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-gold" />
                <span>الغرف المشغولة</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-brown">{occupiedRooms}</p>
              <p className="text-muted-foreground">من أصل {totalRooms} غرفة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gold" />
                <span>في الانتظار</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-brown">{waitingCustomers}</p>
              <p className="text-muted-foreground">عميل</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gold" />
                <span>وقت الانتظار</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-brown">{Math.round(averageWaitTime)}</p>
              <p className="text-muted-foreground">دقيقة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-gold" />
                <span>الغرف العائلية</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-brown">{totalRooms}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateRoomCount(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateRoomCount(false)}
                    disabled={totalRooms <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-muted-foreground">غرفة عائلية</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-xl text-muted-foreground">الرجاء اختيار فرع من القائمة الجانبية لعرض بياناته</p>
        </div>
      )}
    </div>
  );
}