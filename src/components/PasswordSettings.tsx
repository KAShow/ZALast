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

export default function PasswordSettings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const { toast } = useToast();
  const isDeveloper = sessionStorage.getItem('developerAuth') === 'true';
  const branchId = sessionStorage.getItem('branchId');

  useEffect(() => {
    // Load developer settings ID if needed
    if (isDeveloper) {
      const loadDevSettings = async () => {
        const { data } = await supabase
          .from('developer_settings')
          .select('id')
          .single();
        
        if (data) {
          setSettingsId(data.id);
        }
      };

      loadDevSettings();
    }
  }, [isDeveloper]);

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمة المرور الجديدة غير متطابقة",
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
    <Card>
      <CardHeader>
        <CardTitle>تغيير كلمة المرور</CardTitle>
        <CardDescription>
          {isDeveloper 
            ? "تغيير كلمة مرور المطور" 
            : "تغيير كلمة مرور الفرع"}
        </CardDescription>
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
          className="w-full"
          onClick={handlePasswordChange}
          disabled={loading || !currentPassword || !newPassword || !confirmPassword || (isDeveloper && !settingsId)}
        >
          {loading ? "جاري التحديث..." : "تغيير كلمة المرور"}
        </Button>
      </CardContent>
    </Card>
  );
}