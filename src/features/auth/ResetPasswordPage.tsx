import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { authService } from '../../services/authService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card, CardContent, CardDescription, CardHeader } from '../../components/ui/Card';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { uidb64 = '', token = '' } = useParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!uidb64 || !token) {
      toast.error("Reset havolasi noto'g'ri");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Parollar mos emas');
      return;
    }

    try {
      setSubmitting(true);
      await authService.resetPassword(uidb64, token, {
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      toast.success('Parol muvaffaqiyatli yangilandi');
      navigate('/login', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Parol yangilanmadi';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="mx-4 w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary">
            <KeyRound className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Yangi parol</h1>
            <CardDescription>Hisobingiz uchun yangi parol o'rnating</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">Yangi parol</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Parolni tasdiqlang</Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Saqlanmoqda...' : 'Parolni yangilash'}
            </Button>
            <Link to="/login" className="block text-center text-sm text-primary hover:underline">
              Kirishga qaytish
            </Link>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
