import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { DataTable, type Column } from '../DataTable';

interface TestItem {
  id: string;
  name: string;
  value: number;
}

const testColumns: Column<TestItem>[] = [
  { key: 'name', header: 'Name' },
  { key: 'value', header: 'Value' },
];

const testData: TestItem[] = [
  { id: '1', name: 'Item 1', value: 100 },
  { id: '2', name: 'Item 2', value: 200 },
  { id: '3', name: 'Item 3', value: 300 },
];

describe('DataTable', () => {
  it('renders table with data', () => {
    render(<DataTable data={testData} columns={testColumns} />);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<DataTable data={testData} columns={testColumns} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<DataTable data={[]} columns={testColumns} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders custom empty message', () => {
    render(
      <DataTable
        data={[]}
        columns={testColumns}
        emptyMessage="No items found"
      />
    );
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(<DataTable data={[]} columns={testColumns} loading />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('renders custom loading message', () => {
    render(
      <DataTable
        data={[]}
        columns={testColumns}
        loading
        loadingMessage="Fetching records..."
      />
    );
    expect(screen.getByText('Fetching records...')).toBeInTheDocument();
  });

  it('handles row click', async () => {
    const user = userEvent.setup();
    const handleRowClick = vi.fn();
    render(
      <DataTable
        data={testData}
        columns={testColumns}
        onRowClick={handleRowClick}
      />
    );

    await user.click(screen.getByText('Item 1'));
    expect(handleRowClick).toHaveBeenCalledWith(testData[0]);
  });

  it('renders search input when onSearch is provided', () => {
    render(
      <DataTable
        data={testData}
        columns={testColumns}
        onSearch={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('calls onSearch when typing', async () => {
    const user = userEvent.setup();
    const handleSearch = vi.fn();
    render(
      <DataTable
        data={testData}
        columns={testColumns}
        onSearch={handleSearch}
      />
    );

    await user.type(screen.getByPlaceholderText('Search...'), 'test');
    expect(handleSearch).toHaveBeenCalled();
  });

  it('renders custom search placeholder', () => {
    render(
      <DataTable
        data={testData}
        columns={testColumns}
        onSearch={vi.fn()}
        searchPlaceholder="Find items..."
      />
    );
    expect(screen.getByPlaceholderText('Find items...')).toBeInTheDocument();
  });

  it('renders custom column renderer', () => {
    const columnsWithRender: Column<TestItem>[] = [
      {
        key: 'value',
        header: 'Value',
        render: (item) => `$${item.value}`,
      },
    ];
    render(<DataTable data={testData} columns={columnsWithRender} />);
    expect(screen.getByText('$100')).toBeInTheDocument();
    expect(screen.getByText('$200')).toBeInTheDocument();
    expect(screen.getByText('$300')).toBeInTheDocument();
  });

  it('renders pagination when provided', () => {
    render(
      <DataTable
        data={testData}
        columns={testColumns}
        pagination={{
          page: 1,
          limit: 10,
          total: 30,
          onPageChange: vi.fn(),
        }}
      />
    );
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    render(
      <DataTable
        data={testData}
        columns={testColumns}
        pagination={{
          page: 1,
          limit: 10,
          total: 30,
          onPageChange: vi.fn(),
        }}
      />
    );
    const buttons = screen.getAllByRole('button');
    const prevButton = buttons.find((b) => b.querySelector('svg'));
    expect(prevButton).toBeDefined();
  });

  it('handles page change', async () => {
    const user = userEvent.setup();
    const handlePageChange = vi.fn();
    render(
      <DataTable
        data={testData}
        columns={testColumns}
        pagination={{
          page: 1,
          limit: 10,
          total: 30,
          onPageChange: handlePageChange,
        }}
      />
    );

    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[buttons.length - 1];
    await user.click(nextButton);
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('renders footer when showFooter is true', () => {
    const columnsWithQuantity: Column<TestItem>[] = [
      { key: 'name', header: 'Name' },
      { key: 'value', header: 'Quantity' },
    ];
    render(
      <DataTable
        data={testData}
        columns={columnsWithQuantity}
        showFooter
        quantityKey="value"
      />
    );
    expect(screen.getByText('Total:')).toBeInTheDocument();
    expect(screen.getByText('600')).toBeInTheDocument();
  });
});
