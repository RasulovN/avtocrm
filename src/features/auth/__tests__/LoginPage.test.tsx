import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../LoginPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.login': 'Kirish',
        'auth.password': 'Parol',
        'auth.loginButton': 'Kirish',
        'auth.phoneNumber': 'Telefon raqami',
        'common.loading': 'Yuklanmoqda...',
        'stores.phone': 'Telefon',
      };
      return translations[key] || key;
    },
    i18n: { language: 'uz' },
  }),
}));

vi.mock('../../app/store', () => ({
  useAuthStore: vi.fn(() => ({
    login: vi.fn().mockResolvedValue({}),
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

  it('updates phone input value', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const phoneInput = screen.getByLabelText(/telefon/i);
    await user.clear(phoneInput);
    await user.type(phoneInput, '+998901234567');

    expect(phoneInput).toHaveValue('+998901234567');
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