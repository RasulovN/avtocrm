import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../Card';

describe('Card', () => {
  it('renders card with children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Card className="custom-card">Content</Card>);
    expect(screen.getByText('Content').className).toContain('custom-card');
  });

  it('has rounded-lg and border classes', () => {
    render(<Card>Test</Card>);
    const card = screen.getByText('Test');
    expect(card.className).toContain('rounded-lg');
    expect(card.className).toContain('border');
  });

  it('forwards ref', () => {
    const ref = { current: null };
    render(<Card ref={ref}>Ref test</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('CardHeader', () => {
  it('renders header with children', () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<CardHeader className="custom-header">Header</CardHeader>);
    expect(screen.getByText('Header').className).toContain('custom-header');
  });
});

describe('CardTitle', () => {
  it('renders title text', () => {
    render(<CardTitle>Title</CardTitle>);
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('renders as h3 element', () => {
    render(<CardTitle>Heading</CardTitle>);
    const title = screen.getByText('Heading');
    expect(title.tagName).toBe('H3');
  });

  it('has text-2xl font-semibold classes', () => {
    render(<CardTitle>Styled</CardTitle>);
    const title = screen.getByText('Styled');
    expect(title.className).toContain('text-2xl');
    expect(title.className).toContain('font-semibold');
  });
});

describe('CardDescription', () => {
  it('renders description text', () => {
    render(<CardDescription>Description</CardDescription>);
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('renders as p element', () => {
    render(<CardDescription>Paragraph</CardDescription>);
    const desc = screen.getByText('Paragraph');
    expect(desc.tagName).toBe('P');
  });

  it('has text-sm text-muted-foreground classes', () => {
    render(<CardDescription>Muted</CardDescription>);
    const desc = screen.getByText('Muted');
    expect(desc.className).toContain('text-sm');
    expect(desc.className).toContain('text-muted-foreground');
  });
});

describe('CardContent', () => {
  it('renders content with children', () => {
    render(<CardContent>Content</CardContent>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('applies p-6 pt-0 classes', () => {
    render(<CardContent>Padding</CardContent>);
    const content = screen.getByText('Padding');
    expect(content.className).toContain('p-6');
    expect(content.className).toContain('pt-0');
  });
});

describe('CardFooter', () => {
  it('renders footer with children', () => {
    render(<CardFooter>Footer</CardFooter>);
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('applies flex classes', () => {
    render(<CardFooter>Flex</CardFooter>);
    const footer = screen.getByText('Flex');
    expect(footer.className).toContain('flex');
    expect(footer.className).toContain('items-center');
  });
});

describe('Card composition', () => {
  it('renders full card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Full Card</CardTitle>
          <CardDescription>This is a description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Main content here</p>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText('Full Card')).toBeInTheDocument();
    expect(screen.getByText('This is a description')).toBeInTheDocument();
    expect(screen.getByText('Main content here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });
});
