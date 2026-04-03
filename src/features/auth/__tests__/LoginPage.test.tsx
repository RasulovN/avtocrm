import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../LoginPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.login': 'Login',
        'auth.password': 'Password',
        'auth.loginButton': 'Sign In',
        'common.loading': 'Loading...',
        'stores.phone': 'Phone',
      };
      return translations[key] || key;
    },
    i18n: { language: 'uz' },
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders phone and password inputs', () => {
    render(<LoginPage />);

    expect(screen.getByText('AvtoCRM')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone')).toHaveAttribute('type', 'tel');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('updates field values on input', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const phoneInput = screen.getByLabelText('Phone');
    const passwordInput = screen.getByLabelText('Password');

    await user.type(phoneInput, '+998901234567');
    await user.type(passwordInput, 'secret123');

    expect(phoneInput).toHaveValue('+998901234567');
    expect(passwordInput).toHaveValue('secret123');
  });
});
