import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Crown, Building2, QrCode } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';

export default function Welcome() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [branches, setBranches] = useState<Array<{ id: string; name: string; password: string }>>([]);
  const [mode, setMode] = useState<'select' | 'branch' | 'developer'>('select');
  const [showQR, setShowQR] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadBranches = async () => {
    const { data } = await supabase
      .from('branches')
      .select('id, name, password')
      .order('name');
    
    if (data) {
      setBranches(data);
    }
  };

  const handleBranchLogin = async () => {
    setLoading(true);
    try {
      const branch = branches.find(b => b.id === selectedBranch);
      if (!branch) {
        throw new Error('الفرع غير موجود');
      }

      if (password !== branch.password) {
        throw new Error('كلمة المرور غير صحيحة');
      }

      // Store branch authentication in session storage
      sessionStorage.setItem('branchId', branch.id);
      sessionStorage.setItem('branchAuth', 'true');

      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: `مرحباً بك في فرع ${branch.name}`,
      });

      navigate(`/branch/${branch.id}`);
    } catch (error) {
      toast({
        title: "خطأ في تسجيل الدخول",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeveloperLogin = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('developer_settings')
        .select('password')
        .single();

      if (!data || password !== data.password) {
        throw new Error('كلمة المرور غير صحيحة');
      }

      // Store developer authentication in session storage
      sessionStorage.setItem('developerAuth', 'true');

      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "مرحباً بك في لوحة تحكم المدير العام",
      });

      // Navigate to branch-links instead of root
      navigate('/branch-links');
    } catch (error) {
      toast({
        title: "خطأ في تسجيل الدخول",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById('welcome-qr');
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
        
        // Add title and URL text
        ctx.font = 'bold 48px Cairo';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.direction = 'rtl';
        
        // Draw title
        ctx.fillText('زاد السلطان', canvas.width / 2, canvas.height - 120);
        
        // Draw URL in smaller font
        ctx.font = '24px Cairo';
        ctx.fillText(window.location.origin, canvas.width / 2, canvas.height - 60);

        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = 'zad-alsultan-qr.png';
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-amiri text-gold mb-2">زاد السلطان</h1>
          <p className="text-muted-foreground">نظام إدارة الحجوزات والطوابير</p>
          <Button
            variant="ghost"
            size="icon"
            className="mt-4"
            onClick={() => setShowQR(!showQR)}
          >
            <QrCode className="h-5 w-5" />
          </Button>
          {showQR && (
            <div className="mt-4 flex flex-col items-center gap-4 animate-fade-in">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG
                  id="welcome-qr"
                  value={window.location.origin}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
              <Button variant="outline" onClick={downloadQR}>
                تحميل QR
              </Button>
            </div>
          )}
        </div>

        {mode === 'select' ? (
          <Card>
            <CardHeader>
              <CardTitle>تسجيل الدخول</CardTitle>
              <CardDescription>اختر نوع الحساب للدخول</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  setMode('branch');
                  loadBranches();
                }}
              >
                <Building2 className="ml-2 h-4 w-4" />
                دخول كمدير فرع
              </Button>
              <Button
                className="w-full gold-gradient"
                onClick={() => setMode('developer')}
              >
                <Crown className="ml-2 h-4 w-4" />
                دخول المدير العام
              </Button>
            </CardContent>
          </Card>
        ) : mode === 'branch' ? (
          <Card>
            <CardHeader>
              <CardTitle>دخول مدير الفرع</CardTitle>
              <CardDescription>أدخل بيانات الفرع للدخول</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>اختر الفرع</Label>
                <select
                  className="w-full p-2 rounded-lg border border-input bg-background"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                >
                  <option value="">اختر الفرع</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                />
              </div>
              <div className="pt-4 space-y-2">
                <Button
                  className="w-full"
                  onClick={handleBranchLogin}
                  disabled={loading || !selectedBranch || !password}
                >
                  {loading ? "جاري التحقق..." : "دخول"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMode('select');
                    setPassword('');
                    setSelectedBranch('');
                  }}
                >
                  رجوع
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>دخول المدير العام</CardTitle>
              <CardDescription>أدخل كلمة مرور المدير العام للدخول</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>كلمة المرور</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                />
              </div>
              <div className="pt-4 space-y-2">
                <Button
                  className="w-full gold-gradient"
                  onClick={handleDeveloperLogin}
                  disabled={loading || !password}
                >
                  {loading ? "جاري التحقق..." : "دخول"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMode('select');
                    setPassword('');
                  }}
                >
                  رجوع
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}