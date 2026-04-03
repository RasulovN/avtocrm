import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';

describe('Input', () => {
  it('renders input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('handles value changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'hello');

    expect(handleChange).toHaveBeenCalledTimes(5);
  });

  it('accepts text input', async () => {
    const user = userEvent.setup();
    render(<Input />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'test value');

    expect(input).toHaveValue('test value');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('renders with different types', () => {
    const { rerender } = render(<Input type="text" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');

    rerender(<Input type="password" aria-label="password" />);
    expect(screen.getByLabelText('password')).toHaveAttribute('type', 'password');
  });

  it('renders with email type', () => {
    render(<Input type="email" aria-label="email" />);
    expect(screen.getByLabelText('email')).toHaveAttribute('type', 'email');
  });

  it('renders with number type', () => {
    render(<Input type="number" aria-label="number" />);
    expect(screen.getByLabelText('number')).toHaveAttribute('type', 'number');
  });

  it('applies custom className', () => {
    render(<Input className="custom-input" />);
    expect(screen.getByRole('textbox').className).toContain('custom-input');
  });

  it('forwards ref', () => {
    const ref = vi.fn();
    render(<Input ref={ref} />);
    expect(ref).toHaveBeenCalled();
  });

  it('supports required attribute', () => {
    render(<Input required />);
    expect(screen.getByRole('textbox')).toBeRequired();
  });

  it('supports readOnly attribute', () => {
    render(<Input readOnly />);
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
  });

  it('supports maxLength attribute', async () => {
    const user = userEvent.setup();
    render(<Input maxLength={5} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '1234567890');

    expect(input).toHaveValue('12345');
  });

  it('supports aria attributes', () => {
    render(<Input aria-label="Custom label" aria-describedby="help-text" />);
    const input = screen.getByLabelText('Custom label');
    expect(input).toHaveAttribute('aria-describedby', 'help-text');
  });

  it('supports name attribute', () => {
    render(<Input name="username" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('name', 'username');
  });

  it('supports id attribute', () => {
    render(<Input id="email-input" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'email-input');
  });
});
