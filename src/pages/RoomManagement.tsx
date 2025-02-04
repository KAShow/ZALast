import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DoorClosed, Users, Clock, Phone } from "lucide-react";
import { useQueue } from "@/hooks/use-queue";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

type Branch = {
  name: string;
  address: string;
  rooms_count: number;
};

export default function RoomManagement() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { entries, updateEntry } = useQueue();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function loadBranch() {
      if (!branchId) {
        navigate('/');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('branches')
          .select('name, address, rooms_count')
          .eq('id', branchId)
          .single();

        if (error || !data) {
          throw error;
        }

        setBranch(data);
      } catch (error) {
        console.error('Error loading branch:', error);
        toast({
          title: "خطأ",
          description: "لم نتمكن من تحميل بيانات الفرع",
          variant: "destructive"
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    }

    loadBranch();
  }, [branchId, navigate, toast]);

  // Filter entries for current branch
  const branchEntries = entries?.filter(entry => entry.branch_id === branchId) || [];

  // Get occupied rooms data
  const occupiedRooms = branchEntries
    .filter(entry => entry.status === 'seated' && entry.room_number)
    .reduce((acc, entry) => {
      acc[entry.room_number!] = entry;
      return acc;
    }, {} as { [key: number]: typeof branchEntries[0] });

  const handleCheckout = async (entryId: string) => {
    try {
      await updateEntry(entryId, { 
        status: 'completed', // تغيير الحالة من cancelled إلى completed
        room_number: null
      });
      
      toast({
        title: "تم",
        description: "تم إخلاء الغرفة بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إخلاء الغرفة",
        variant: "destructive"
      });
    }
  };

  const formatTime = (date: string) => {
    return format(parseISO(date), 'hh:mm a', { locale: ar });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-amiri text-destructive mb-4">لم يتم العثور على الفرع</h1>
          <p className="text-muted-foreground mb-4">عذراً، لم نتمكن من العثور على بيانات الفرع المطلوب</p>
          <Button onClick={() => navigate('/')} variant="outline">
            العودة للرئيسية
          </Button>
        </div>
      </div>
    );
  }

  // Create pairs of rooms
  const roomPairs = Array.from({ length: Math.ceil(branch.rooms_count / 2) }, (_, i) => {
    const firstRoom = i * 2 + 1;
    const secondRoom = firstRoom + 1;
    return [firstRoom, secondRoom].filter(room => room <= branch.rooms_count);
  });

  return (
    <div>
      <header className="mb-8 text-right">
        <h1 className="text-4xl font-amiri mb-2">إدارة الغرف - {branch.name}</h1>
        <p className="text-muted-foreground">{branch.address}</p>
      </header>

      <div className="space-y-6">
        {roomPairs.map((pair, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pair.map(roomNumber => {
              const occupant = occupiedRooms[roomNumber];
              const isOccupied = !!occupant;

              return (
                <Card key={roomNumber} className={isOccupied ? 'border-gold' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                        <DoorClosed className="h-5 w-5 text-gold" />
                        غرفة {roomNumber}
                      </CardTitle>
                      <Badge variant={isOccupied ? "default" : "secondary"}>
                        {isOccupied ? "مشغولة" : "متاحة"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isOccupied ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{occupant.customer.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{occupant.customer.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>منذ {formatTime(occupant.created_at)}</span>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => handleCheckout(occupant.id)}
                        >
                          إخلاء الغرفة
                        </Button>
                      </div>
                    ) : (
                      <div className="h-[104px] flex items-center justify-center text-muted-foreground">
                        الغرفة متاحة
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}