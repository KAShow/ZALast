import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RefreshCw, Copy, Download, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Branch = {
  id: string;
  name: string;
  address: string;
  phone: string;
  booking_url?: string;
};

export default function BranchLinks() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadBranches();
  }, []);

  async function loadBranches() {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name');

      if (error) throw error;

      // Generate booking URLs for branches that don't have one
      const updatedBranches = data?.map(branch => ({
        ...branch,
        booking_url: branch.booking_url || `${window.location.origin}/booking/${branch.id}`
      }));

      setBranches(updatedBranches || []);
    } catch (error) {
      console.error('Error loading branches:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل الفروع",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  async function regenerateLink(branchId: string) {
    try {
      const newUrl = `${window.location.origin}/booking/${branchId}?t=${Date.now()}`;
      const { error } = await supabase
        .from('branches')
        .update({ booking_url: newUrl })
        .eq('id', branchId);

      if (error) throw error;

      setBranches(branches.map(branch => 
        branch.id === branchId 
          ? { ...branch, booking_url: newUrl }
          : branch
      ));

      toast({
        title: "تم",
        description: "تم تحديث رابط الحجز بنجاح",
      });
    } catch (error) {
      console.error('Error regenerating link:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث رابط الحجز",
        variant: "destructive"
      });
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
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

  const openLink = (url: string) => {
    window.open(url, '_blank');
  };

  const downloadQR = (branch: Branch) => {
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
        // Create a larger canvas for better print quality
        canvas.width = 1000; // Increased size for better print quality
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
        ctx.fillText(branch.booking_url || '', canvas.width / 2, canvas.height - 60);

        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `qr-${branch.name}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
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
    <div className="space-y-6">
      <header className="mb-8 text-right">
        <h1 className="text-4xl font-amiri mb-2">روابط الفروع</h1>
        <p className="text-muted-foreground">إدارة روابط الحجز وأكواد QR للفروع</p>
      </header>

      <div className="grid gap-6">
        {branches.map((branch) => (
          <Card key={branch.id} className="animate-fade-in">
            <CardHeader>
              <CardTitle>{branch.name}</CardTitle>
              <CardDescription>{branch.address}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">رابط الحجز</label>
                    <div className="flex gap-2">
                      <Input
                        value={branch.booking_url}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => regenerateLink(branch.id)}
                        title="تحديث الرابط"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(branch.booking_url || '')}
                      className="flex gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      نسخ الرابط
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => downloadQR(branch)}
                      className="flex gap-2"
                    >
                      <Download className="h-4 w-4" />
                      تحميل QR
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => openLink(branch.booking_url || '')}
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
                    value={branch.booking_url || ''}
                    size={160}
                    level="H"
                    includeMargin
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}