import { useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Car, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../app/store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card, CardContent, CardDescription, CardHeader } from '../../components/ui/Card';

const PHONE_NATIONAL_LENGTH = 9;

// Kiritilgan matndan +998 dan keyingi 9 xonali raqamni ajratib oladi.
// Boshida 998 (davlat kodi) bo'lsa, uni tashlab yuboradi — shunda
// "+998 90 123 45 67", "998901234567" va "901234567" bir xil o'qiladi.
const extractNational = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('998')) return digits.slice(3, 3 + PHONE_NATIONAL_LENGTH);
  // '+998' prefiksi qisman o'chirilgan holat ('+99', '+9') — raqam yo'q deb olamiz
  if (raw.startsWith('+') && '998'.startsWith(digits)) return '';
  return digits.slice(0, PHONE_NATIONAL_LENGTH);
};

// +998 XX XXX XX XX ko'rinishida formatlaydi
const formatUzPhone = (national: string): string => {
  const d = national.slice(0, PHONE_NATIONAL_LENGTH);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return parts.length ? `+998 ${parts.join(' ')}` : '+998';
};

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();
  const [phone_number, setPhoneNumber] = useState('+998');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);

  // Formatlashdan keyin kursorni joyida qoldiramiz
  useLayoutEffect(() => {
    if (caretRef.current !== null && phoneInputRef.current) {
      phoneInputRef.current.setSelectionRange(caretRef.current, caretRef.current);
      caretRef.current = null;
    }
  }, [phone_number]);

  const duplicateCodeError = () =>
    t('auth.phoneDuplicateCode', "Davlat kodi +998 allaqachon kiritilgan — 998 ni qayta yozmang");

  const validatePhone = (value: string): boolean => {
    const national = extractNational(value);
    if (national.startsWith('998')) {
      setPhoneError(duplicateCodeError());
      return false;
    }
    if (national.length !== PHONE_NATIONAL_LENGTH) {
      setPhoneError(t('auth.phoneInvalid', "Telefon raqam to'liq emas (masalan: +998 90 123 45 67)"));
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const raw = input.value;
    const rawDigits = raw.replace(/\D/g, '');
    const national = extractNational(raw);
    const formatted = formatUzPhone(national);

    // Kursordan oldingi raqamlar soni — formatlangan matnda ham shu raqamdan
    // keyin turishi kerak. Agar foydalanuvchi 998 prefiksisiz yozgan bo'lsa,
    // formatlangan matnga qo'shilgan prefiks raqamlarini ham hisobga olamiz.
    let targetDigits = raw
      .slice(0, input.selectionStart ?? raw.length)
      .replace(/\D/g, '').length;
    if (!rawDigits.startsWith('998')) targetDigits += 3;

    let pos = 0;
    let seen = 0;
    while (pos < formatted.length && seen < targetDigits) {
      if (formatted[pos] >= '0' && formatted[pos] <= '9') seen++;
      pos++;
    }

    if (formatted === phone_number) {
      // State o'zgarmadi (masalan, 9 xonadan ortiq yozildi) — React qayta
      // render qilmaydi, shuning uchun DOM qiymatini qo'lda tiklaymiz
      input.value = formatted;
      input.setSelectionRange(pos, pos);
    } else {
      caretRef.current = pos;
      setPhoneNumber(formatted);
    }

    if (national.startsWith('998')) {
      setPhoneError(duplicateCodeError());
    } else if (phoneError) {
      setPhoneError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone_number || !password) return;
    if (!validatePhone(phone_number)) return;

    try {
      await login(phone_number.replace(/\s/g, ''), password);
      navigate(`/${i18n.language || 'uz'}/dashboard`, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center relative overflow-hidden p-4 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Ambient background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <Card className="shadow-xl border-border/40 backdrop-blur-sm bg-card/90">
          <CardHeader className="space-y-4 text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Car className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">AvtoCRM</h1>
              <CardDescription className="text-base">{t('auth.login')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="phone_number" className="text-sm font-semibold">{t('stores.phone') || t('auth.phoneNumber')}</Label>
                <Input
                  ref={phoneInputRef}
                  id="phone_number"
                  name="phone_number"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+998 90 123 45 67"
                  value={phone_number}
                  onChange={handlePhoneChange}
                  onBlur={(e) => {
                    if (extractNational(e.target.value).length > 0) validatePhone(e.target.value);
                  }}
                  required
                  aria-invalid={Boolean(phoneError)}
                  aria-describedby={phoneError ? 'phone_number-error' : undefined}
                  className={`h-11 ${phoneError ? 'border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500' : ''}`}
                />
                {phoneError && (
                  <p id="phone_number-error" className="text-xs text-red-500">{phoneError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">{t('auth.password')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder={t('auth.password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10 h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-primary hover:underline font-medium">
                  {t('auth.forgotPassword')}
                </Link>
              </div>

              <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t('common.loading')}
                  </div>
                ) : (
                  t('auth.loginButton')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} AvtoCRM. Auto Spare Parts Management System
        </p>
      </div>
    </main>
  );
}