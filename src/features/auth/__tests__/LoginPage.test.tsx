import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../LoginPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.login': 'Login',
        'auth.username': 'Username',
        'auth.password': 'Password',
        'auth.loginButton': 'Sign In',
        'common.loading': 'Loading...',
      };
      return translations[key] || key;
    },
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form', () => {
    render(<LoginPage />);

    expect(screen.getByText('AvtoCRM')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('renders username input with correct type', () => {
    render(<LoginPage />);
    const input = screen.getByLabelText('Username');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('renders password input with correct type', () => {
    render(<LoginPage />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('updates username value on input', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const input = screen.getByLabelText('Username');
    await user.type(input, 'admin');

    expect(input).toHaveValue('admin');
  });

  it('updates password value on input', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const input = screen.getByLabelText('Password');
    await user.type(input, 'secret123');

    expect(input).toHaveValue('secret123');
  });

  it('username input is required', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Username')).toBeRequired();
  });

  it('password input is required', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Password')).toBeRequired();
  });

  it('username input has correct placeholder', () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
  });

  it('password input has correct placeholder', () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<LoginPage />);
    const button = screen.getByRole('button', { name: 'Sign In' });
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('renders form with correct structure', () => {
    render(<LoginPage />);
    const form = document.querySelector('form');
    expect(form).toBeInTheDocument();
  });

  it('username input has correct id', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Username')).toHaveAttribute('id', 'username');
  });

  it('password input has correct id', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('id', 'password');
  });

  it('label is associated with username input', () => {
    render(<LoginPage />);
    const label = screen.getByText('Username');
    expect(label).toHaveAttribute('for', 'username');
  });

  it('label is associated with password input', () => {
    render(<LoginPage />);
    const label = screen.getByText('Password');
    expect(label).toHaveAttribute('for', 'password');
  });
});
