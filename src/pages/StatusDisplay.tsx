import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQueue } from "@/hooks/use-queue";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ArrowRight, DoorClosed } from "lucide-react";
import { playSound, preloadSounds } from "@/lib/sounds";

export default function StatusDisplay() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { entries, refresh } = useQueue();
  const [branch, setBranch] = useState<{ name: string; address: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const prevEntriesRef = useRef<typeof entries>([]);

  // Preload sounds on component mount
  useEffect(() => {
    preloadSounds();
  }, []);

  useEffect(() => {
    async function loadBranch() {
      if (!branchId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('branches')
        .select('name, address')
        .eq('id', branchId)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      setBranch(data);
      setLoading(false);
    }

    loadBranch();
  }, [branchId]);

  useEffect(() => {
    // Refresh queue data every 5 seconds
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Check for status changes and play sounds
  useEffect(() => {
    if (!entries || !prevEntriesRef.current) return;

    entries.forEach(entry => {
      const prevEntry = prevEntriesRef.current?.find(e => e.id === entry.id);
      
      if (prevEntry && prevEntry.status !== entry.status) {
        // Status has changed, play appropriate sound
        switch (entry.status) {
          case 'called':
            playSound('CALLED');
            break;
          case 'seated':
            playSound('SEATED');
            break;
          case 'cancelled':
            playSound('CANCELLED');
            break;
        }
      }
    });

    // Update previous entries reference
    prevEntriesRef.current = entries;
  }, [entries]);

  // Filter entries for current branch
  const branchEntries = entries?.filter(entry => entry.branch_id === branchId);

  const getProgressValue = (status: string) => {
    switch (status) {
      case "waiting":
        return 25;
      case "called":
        return 75;
      case "seated":
        return 100;
      default:
        return 0;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "waiting":
        return "في الانتظار";
      case "called":
        return "تم الاستدعاء";
      case "seated":
        return "تم الجلوس";
      case "cancelled":
        return "ملغي";
      case "completed":
        return "مكتمل";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "text-gold";
      case "called":
        return "text-green-500";
      case "seated":
        return "text-green-700";
      case "cancelled":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const activeEntries = branchEntries?.filter(
    (entry) => entry.status !== "cancelled" && entry.status !== "completed"
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-lg text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  if (!branch || !branchId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-amiri text-destructive">لم يتم العثور على الفرع</h1>
          <p className="text-muted-foreground">عذراً، لم نتمكن من العثور على معلومات الفرع</p>
          <Button asChild variant="outline">
            <Link to={`/booking/${branchId}`}>
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة لصفحة الحجز
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b p-8 text-center mb-8">
        <h1 className="text-5xl font-amiri text-gold mb-4">
          {branch.name}
        </h1>
        <p className="text-2xl text-muted-foreground">
          {branch.address}
        </p>
      </header>

      <div className="container mx-auto p-4">
        {activeEntries?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">لا يوجد عملاء في قائمة الانتظار حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeEntries?.map((entry) => (
              <Card key={entry.id} className="border-2 border-gold/20 animate-fade-in">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-3xl font-amiri text-gold">
                        {entry.customer.name}
                      </h2>
                      <p className="text-lg text-muted-foreground">
                        {entry.guests} {entry.guests === 1 ? 'شخص' : 'أشخاص'}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className={`text-2xl font-bold ${getStatusColor(entry.status)}`}>
                        {getStatusText(entry.status)}
                      </p>
                      {entry.status === "waiting" && (
                        <p className="text-muted-foreground">
                          وقت الانتظار المتوقع: {entry.wait_time} دقيقة
                        </p>
                      )}
                      {(entry.status === "called" || entry.status === "seated") && entry.room_number && (
                        <div className="flex items-center gap-2 text-green-600 mt-1">
                          <DoorClosed className="h-4 w-4" />
                          <span>غرفة رقم {entry.room_number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Progress 
                    value={getProgressValue(entry.status)} 
                    className="h-3"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 text-center">
        <p className="text-muted-foreground">
          يتم تحديث حالة الطلبات كل 5 ثواني
        </p>
      </footer>
    </div>
  );
}