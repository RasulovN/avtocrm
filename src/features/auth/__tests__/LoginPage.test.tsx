import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../LoginPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const translations: Record<string, string> = {
        'auth.login': 'Kirish',
        'auth.password': 'Parol',
        'auth.loginButton': 'Kirish',
        'auth.phoneNumber': 'Telefon raqami',
        'auth.forgotPassword': 'Parolni unutdingizmi?',
        'common.loading': 'Yuklanmoqda...',
        'stores.phone': 'Telefon',
      };
      return translations[key] || fallback || key;
    },
    i18n: { language: 'uz' },
  }),
}));

const { mockLogin } = vi.hoisted(() => ({
  mockLogin: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../app/store', () => ({
  useAuthStore: vi.fn(() => ({
    login: mockLogin,
    isLoading: false,
    error: null,
  })),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form correctly', () => {
    render(<LoginPage />);

    expect(screen.getByText('AvtoCRM')).toBeInTheDocument();
    expect(screen.getByLabelText(/telefon/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/parol/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /kirish/i })).toBeInTheDocument();
  });

  it('has phone input with initial value +998', () => {
    render(<LoginPage />);

    const phoneInput = screen.getByLabelText(/telefon/i);
    expect(phoneInput).toHaveValue('+998');
  });

  it('has password input with toggle visibility button', () => {
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText(/parol/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = document.querySelector('button');
    expect(toggleButton).toBeInTheDocument();
  });

  it('has forgot password link', () => {
    render(<LoginPage />);

    expect(screen.getByText(/parolni unutdingizmi/i)).toBeInTheDocument();
  });

  it('formats phone number with spaces as user types', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const phoneInput = screen.getByLabelText(/telefon/i);
    await user.type(phoneInput, '901234567');

    expect(phoneInput).toHaveValue('+998 90 123 45 67');
  });

  it('normalizes a pasted number that includes the country code', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const phoneInput = screen.getByLabelText(/telefon/i);
    await user.tripleClick(phoneInput);
    await user.paste('998901234567');

    expect(phoneInput).toHaveValue('+998 90 123 45 67');
  });

  it('ignores extra digits beyond a complete number', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const phoneInput = screen.getByLabelText(/telefon/i);
    await user.type(phoneInput, '90123456789');

    expect(phoneInput).toHaveValue('+998 90 123 45 67');
  });

  it('shows an error immediately when 998 is typed again after +998', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const phoneInput = screen.getByLabelText(/telefon/i);
    await user.type(phoneInput, '998');

    expect(phoneInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/998 ni qayta yozmang/i)).toBeInTheDocument();
  });

  it('clears the duplicate code error once the extra 998 is removed', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const phoneInput = screen.getByLabelText(/telefon/i);
    await user.type(phoneInput, '998');
    expect(screen.getByText(/998 ni qayta yozmang/i)).toBeInTheDocument();

    await user.type(phoneInput, '{backspace}');
    expect(screen.queryByText(/998 ni qayta yozmang/i)).not.toBeInTheDocument();
  });

  it('shows an incomplete number error on blur', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const phoneInput = screen.getByLabelText(/telefon/i);
    await user.type(phoneInput, '90123');
    await user.tab();

    expect(phoneInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/to'liq emas/i)).toBeInTheDocument();
  });

  it('submits the phone number without spaces', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/telefon/i), '901234567');
    await user.type(screen.getByLabelText(/parol/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /kirish/i }));

    expect(mockLogin).toHaveBeenCalledWith('+998901234567', 'secret123');
  });

  it('does not submit when the phone number is incomplete', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/telefon/i), '90123');
    await user.type(screen.getByLabelText(/parol/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /kirish/i }));

    expect(mockLogin).not.toHaveBeenCalled();
    expect(screen.getByText(/to'liq emas/i)).toBeInTheDocument();
  });

  it('updates password input value', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText(/parol/i);
    await user.type(passwordInput, 'secret123');

    expect(passwordInput).toHaveValue('secret123');
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText(/parol/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = document.querySelector('button');
    if (toggleButton) {
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');
    }
  });
});
