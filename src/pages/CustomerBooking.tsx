import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { useQueue } from "@/hooks/use-queue";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { Home, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sendQueueNotification } from '@/lib/notifications';
import { sendOTP, verifyOTP } from '@/lib/otp';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

type CountryCode = {
  code: string;
  name: string;
  flag: string;
  phoneLength: number;
  phonePattern: RegExp;
  placeholder: string;
};

const GCC_COUNTRIES: CountryCode[] = [
  { 
    code: "966", 
    name: "السعودية", 
    flag: "🇸🇦",
    phoneLength: 9,
    phonePattern: /^5\d{8}$/,
    placeholder: "5XXXXXXXX"
  },
  { 
    code: "971", 
    name: "الإمارات", 
    flag: "🇦🇪",
    phoneLength: 8,
    phonePattern: /^\d{8}$/,
    placeholder: "XXXXXXXX"
  },
  { 
    code: "965", 
    name: "الكويت", 
    flag: "🇰🇼",
    phoneLength: 8,
    phonePattern: /^\d{8}$/,
    placeholder: "XXXXXXXX"
  },
  { 
    code: "973", 
    name: "البحرين", 
    flag: "🇧🇭",
    phoneLength: 8,
    phonePattern: /^\d{8}$/,
    placeholder: "XXXXXXXX"
  },
  { 
    code: "968", 
    name: "عُمان", 
    flag: "🇴🇲",
    phoneLength: 8,
    phonePattern: /^\d{8}$/,
    placeholder: "XXXXXXXX"
  },
  { 
    code: "974", 
    name: "قطر", 
    flag: "🇶🇦",
    phoneLength: 8,
    phonePattern: /^\d{8}$/,
    placeholder: "XXXXXXXX"
  },
];

const createQueueSchema = (countryCode: string) => {
  const country = GCC_COUNTRIES.find(c => c.code === countryCode);
  
  return z.object({
    name: z.string().min(2, "الاسم يجب أن يكون أكثر من حرفين"),
    countryCode: z.string(),
    phoneNumber: z.string().regex(
      country?.phonePattern || /^\d+$/,
      country?.code === "966"
        ? "رقم الجوال يجب أن يتكون من 9 أرقام ويبدأ بالرقم 5"
        : "رقم الجوال يجب أن يتكون من 8 أرقام"
    ),
    guests: z.string().min(1, "يجب اختيار عدد الضيوف"),
  });
};

type QueueForm = z.infer<ReturnType<typeof createQueueSchema>>;

type Branch = {
  id: string;
  name: string;
  address: string;
};

export default function CustomerBooking() {
  const { branchId } = useParams<{ branchId?: string }>();
  const navigate = useNavigate();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToQueue } = useQueue();
  const { toast } = useToast();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [formData, setFormData] = useState<QueueForm | null>(null);
  const [otpCode, setOTPCode] = useState('');
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [showActiveRequestAlert, setShowActiveRequestAlert] = useState(false);
  const [activeRequestStatus, setActiveRequestStatus] = useState<string>('');
  const [activeRequestBranch, setActiveRequestBranch] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(GCC_COUNTRIES[0]);

  const form = useForm<QueueForm>({
    resolver: zodResolver(createQueueSchema(selectedCountry.code)),
    defaultValues: {
      name: "",
      countryCode: "966",
      phoneNumber: "",
      guests: "",
    },
  });

  // Update form validation when country changes
  const handleCountryChange = (code: string) => {
    const country = GCC_COUNTRIES.find(c => c.code === code) || GCC_COUNTRIES[0];
    setSelectedCountry(country);
    form.setValue("countryCode", code);
    form.setValue("phoneNumber", ""); // Clear phone number when country changes
  };

  useEffect(() => {
    async function loadBranch() {
      if (!branchId) {
        try {
          const { data, error: branchError } = await supabase
            .from('branches')
            .select('*')
            .limit(1)
            .single();

          if (branchError || !data) {
            throw new Error("لم يتم العثور على أي فرع");
          }

          setBranch(data);
        } catch (err) {
          console.error('Error loading default branch:', err);
          setError("لم يتم العثور على أي فرع");
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error: branchError } = await supabase
          .from('branches')
          .select('*')
          .eq('id', branchId)
          .single();

        if (branchError || !data) {
          throw new Error("لم يتم العثور على الفرع");
        }

        setBranch(data);
      } catch (err) {
        console.error('Error loading branch:', err);
        setError("لم يتم العثور على الفرع");
      } finally {
        setLoading(false);
      }
    }

    loadBranch();
  }, [branchId]);

  const handleFormSubmit = async (data: QueueForm) => {
    setFormData(data);
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    if (!branch?.id || !formData) return;

    try {
      const phone = formData.countryCode + formData.phoneNumber;
      
      // First, get the customer ID if they exist
      const { data: customerData } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      if (customerData?.id) {
        // Check all branches for active requests
        const { data: activeEntries } = await supabase
          .from('queue_entries')
          .select('id, status, branch:branches(name)')
          .eq('customer_id', customerData.id)
          .in('status', ['waiting', 'called', 'seated'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (activeEntries && activeEntries.length > 0) {
          const activeEntry = activeEntries[0];
          let statusText = '';
          switch (activeEntry.status) {
            case 'waiting':
              statusText = 'في قائمة الانتظار';
              break;
            case 'called':
              statusText = 'تم استدعاؤك';
              break;
            case 'seated':
              statusText = 'جالس في الغرفة';
              break;
          }
          
          setActiveRequestStatus(statusText);
          setActiveRequestBranch(activeEntry.branch.name);
          setShowActiveRequestAlert(true);
          setShowConfirmation(false);
          return;
        }
      }

      // Send OTP
      const otpResult = await sendOTP(phone);
      if (!otpResult.success) {
        throw new Error(otpResult.error || 'Failed to send OTP');
      }

      setShowConfirmation(false);
      setShowOTPVerification(true);
    } catch (error) {
      console.error('Error in confirmation:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إرسال رمز التحقق. الرجاء المحاولة مرة أخرى.",
        variant: "destructive"
      });
      setShowConfirmation(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!branch?.id || !formData) return;

    setVerifyingOTP(true);
    try {
      const phone = formData.countryCode + formData.phoneNumber;
      const verificationResult = await verifyOTP(phone, otpCode);

      if (!verificationResult.success) {
        throw new Error(verificationResult.error || 'Invalid OTP');
      }

      // Add to queue after OTP verification
      await addToQueue({
        name: formData.name,
        phone: phone,
        guests: parseInt(formData.guests),
        branch_id: branch.id,
      });

      // Send confirmation message
      await sendQueueNotification(
        phone,
        'تم تسجيلكم في قائمة الانتظار. سيتم إرسال رسالة عندما تكون طاولتكم جاهزة.'
      );

      toast({
        title: "تم الانضمام للطابور",
        description: "تم إضافتك لقائمة الانتظار. سيتم تحويلك لصفحة الحالة",
      });

      setTimeout(() => {
        navigate(`/status/${branch.id}`);
      }, 1500);
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast({
        title: "خطأ",
        description: "رمز التحقق غير صحيح. الرجاء المحاولة مرة أخرى.",
        variant: "destructive"
      });
    } finally {
      setVerifyingOTP(false);
    }
  };

  const getCountryName = (code: string) => {
    return GCC_COUNTRIES.find(country => country.code === code)?.name || code;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-lg text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  if (error || !branch) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-amiri text-destructive">{error}</h1>
          <p className="text-muted-foreground">الرجاء التأكد من صحة الرابط والمحاولة مرة أخرى</p>
          <Button asChild variant="outline">
            <Link to="/">
              <Home className="ml-2 h-4 w-4" />
              العودة للصفحة الرئيسية
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 text-right">
          <h1 className="text-4xl font-amiri mb-2">انضم للطابور</h1>
          <h2 className="text-2xl font-amiri text-gold mb-2">{branch.name}</h2>
          <p className="text-muted-foreground">{branch.address}</p>
        </header>

        {showActiveRequestAlert && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>لا يمكن الانضمام للطابور</AlertTitle>
            <AlertDescription>
              عذراً، لديك موعد حالي {activeRequestStatus} في {activeRequestBranch}. لا يمكنك حجز موعد جديد إلا بعد إكمال موعدك الحالي أو إلغائه.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>انضم للطابور</CardTitle>
            <CardDescription>أدخل بياناتك للانضمام لقائمة الانتظار</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل اسمك" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>رقم الجوال</FormLabel>
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="countryCode"
                      render={({ field }) => (
                        <FormItem className="w-[180px]">
                          <Select
                            value={field.value}
                            onValueChange={handleCountryChange}
                          >
                            <FormControl>
                              <SelectTrigger aria-label="اختر رمز الدولة">
                                <SelectValue placeholder="رمز الدولة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {GCC_COUNTRIES.map((country) => (
                                <SelectItem
                                  key={country.code}
                                  value={country.code}
                                  className="flex items-center gap-2 hover:bg-muted"
                                >
                                  <span className="text-lg">{country.flag}</span>
                                  <span>{country.name}</span>
                                  <span className="text-muted-foreground">
                                    (+{country.code})
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              placeholder={selectedCountry.placeholder}
                              {...field}
                              className="flex-1"
                              maxLength={selectedCountry.phoneLength}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedCountry.code === "966"
                      ? "يجب أن يتكون رقم الجوال من 9 أرقام ويبدأ بالرقم 5"
                      : "يجب أن يتكون رقم الجوال من 8 أرقام"}
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="guests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>عدد الضيوف</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر عدد الضيوف" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} {num === 1 ? "شخص" : "أشخاص"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  انضم للطابور
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Information Review Dialog */}
        <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>مراجعة المعلومات</DialogTitle>
              <DialogDescription>
                يرجى مراجعة معلوماتك الشخصية المدخلة بعناية. هل جميع المعلومات التالية صحيحة ودقيقة؟
              </DialogDescription>
            </DialogHeader>
            {formData && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-right">
                  <div className="text-muted-foreground">الاسم:</div>
                  <div className="font-medium">{formData.name}</div>
                  
                  <div className="text-muted-foreground">الدولة:</div>
                  <div className="font-medium">{getCountryName(formData.countryCode)}</div>
                  
                  <div className="text-muted-foreground">رقم الجوال:</div>
                  <div className="font-medium" dir="ltr">+{formData.countryCode} {formData.phoneNumber}</div>
                  
                  <div className="text-muted-foreground">عدد الضيوف:</div>
                  <div className="font-medium">
                    {formData.guests} {parseInt(formData.guests) === 1 ? "شخص" : "أشخاص"}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button
                variant="secondary"
                onClick={() => setShowConfirmation(false)}
              >
                تعديل
              </Button>
              <Button
                onClick={handleConfirmSubmit}
                className="gold-gradient"
              >
                تأكيد وإرسال رمز التحقق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* OTP Verification Dialog */}
        <Dialog open={showOTPVerification} onOpenChange={setShowOTPVerification}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>التحقق من رقم الجوال</DialogTitle>
              <DialogDescription>
                تم إرسال رمز التحقق إلى رقم جوالك. يرجى إدخال الرمز المكون من 6 أرقام.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="أدخل رمز التحقق"
                value={otpCode}
                onChange={(e) => setOTPCode(e.target.value)}
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
              <DialogFooter className="flex gap-2 sm:gap-0">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowOTPVerification(false);
                    setOTPCode('');
                  }}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleVerifyOTP}
                  disabled={otpCode.length !== 6 || verifyingOTP}
                  className="gold-gradient"
                >
                  {verifyingOTP ? "جاري التحقق..." : "تحقق"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}