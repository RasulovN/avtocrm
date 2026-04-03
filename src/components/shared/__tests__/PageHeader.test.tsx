import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { PageHeader } from '../PageHeader';

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Test Page" />);
    expect(screen.getByRole('heading', { name: 'Test Page' })).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<PageHeader title="Page" description="Page description" />);
    expect(screen.getByText('Page description')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(<PageHeader title="No Desc" />);
    expect(screen.queryByText(/description/)).not.toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    render(
      <PageHeader
        title="With Actions"
        actions={<button>Add Item</button>}
      />
    );
    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
  });

  it('renders breadcrumbs when provided', () => {
    render(
      <PageHeader
        title="Breadcrumb Page"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Products' },
        ]}
      />
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
  });

  it('renders breadcrumb links with href', () => {
    render(
      <PageHeader
        title="Links"
        breadcrumbs={[
          { label: 'Home', href: '/home' },
          { label: 'Current' },
        ]}
      />
    );
    const link = screen.getByText('Home');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/home');
  });

  it('renders last breadcrumb as plain text', () => {
    render(
      <PageHeader
        title="Last"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Current Page' },
        ]}
      />
    );
    const current = screen.getByText('Current Page');
    expect(current.closest('a')).toBeNull();
  });

  it('does not render breadcrumbs when empty', () => {
    render(<PageHeader title="No Breadcrumbs" breadcrumbs={[]} />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('renders h1 heading for title', () => {
    render(<PageHeader title="Heading Test" />);
    const heading = screen.getByRole('heading', { name: 'Heading Test' });
    expect(heading.tagName).toBe('H1');
  });

  it('title has tracking-tight class', () => {
    render(<PageHeader title="Styled" />);
    const heading = screen.getByRole('heading', { name: 'Styled' });
    expect(heading.className).toContain('tracking-tight');
  });

  it('renders with all props', () => {
    render(
      <PageHeader
        title="Full Page"
        description="Full description"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Section', href: '/section' },
          { label: 'Page' },
        ]}
        actions={<button>Action</button>}
      />
    );

    expect(screen.getByRole('heading', { name: 'Full Page' })).toBeInTheDocument();
    expect(screen.getByText('Full description')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Section')).toBeInTheDocument();
    expect(screen.getByText('Page')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });
});
