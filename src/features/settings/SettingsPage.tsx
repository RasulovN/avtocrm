import { useEffect, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Save, User, Phone, Lock, History, Clock, KeyRound, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { useAuthStore } from '../../app/store';
import { authService } from '../../services/authService';
import { formatDateShort, formatTime } from '../../utils';
import { maskUzPhoneInput, isCompleteUzPhone, PHONE_INPUT_MAX_LENGTH } from '../../utils/phone';
import type { UserLog } from '../../types';

// Forma cheklovlari: ism-familiya va parol uchun min/max
const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 100;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 64;

// Kirishlar tarixi — har sahifada nechta yozuv
const HISTORY_PAGE_SIZE = 5;

interface LoginHistory {
  id: string;
  date: string;
  time: string;
  ip: string;
  device: string;
  location: string;
}

interface ProfileFormData {
  full_name: string;
  phone_number: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSending, setForgotSending] = useState(false);
  
  const isAdmin = Boolean(user?.is_superuser || user?.role === 'superuser');

  const [profileData, setProfileData] = useState<ProfileFormData>({
    full_name: user?.full_name || 'Admin',
    // Ko'rinish har doim +998 XX XXX XX XX formatida
    phone_number: user?.phone_number ? maskUzPhoneInput(user.phone_number) : '+998',
  });

  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // ─── Kirishlar tarixi: serverdan sahifalab olinadi (avval user.history'dan faqat 5 tasi ko'rinardi) ───
  const [historyItems, setHistoryItems] = useState<UserLog[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyCount, setHistoryCount] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    authService
      .getLoginHistory({ page: historyPage, limit: HISTORY_PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setHistoryItems(Array.isArray(res.results) ? res.results : []);
        setHistoryTotalPages(res.total_pages || 1);
        setHistoryCount(res.count || 0);
      })
      .catch(() => {
        if (!cancelled) setHistoryItems([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [historyPage]);

  // 'li'/'lo' kodlari o'rniga tushunarli matn
  const actionLabel = (action?: string) => {
    if (action === 'li') return t('auth.loginAction', 'Kirish');
    if (action === 'lo') return t('auth.logoutAction', 'Chiqish');
    return action || '';
  };

  const loginHistory: LoginHistory[] = historyItems.map((log, index) => {
    const deviceLine = [log.user_agent, actionLabel(log.action)].filter(Boolean).join(' • ') || '-';
    return {
      id: String(log.id ?? index),
      date: formatDateShort(log.created_at),
      time: formatTime(log.created_at),
      ip: log.ip_address || '-',
      device: deviceLine,
      location: '-',
    };
  });

  const handleProfileChange = (field: keyof ProfileFormData, value: string) => {
    if (field === 'phone_number') {
      // Faqat raqam: harflar/belgilar tashlab yuboriladi, +998 va 9 xonaga cheklanadi
      value = maskUzPhoneInput(value);
    }
    if (field === 'full_name') {
      value = value.slice(0, NAME_MAX_LENGTH);
    }
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: keyof PasswordFormData, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value.slice(0, PASSWORD_MAX_LENGTH) }));
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      toast.error(t('auth.emailRequired'));
      return;
    }
    try {
      setForgotSending(true);
      await authService.forgotPassword({ email: forgotEmail });
      toast.success(t('messages.resetLinkSentSettings'));
      setForgotDialogOpen(false);
      setForgotEmail('');
    } catch (error) {
      const message = error instanceof Error ? error.message : t('errors.generic');
      toast.error(message);
    } finally {
      setForgotSending(false);
    }
  };

  const handleProfileSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (profileData.full_name.trim().length < NAME_MIN_LENGTH) {
      toast.error(
        t('auth.nameTooShort', `Ism-familiya kamida ${NAME_MIN_LENGTH} ta belgi bo'lishi kerak`),
      );
      return;
    }
    if (!isCompleteUzPhone(profileData.phone_number)) {
      toast.error(t('auth.phoneInvalid', "Telefon raqam to'liq emas (masalan: +998 90 123 45 67)"));
      return;
    }
    setProfileSaving(true);
    setTimeout(() => {
      setProfileSaving(false);
      toast.success(t('messages.profileUpdateNotConnected'));
    }, 500);
  };

  const handlePasswordSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (passwordData.newPassword.length < PASSWORD_MIN_LENGTH) {
      toast.error(
        t('auth.passwordTooShort', `Parol kamida ${PASSWORD_MIN_LENGTH} ta belgi bo'lishi kerak`),
      );
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('auth.passwordsMismatch', 'Yangi parol va tasdiq paroli mos kelmadi'));
      return;
    }
    try {
      setPasswordSaving(true);
      await authService.changePassword({
        old_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        confirm_password: passwordData.confirmPassword,
      });
      toast.success(t('messages.passwordUpdated'));
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('errors.generic');
      toast.error(message);
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.settings')}
        description={t('nav.settings')}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('auth.profile')}
            </CardTitle>
            <CardDescription>
              {isAdmin ? t('auth.profileDescription') : t('common.viewOnly', 'Faqat ko\'rish rejimi')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">{t('users.fullName')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleProfileChange('full_name', e.target.value)}
                    className="pl-10"
                    disabled={!isAdmin}
                    minLength={NAME_MIN_LENGTH}
                    maxLength={NAME_MAX_LENGTH}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_number">{t('stores.phone')}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone_number"
                    type="tel"
                    inputMode="tel"
                    value={profileData.phone_number}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleProfileChange('phone_number', e.target.value)}
                    className="pl-10"
                    disabled={!isAdmin}
                    maxLength={PHONE_INPUT_MAX_LENGTH}
                    placeholder="+998 90 123 45 67"
                  />
                </div>
              </div>
              {isAdmin && (
                <Button type="submit" disabled={profileSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {profileSaving ? t('common.loading') : t('common.save')}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Password Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {t('auth.changePassword')}
            </CardTitle>
            <CardDescription>
              {t('auth.changePasswordDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="currentPassword">{t('auth.currentPassword')}</Label>
                  <button
                    type="button"
                    onClick={() => setForgotDialogOpen(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    {t('auth.forgotPassword')}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handlePasswordChange('currentPassword', e.target.value)}
                    className="pr-10"
                    maxLength={PASSWORD_MAX_LENGTH}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    aria-label={showPasswords.current ? t('auth.hidePassword', 'Parolni yashirish') : t('auth.showPassword', "Parolni ko'rsatish")}
                    className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center justify-center rounded p-1.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('auth.newPassword')}</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handlePasswordChange('newPassword', e.target.value)}
                    className="pr-10"
                    minLength={PASSWORD_MIN_LENGTH}
                    maxLength={PASSWORD_MAX_LENGTH}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    aria-label={showPasswords.new ? t('auth.hidePassword', 'Parolni yashirish') : t('auth.showPassword', "Parolni ko'rsatish")}
                    className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center justify-center rounded p-1.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handlePasswordChange('confirmPassword', e.target.value)}
                    className="pr-10"
                    minLength={PASSWORD_MIN_LENGTH}
                    maxLength={PASSWORD_MAX_LENGTH}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    aria-label={showPasswords.confirm ? t('auth.hidePassword', 'Parolni yashirish') : t('auth.showPassword', "Parolni ko'rsatish")}
                    className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center justify-center rounded p-1.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={passwordSaving}>
                <Save className="h-4 w-4 mr-2" />
                {passwordSaving ? t('common.loading') : t('auth.updatePassword')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Login History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('auth.loginHistory')}
          </CardTitle>
          <CardDescription>
            {t('auth.loginHistoryDescription')}
            {' · '}
            {t('auth.loginHistoryRetention', 'Yozuvlar 60 kun saqlanadi')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {historyLoading && loginHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : loginHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
            ) : (
              loginHistory.map((login) => (
              <div key={login.id} className="flex flex-col gap-2 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{login.date} - {login.time}</p>
                    <p className="text-sm text-muted-foreground break-words">{login.device}</p>
                  </div>
                </div>
                <div className="shrink-0 sm:text-right">
                  <p className="text-sm font-mono text-muted-foreground">{login.ip}</p>
                  {/* <p className="text-sm text-muted-foreground">{login.location}</p> */}
                </div>
              </div>
            ))
            )}

            {/* Sahifalash — 5 tadan, oldingi/keyingi */}
            {historyTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {(historyPage - 1) * HISTORY_PAGE_SIZE + 1}
                  -{Math.min(historyPage * HISTORY_PAGE_SIZE, historyCount)} / {historyCount}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage === 1 || historyLoading}
                    aria-label={t('common.previous', 'Oldingi sahifa')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm tabular-nums">
                    {historyPage} / {historyTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                    disabled={historyPage === historyTotalPages || historyLoading}
                    aria-label={t('common.next', 'Keyingi sahifa')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotDialogOpen} onOpenChange={setForgotDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              {t('auth.forgotPassword')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('auth.forgotPasswordDescription')}
            </p>
            <div className="space-y-2">
              <Label htmlFor="forgotEmail">{t('common.email')}</Label>
              <Input
                id="forgotEmail"
                type="email"
                placeholder="email@example.com"
                value={forgotEmail}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setForgotEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleForgotPassword} disabled={forgotSending}>
              {forgotSending ? t('common.loading') : t('auth.sendResetLink')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
