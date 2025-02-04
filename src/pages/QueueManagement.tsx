import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Archive, DoorClosed } from "lucide-react";
import { useQueue } from "@/hooks/use-queue";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isToday, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sendQueueNotification } from '@/lib/notifications';
import { useToast } from "@/hooks/use-toast";

type Branch = {
  name: string;
  address: string;
  rooms_count: number;
};

export default function QueueManagement() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { entries, updateEntry, refresh } = useQueue();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [isAssigningRoom, setIsAssigningRoom] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
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
      }
    }

    loadBranch();
  }, [branchId, navigate, toast]);

  useEffect(() => {
    // Refresh queue data every 30 seconds
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Filter entries for current branch
  const branchEntries = entries?.filter(entry => entry.branch_id === branchId) || [];

  // Get occupied room numbers
  const occupiedRooms = branchEntries
    .filter(entry => entry.status === 'seated' && entry.room_number)
    .map(entry => entry.room_number);

  // Generate available room numbers
  const availableRooms = branch ? Array.from(
    { length: branch.rooms_count },
    (_, i) => i + 1
  ).filter(room => !occupiedRooms.includes(room)) : [];

  // Separate entries into today and archive
  const todayEntries = branchEntries.filter(entry => 
    isToday(parseISO(entry.created_at)) &&
    entry.status !== 'completed' // Only show entries that haven't been completed yet
  );

  const archivedEntries = branchEntries.filter(entry => 
    !isToday(parseISO(entry.created_at)) ||
    entry.status === 'completed' ||
    entry.status === 'cancelled'
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleStatusUpdate = async (id: string, status: string, roomNumber?: number) => {
    try {
      const entry = entries.find(e => e.id === id);
      if (!entry) throw new Error('Entry not found');

      const updates: { status: string; room_number?: number | null } = { status };
      
      if (status === 'seated' && roomNumber) {
        updates.room_number = roomNumber;
        
        // Send notification for seating
        await sendQueueNotification(
          entry.customer.phone,
          `طاولتكم جاهزة في الغرفة رقم ${roomNumber}، نرجو التفضل للجلوس.`
        );
      } else if (status === 'cancelled') {
        updates.room_number = null;
        
        // Send notification for cancellation
        await sendQueueNotification(
          entry.customer.phone,
          'عذراً، تم إلغاء حجزكم. نأمل زيارتكم في وقت آخر.'
        );
      } else if (status === 'completed') {
        // Send thank you message
        await sendQueueNotification(
          entry.customer.phone,
          'شكراً لزيارتكم زاد السلطان. نتشرف بخدمتكم مرة أخرى.'
        );
      }

      await updateEntry(id, updates);
      
      if (status === 'seated') {
        setIsAssigningRoom(false);
        setSelectedEntry(null);
        setSelectedRoom("");
      }
      
      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة العميل بنجاح",
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "خطأ",
        description: "لم نتمكن من تحديث الحالة. الرجاء المحاولة مرة أخرى.",
        variant: "destructive"
      });
    }
  };

  const handleRoomAssignment = async () => {
    if (!selectedEntry || !selectedRoom) return;
    await handleStatusUpdate(selectedEntry, 'seated', parseInt(selectedRoom));
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "waiting":
        return "secondary";
      case "called":
        return "warning";
      case "seated":
        return "success";
      case "cancelled":
        return "destructive";
      default:
        return "default";
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

  const formatDate = (date: string) => {
    return format(parseISO(date), 'dd MMMM yyyy', { locale: ar });
  };

  const formatTime = (date: string) => {
    return format(parseISO(date), 'hh:mm a', { locale: ar });
  };

  const calculateWaitTime = (entry: any) => {
    const startTime = new Date(entry.created_at).getTime();
    const currentTime = new Date().getTime();
    
    if (entry.status === 'waiting') {
      // للعملاء في الانتظار، نحسب الوقت من بداية الحجز حتى الآن
      const waitTimeInMinutes = Math.round((currentTime - startTime) / (1000 * 60));
      return `${waitTimeInMinutes} دقيقة`;
    } else if (entry.status === 'called' || entry.status === 'seated' || entry.status === 'completed') {
      // للعملاء الذين تم استدعاؤهم أو إجلاسهم، نحسب الوقت من بداية الحجز حتى وقت التحديث
      const endTime = new Date(entry.updated_at).getTime();
      const waitTimeInMinutes = Math.round((endTime - startTime) / (1000 * 60));
      return `${waitTimeInMinutes} دقيقة`;
    } else {
      // للحالات الأخرى مثل الإلغاء
      return '-';
    }
  };

  if (!branch) return null;

  return (
    <div>
      <header className="mb-8 text-right">
        <h1 className="text-4xl font-amiri mb-2">إدارة الطوابير - {branch.name}</h1>
        <p className="text-muted-foreground">{branch.address}</p>
      </header>

      <Dialog open={isAssigningRoom} onOpenChange={setIsAssigningRoom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحديد الغرفة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>رقم الغرفة</Label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر رقم الغرفة" />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.map((room) => (
                    <SelectItem key={room} value={room.toString()}>
                      غرفة {room}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              className="w-full" 
              onClick={handleRoomAssignment}
              disabled={!selectedRoom}
            >
              تأكيد
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="today" className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <TabsList>
            <TabsTrigger value="today" className="gap-2">
              <Clock className="h-4 w-4" />
              في الطابور
            </TabsTrigger>
            <TabsTrigger value="archive" className="gap-2">
              <Archive className="h-4 w-4" />
              الأرشيف
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="today" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الانتظار</TableHead>
                  <TableHead>اسم العميل</TableHead>
                  <TableHead>عدد الأشخاص</TableHead>
                  <TableHead>وقت الانتظار</TableHead>
                  <TableHead>رقم الجوال</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{entry.customer.name}</TableCell>
                    <TableCell>{entry.guests}</TableCell>
                    <TableCell>{calculateWaitTime(entry)}</TableCell>
                    <TableCell>{entry.customer.phone}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(entry.status)}>
                        {getStatusText(entry.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {entry.status === "waiting" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(entry.id, "called")}
                          >
                            استدعاء
                          </Button>
                        )}
                        {entry.status === "called" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEntry(entry.id);
                              setIsAssigningRoom(true);
                            }}
                          >
                            <DoorClosed className="ml-2 h-4 w-4" />
                            تحديد الغرفة
                          </Button>
                        )}
                        {(entry.status === "waiting" || entry.status === "called") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(entry.id, "cancelled")}
                          >
                            إلغاء
                          </Button>
                        )}
                        {entry.status === "seated" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(entry.id, "completed")}
                          >
                            إنهاء الزيارة
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="archive" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الوقت</TableHead>
                  <TableHead>رقم الانتظار</TableHead>
                  <TableHead>اسم العميل</TableHead>
                  <TableHead>عدد الأشخاص</TableHead>
                  <TableHead>وقت الانتظار</TableHead>
                  <TableHead>رقم الجوال</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>رقم الغرفة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.created_at)}</TableCell>
                    <TableCell>{formatTime(entry.created_at)}</TableCell>
                    <TableCell className="font-medium">
                      {entry.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{entry.customer.name}</TableCell>
                    <TableCell>{entry.guests}</TableCell>
                    <TableCell>{calculateWaitTime(entry)}</TableCell>
                    <TableCell>{entry.customer.phone}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(entry.status)}>
                        {getStatusText(entry.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {entry.room_number ? `غرفة ${entry.room_number}` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}