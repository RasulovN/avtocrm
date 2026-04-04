import { useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Save, User, Phone, Lock, History, Clock } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { useAuthStore } from '../../app/store';
import { authService } from '../../services/authService';
import { formatDateShort, formatTime } from '../../utils';

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
  
  const [profileData, setProfileData] = useState<ProfileFormData>({
    full_name: user?.full_name || 'Admin',
    phone_number: user?.phone_number || '',
  });

  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const loginHistory: LoginHistory[] = (user?.history ?? []).map((log, index) => {
    const deviceLine = [log.user_agent, log.action].filter(Boolean).join(' • ') || '-';
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
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: keyof PasswordFormData, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfileSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileSaving(true);
    setTimeout(() => {
      setProfileSaving(false);
      toast.success('Profilni yangilash hali backendga ulanmagan');
    }, 500);
  };

  const handlePasswordSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('errors.validationError'));
      return;
    }
    try {
      setPasswordSaving(true);
      await authService.changePassword({
        old_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        confirm_password: passwordData.confirmPassword,
      });
      toast.success('Parol muvaffaqiyatli yangilandi');
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('auth.profile')}
            </CardTitle>
            <CardDescription>
              {t('auth.profileDescription')}
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
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_number">{t('stores.phone')}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone_number"
                    value={profileData.phone_number}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleProfileChange('phone_number', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button type="submit" disabled={profileSaving}>
                <Save className="h-4 w-4 mr-2" />
                {profileSaving ? t('common.loading') : t('common.save')}
              </Button>
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
                <Label htmlFor="currentPassword">{t('auth.currentPassword')}</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handlePasswordChange('currentPassword', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('auth.newPassword')}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handlePasswordChange('newPassword', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handlePasswordChange('confirmPassword', e.target.value)}
                />
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
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loginHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
            ) : (
              loginHistory.slice(0, 5).map((login) => (
              <div key={login.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{login.date} - {login.time}</p>
                    <p className="text-sm text-muted-foreground">{login.device}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-muted-foreground">{login.ip}</p>
                  {/* <p className="text-sm text-muted-foreground">{login.location}</p> */}
                </div>
              </div>
            ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
