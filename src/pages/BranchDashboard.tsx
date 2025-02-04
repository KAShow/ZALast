import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Users, Clock, Home, Plus, Minus, Copy, Download, ExternalLink } from "lucide-react";
import { useBookings } from '@/hooks/use-bookings';
import { useQueue } from '@/hooks/use-queue';
import { useSettings } from '@/hooks/use-settings';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';

type Branch = {
  id: string;
  name: string;
  address: string;
  rooms_count: number;
  expected_wait_time: number;
};

export default function BranchDashboard() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { bookings } = useBookings();
  const { entries: queueEntries } = useQueue();
  const { settings } = useSettings();
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
          .select('*')
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

  // Filter data for current branch
  const branchQueueEntries = queueEntries?.filter(e => e.branch_id === branchId);

  const occupiedRooms = branchQueueEntries?.filter(e => e.status === 'seated' && e.room_number).length || 0;
  const waitingCustomers = branchQueueEntries?.filter(e => e.status === 'waiting').length || 0;
  const averageWaitTime = branchQueueEntries?.reduce((acc, curr) => acc + curr.wait_time, 0) / (branchQueueEntries?.length || 1) || 0;
  const totalRooms = branch?.rooms_count || 0;

  const bookingUrl = `${window.location.origin}/booking/${branchId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      toast({
        title: "تم",
        description: "تم نسخ الرابط",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل نسخ الرابط",
        variant: "destructive"
      });
    }
  };

  const downloadQR = () => {
    if (!branch) return;

    const svg = document.getElementById(`qr-${branch.id}`);
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('Could not get canvas context');
        return;
      }

      const img = new Image();
      img.onload = () => {
        canvas.width = 1000;
        canvas.height = 1000;
        
        // Fill background white
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw QR code
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Add branch name and URL text
        ctx.font = 'bold 48px Cairo';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.direction = 'rtl';
        
        // Draw branch name
        ctx.fillText(branch.name, canvas.width / 2, canvas.height - 120);
        
        // Draw URL in smaller font
        ctx.font = '24px Cairo';
        ctx.fillText(bookingUrl, canvas.width / 2, canvas.height - 60);

        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `qr-${branch.name}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  const openBookingPage = () => {
    window.open(bookingUrl, '_blank');
  };

  const updateRoomCount = async (increment: boolean) => {
    if (!branch) return;

    const newCount = increment ? branch.rooms_count + 1 : Math.max(1, branch.rooms_count - 1);

    try {
      const { error } = await supabase
        .from('branches')
        .update({ rooms_count: newCount })
        .eq('id', branch.id);

      if (error) throw error;

      setBranch({ ...branch, rooms_count: newCount });
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

  const updateExpectedWaitTime = async (increment: boolean) => {
    if (!branch) return;

    const newTime = increment 
      ? Math.min(60, branch.expected_wait_time + 5) 
      : Math.max(5, branch.expected_wait_time - 5);

    try {
      const { error } = await supabase
        .from('branches')
        .update({ expected_wait_time: newTime })
        .eq('id', branch.id);

      if (error) throw error;

      setBranch({ ...branch, expected_wait_time: newTime });
      toast({
        title: "تم التحديث",
        description: `تم تحديث وقت الانتظار إلى ${newTime} دقيقة`,
      });
    } catch (error) {
      console.error('Error updating wait time:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث وقت الانتظار",
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

  return (
    <div className="animate-fade-in">
      <header className="mb-8 text-right">
        <h1 className="text-4xl font-amiri mb-2">{branch?.name}</h1>
        <p className="text-muted-foreground">{branch?.address}</p>
      </header>

      <div className="space-y-6">
        {/* First Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-xl">
                <Clock className="h-5 w-5 text-gold" />
                <span>وقت الانتظار المتوقع بين الطلبات</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateExpectedWaitTime(false)}
                  disabled={branch?.expected_wait_time <= 5}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <span className="text-3xl font-bold text-brown">{branch?.expected_wait_time}</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateExpectedWaitTime(true)}
                  disabled={branch?.expected_wait_time >= 60}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-xl">
                <Home className="h-5 w-5 text-gold" />
                <span>عدد الغرف العائلية في الفرع</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateRoomCount(false)}
                  disabled={totalRooms <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <span className="text-3xl font-bold text-brown">{totalRooms}</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateRoomCount(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-xl">
                <Clock className="h-5 w-5 text-gold" />
                <span>متوسط وقت الانتظار</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold text-brown">{Math.round(averageWaitTime)}</p>
                <p className="text-muted-foreground">دقيقة</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-xl">
                <Users className="h-5 w-5 text-gold" />
                <span>في الانتظار</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold text-brown">{waitingCustomers}</p>
                <p className="text-muted-foreground">عميل</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-xl">
                <Crown className="h-5 w-5 text-gold" />
                <span>الغرف المشغولة</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold text-brown">{occupiedRooms}</p>
                <p className="text-muted-foreground">من أصل {totalRooms} غرفة</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* QR Code and Booking Link Section - Now at the bottom */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">رابط الحجز وكود QR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1 space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-mono break-all">{bookingUrl}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={copyToClipboard}
                    className="flex gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    نسخ الرابط
                  </Button>
                  <Button
                    variant="outline"
                    onClick={downloadQR}
                    className="flex gap-2"
                  >
                    <Download className="h-4 w-4" />
                    تحميل QR
                  </Button>
                  <Button
                    variant="outline"
                    onClick={openBookingPage}
                    className="flex gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    فتح الرابط
                  </Button>
                </div>
              </div>
              <div className="w-48 h-48 flex items-center justify-center bg-white rounded-lg p-4">
                <QRCodeSVG
                  id={`qr-${branch.id}`}
                  value={bookingUrl}
                  size={160}
                  level="H"
                  includeMargin
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}