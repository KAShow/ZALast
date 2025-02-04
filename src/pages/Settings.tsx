import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/use-settings";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";

type Branch = {
  id: string;
  name: string;
  rooms_count: number;
  expected_wait_time: number;
};

export default function Settings() {
  const { settings, updateSettings, loading: settingsLoading } = useSettings();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const { toast } = useToast();
  const isDeveloper = sessionStorage.getItem('developerAuth') === 'true';

  useEffect(() => {
    async function loadBranches() {
      const { data } = await supabase
        .from('branches')
        .select('id, name, rooms_count, expected_wait_time')
        .order('name');
      
      if (data) {
        setBranches(data);
      }
    }

    loadBranches();
    setLoading(false);
  }, []);

  const updateBranchSettings = async (branchId: string, updates: {
    rooms_count?: number;
    expected_wait_time?: number;
  }) => {
    try {
      const { error } = await supabase
        .from('branches')
        .update(updates)
        .eq('id', branchId);

      if (error) throw error;

      setBranches(branches.map(branch => 
        branch.id === branchId 
          ? { ...branch, ...updates }
          : branch
      ));

      toast({
        title: "تم التحديث",
        description: "تم تحديث إعدادات الفرع بنجاح",
      });
    } catch (error) {
      console.error('Error updating branch settings:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث الإعدادات",
        variant: "destructive"
      });
    }
  };

  const handleSaveAll = async () => {
    try {
      await updateSettings(settings);
      setUnsavedChanges(false);
      toast({
        title: "تم الحفظ",
        description: "تم حفظ جميع الإعدادات بنجاح",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الإعدادات",
        variant: "destructive"
      });
    }
  };

  const handleSettingChange = (newSettings: any) => {
    setUnsavedChanges(true);
    updateSettings(newSettings);
  };

  if (loading || settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8 text-right">
        <div className="flex justify-between items-center">
          <Button 
            onClick={handleSaveAll}
            disabled={!unsavedChanges}
            className="gold-gradient"
          >
            حفظ التغييرات
          </Button>
          <div>
            <h1 className="text-4xl font-amiri mb-2">الإعدادات</h1>
            <p className="text-muted-foreground">تخصيص إعدادات النظام</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6">
        {isDeveloper && (
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الفروع</CardTitle>
              <CardDescription>
                إدارة الغرف العائلية ووقت الانتظار لكل فرع
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>اختر الفرع</Label>
                <Select
                  value={selectedBranch}
                  onValueChange={setSelectedBranch}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفرع" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBranch && (
                <>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>عدد الغرف العائلية</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={branches.find(b => b.id === selectedBranch)?.rooms_count || 0}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (value > 0) {
                              updateBranchSettings(selectedBranch, { rooms_count: value });
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          onClick={() => {
                            const branch = branches.find(b => b.id === selectedBranch);
                            if (branch) {
                              updateBranchSettings(selectedBranch, { rooms_count: branch.rooms_count + 1 });
                            }
                          }}
                        >
                          +
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const branch = branches.find(b => b.id === selectedBranch);
                            if (branch && branch.rooms_count > 1) {
                              updateBranchSettings(selectedBranch, { rooms_count: branch.rooms_count - 1 });
                            }
                          }}
                        >
                          -
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>وقت الانتظار المتوقع بين الحجوزات (بالدقائق)</Label>
                      <div className="pt-2">
                        <Slider
                          value={[branches.find(b => b.id === selectedBranch)?.expected_wait_time || 15]}
                          min={5}
                          max={60}
                          step={5}
                          onValueChange={(value) => {
                            updateBranchSettings(selectedBranch, { expected_wait_time: value[0] });
                          }}
                        />
                        <div className="flex justify-between text-sm text-muted-foreground mt-2">
                          <span>5 دقائق</span>
                          <span>{branches.find(b => b.id === selectedBranch)?.expected_wait_time} دقيقة</span>
                          <span>60 دقيقة</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>إعدادات المطعم</CardTitle>
            <CardDescription>
              تعديل المعلومات الأساسية للمطعم
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>اسم المطعم</Label>
              <Input
                value={settings.restaurant.name}
                onChange={(e) =>
                  handleSettingChange({
                    restaurant: { ...settings.restaurant, name: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>ساعات العمل</Label>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={settings.restaurant.openTime}
                  onValueChange={(value) =>
                    handleSettingChange({
                      restaurant: { ...settings.restaurant, openTime: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="وقت الفتح" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem
                        key={i}
                        value={`${i.toString().padStart(2, "0")}:00`}
                      >
                        {`${i.toString().padStart(2, "0")}:00`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={settings.restaurant.closeTime}
                  onValueChange={(value) =>
                    handleSettingChange({
                      restaurant: { ...settings.restaurant, closeTime: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="وقت الإغلاق" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem
                        key={i}
                        value={`${i.toString().padStart(2, "0")}:00`}
                      >
                        {`${i.toString().padStart(2, "0")}:00`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>إعدادات الحجز</CardTitle>
            <CardDescription>
              تخصيص إعدادات نظام الحجز والانتظار
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>تفعيل نظام الحجز المسبق</Label>
              <Switch
                checked={settings.booking.enabled}
                onCheckedChange={(checked) =>
                  handleSettingChange({
                    booking: { ...settings.booking, enabled: checked },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>الحد الأقصى لوقت الانتظار (بالدقائق)</Label>
              <Input
                type="number"
                value={settings.booking.maxWaitTime}
                onChange={(e) =>
                  handleSettingChange({
                    booking: {
                      ...settings.booking,
                      maxWaitTime: parseInt(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>عدد الحجوزات المسموح بها في الساعة</Label>
              <Input
                type="number"
                value={settings.booking.maxBookingsPerHour}
                onChange={(e) =>
                  handleSettingChange({
                    booking: {
                      ...settings.booking,
                      maxBookingsPerHour: parseInt(e.target.value),
                    },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>إعدادات الإشعارات</CardTitle>
            <CardDescription>
              تخصيص إعدادات الإشعارات والتنبيهات
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>تفعيل الإشعارات عبر الرسائل النصية</Label>
              <Switch
                checked={settings.notifications.sms}
                onCheckedChange={(checked) =>
                  handleSettingChange({
                    notifications: { ...settings.notifications, sms: checked },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>تفعيل الإشعارات الصوتية</Label>
              <Switch
                checked={settings.notifications.sound}
                onCheckedChange={(checked) =>
                  handleSettingChange({
                    notifications: { ...settings.notifications, sound: checked },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>وقت التنبيه قبل الموعد (بالدقائق)</Label>
              <Input
                type="number"
                value={settings.notifications.reminderTime}
                onChange={(e) =>
                  handleSettingChange({
                    notifications: {
                      ...settings.notifications,
                      reminderTime: parseInt(e.target.value),
                    },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}