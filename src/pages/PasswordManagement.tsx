import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase';
import { Lock } from 'lucide-react';

export default function PasswordManagement() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string>('');
  const { toast } = useToast();
  const isDeveloper = sessionStorage.getItem('developerAuth') === 'true';
  const branchId = sessionStorage.getItem('branchId');

  useEffect(() => {
    const loadInitialData = async () => {
      if (isDeveloper) {
        const { data } = await supabase
          .from('developer_settings')
          .select('id')
          .single();
        
        if (data) {
          setSettingsId(data.id);
        }
      } else if (branchId) {
        // Load branch name for display
        const { data } = await supabase
          .from('branches')
          .select('name')
          .eq('id', branchId)
          .single();
        
        if (data) {
          setBranchName(data.name);
        }
      }
    };

    loadInitialData();
  }, [isDeveloper, branchId]);

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمة المرور الجديدة غير متطابقة",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "خطأ",
        description: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (isDeveloper && settingsId) {
        // Verify current developer password
        const { data: devSettings } = await supabase
          .from('developer_settings')
          .select('password')
          .eq('id', settingsId)
          .single();

        if (!devSettings || devSettings.password !== currentPassword) {
          throw new Error('كلمة المرور الحالية غير صحيحة');
        }

        // Update developer password
        const { error: updateError } = await supabase
          .from('developer_settings')
          .update({ password: newPassword })
          .eq('id', settingsId);

        if (updateError) throw updateError;
      } else if (branchId) {
        // Verify current branch password
        const { data: branch } = await supabase
          .from('branches')
          .select('password')
          .eq('id', branchId)
          .single();

        if (!branch || branch.password !== currentPassword) {
          throw new Error('كلمة المرور الحالية غير صحيحة');
        }

        // Update branch password
        const { error: updateError } = await supabase
          .from('branches')
          .update({ password: newPassword })
          .eq('id', branchId);

        if (updateError) throw updateError;
      }

      toast({
        title: "تم التحديث",
        description: "تم تغيير كلمة المرور بنجاح",
      });

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء تحديث كلمة المرور",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="mb-8 text-right">
        <h1 className="text-4xl font-amiri mb-2">إدارة كلمة المرور</h1>
        <p className="text-muted-foreground">
          {isDeveloper 
            ? "تغيير كلمة مرور المدير العام"
            : branchName 
              ? `تغيير كلمة مرور فرع ${branchName}`
              : "تغيير كلمة مرور الفرع"
          }
        </p>
      </header>

      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-gold" />
              <div>
                <CardTitle>تغيير كلمة المرور</CardTitle>
                <CardDescription>
                  أدخل كلمة المرور الحالية وكلمة المرور الجديدة
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>كلمة المرور الحالية</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية"
              />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور الجديدة</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة"
              />
            </div>
            <div className="space-y-2">
              <Label>تأكيد كلمة المرور الجديدة</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور الجديدة"
              />
            </div>
            <Button
              className="w-full gold-gradient"
              onClick={handlePasswordChange}
              disabled={loading || !currentPassword || !newPassword || !confirmPassword || (isDeveloper && !settingsId)}
            >
              {loading ? "جاري التحديث..." : "تغيير كلمة المرور"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}