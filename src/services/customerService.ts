import type { Customer, CustomerOrder, CustomerOrderItem, PaginatedResponse, Sale, Store } from '../types';
import { salesService } from './salesService';
import { storeService } from './storeService';
import { apiClient } from './api';

export const customerApiService = {
  getAll: async (): Promise<Customer[]> => {
    const response = await apiClient.get<Customer[]>('/users/customers/list/');
    return response.data;
  },

  getById: async (id: string): Promise<Customer> => {
    const response = await apiClient.get<Customer>(`/users/customers/${id}/`);
    return response.data;
  },

  create: async (data: { full_name: string; phone_number: string }): Promise<Customer> => {
    const response = await apiClient.post<Customer>('/users/customers/create/', data);
    return response.data;
  },
};

const fallbackStores: Store[] = [
  { id: '1', name: 'Main Store', is_warehouse: false, created_at: new Date().toISOString() },
  { id: '2', name: 'Chilonzor Store', is_warehouse: false, created_at: new Date().toISOString() },
  { id: '3', name: 'Warehouse', is_warehouse: true, created_at: new Date().toISOString() },
];

const mockSales: Sale[] = [
  {
    id: 'sale-101',
    store_id: '1',
    store_name: 'Main Store',
    total_cost: 120000,
    total_price: 180000,
    profit: 60000,
    payment_method: 'cash',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    items: [
      { id: '1', product_id: '1', product_name: 'Oil Filter X500', quantity: 2, purchase_price: 15000, selling_price: 25000, total: 50000 },
      { id: '2', product_id: '2', product_name: 'Brake Pads Premium', quantity: 1, purchase_price: 45000, selling_price: 75000, total: 75000 },
    ],
  },
  {
    id: 'sale-102',
    store_id: '1',
    store_name: 'Main Store',
    total_cost: 85000,
    total_price: 130000,
    profit: 45000,
    payment_method: 'card',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    items: [
      { id: '3', product_id: '3', product_name: 'Air Filter AF200', quantity: 2, purchase_price: 20000, selling_price: 35000, total: 70000 },
      { id: '4', product_id: '5', product_name: 'Wiper Blades WB15', quantity: 1, purchase_price: 12000, selling_price: 22000, total: 22000 },
    ],
  },
  {
    id: 'sale-103',
    store_id: '2',
    store_name: 'Chilonzor Store',
    total_cost: 70000,
    total_price: 112000,
    profit: 42000,
    payment_method: 'cash',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(),
    items: [
      { id: '5', product_id: '4', product_name: 'Spark Plug SP11', quantity: 4, purchase_price: 8000, selling_price: 15000, total: 60000 },
      { id: '6', product_id: '1', product_name: 'Oil Filter X500', quantity: 1, purchase_price: 15000, selling_price: 25000, total: 25000 },
    ],
  },
  {
    id: 'sale-104',
    store_id: '2',
    store_name: 'Chilonzor Store',
    total_cost: 98000,
    total_price: 145000,
    profit: 47000,
    payment_method: 'cash',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 76).toISOString(),
    items: [
      { id: '7', product_id: '2', product_name: 'Brake Pads Premium', quantity: 1, purchase_price: 45000, selling_price: 75000, total: 75000 },
      { id: '8', product_id: '5', product_name: 'Wiper Blades WB15', quantity: 2, purchase_price: 12000, selling_price: 22000, total: 44000 },
    ],
  },
];

const seededCustomersByStore: Record<string, Array<{ id: string; full_name: string; phone_number: string }>> = {
  '1': [
    { id: 'C-1001', full_name: 'Azizbek Tursunov', phone_number: '+998901112233' },
    { id: 'C-1002', full_name: 'Dilshod Rahmatov', phone_number: '+998901223344' },
    { id: 'C-1003', full_name: 'Malika Ismoilova', phone_number: '+998901334455' },
  ],
  '2': [
    { id: 'C-2001', full_name: 'Bekzod Abdullayev', phone_number: '+998931112244' },
    { id: 'C-2002', full_name: 'Shahzoda Qodirova', phone_number: '+998931223355' },
    { id: 'C-2003', full_name: 'Javohir Sattorov', phone_number: '+998931334466' },
  ],
  default: [
    { id: 'C-9001', full_name: 'Mijoz 1', phone_number: '+998900000001' },
    { id: 'C-9002', full_name: 'Mijoz 2', phone_number: '+998900000002' },
  ],
};

const getStoreName = (stores: Store[], storeId: string, fallbackName?: string) =>
  stores.find((store) => store.id === storeId)?.name || fallbackName || `Store ${storeId}`;

const getSeededCustomer = (storeId: string, index: number) => {
  const pool = seededCustomersByStore[storeId] || seededCustomersByStore.default;
  return pool[index % pool.length];
};

const calculatePayment = (totalAmount: number, saleIndex: number, paymentMethod?: Sale['payment_method']) => {
  const ratios = paymentMethod === 'card' ? [1, 1, 0.9, 1] : [1, 0.85, 0.65, 1];
  const ratio = ratios[saleIndex % ratios.length] ?? 1;
  const paidAmount = Math.round(totalAmount * ratio);
  return {
    paid_amount: paidAmount,
    debt_amount: Math.max(totalAmount - paidAmount, 0),
    payment_method: ratio < 1 ? 'mixed' : (paymentMethod ?? 'cash'),
  } as Pick<CustomerOrder, 'paid_amount' | 'debt_amount' | 'payment_method'>;
};

const normalizeOrderItems = (sale: Sale): CustomerOrderItem[] => {
  if (sale.items.length > 0) {
    return sale.items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name || item.product_sku || 'Mahsulot',
      quantity: item.quantity,
      unit_price: item.selling_price,
      total: item.total || item.selling_price * item.quantity,
    }));
  }

  return [
    {
      product_id: `synthetic-${sale.id}`,
      product_name: 'Buyurtma mahsuloti',
      quantity: 1,
      unit_price: sale.total_price,
      total: sale.total_price,
    },
  ];
};

const buildCustomers = (sales: Sale[], stores: Store[]): Customer[] => {
  const counters = new Map<string, number>();
  const customerMap = new Map<string, Customer>();

  sales.forEach((sale) => {
    const currentIndex = counters.get(sale.store_id) ?? 0;
    counters.set(sale.store_id, currentIndex + 1);

    const seededCustomer = getSeededCustomer(sale.store_id, currentIndex);
    const storeName = getStoreName(stores, sale.store_id, sale.store_name);
    const orderItems = normalizeOrderItems(sale);
    const totalAmount = orderItems.reduce((sum, item) => sum + item.total, 0) || sale.total_price;
    const payment = calculatePayment(totalAmount, currentIndex, sale.payment_method);
    const customerKey = `${sale.store_id}-${seededCustomer.id}`;

    const order: CustomerOrder = {
      id: `${seededCustomer.id}-${sale.id}`,
      order_id: `ORD-${sale.id.toUpperCase()}`,
      sale_id: sale.id,
      store_id: sale.store_id,
      store_name: storeName,
      created_at: sale.created_at,
      total_amount: totalAmount,
      paid_amount: payment.paid_amount,
      debt_amount: payment.debt_amount,
      payment_method: payment.payment_method,
      items: orderItems,
    };

    const existingCustomer = customerMap.get(customerKey);
    if (!existingCustomer) {
      customerMap.set(customerKey, {
        id: seededCustomer.id,
        full_name: seededCustomer.full_name,
        phone_number: seededCustomer.phone_number,
        store_id: sale.store_id,
        store_name: storeName,
        latest_order_id: order.order_id,
        order_count: 1,
        total_spent: order.total_amount,
        total_paid: order.paid_amount,
        total_debt: order.debt_amount,
        last_order_at: order.created_at,
        orders: [order],
      });
      return;
    }

    existingCustomer.orders.push(order);
    existingCustomer.order_count += 1;
    existingCustomer.total_spent += order.total_amount;
    existingCustomer.total_paid += order.paid_amount;
    existingCustomer.total_debt += order.debt_amount;
    if (new Date(order.created_at).getTime() > new Date(existingCustomer.last_order_at || 0).getTime()) {
      existingCustomer.last_order_at = order.created_at;
      existingCustomer.latest_order_id = order.order_id;
    }
  });

  return Array.from(customerMap.values())
    .map((customer) => ({
      ...customer,
      orders: [...customer.orders].sort(
        (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      ),
    }))
    .sort((left, right) => new Date(right.last_order_at || 0).getTime() - new Date(left.last_order_at || 0).getTime());
};

export const customerService = {
  getAll: async (params?: {
    store_id?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Customer>> => {
    let stores = fallbackStores;
    try {
      const storeResponse = await storeService.getAll({ limit: 100 });
      if (Array.isArray(storeResponse.data) && storeResponse.data.length > 0) {
        stores = storeResponse.data;
      }
    } catch {
      stores = fallbackStores;
    }

    let sales = mockSales;
    try {
      const salesResponse = await salesService.getAll({ limit: 200 });
      if (Array.isArray(salesResponse.data) && salesResponse.data.length > 0) {
        sales = salesResponse.data;
      }
    } catch {
      sales = mockSales;
    }

    let customers = buildCustomers(sales, stores);

    if (params?.store_id) {
      customers = customers.filter((customer) => customer.store_id === params.store_id);
    }

    if (params?.search) {
      const query = params.search.trim().toLowerCase();
      customers = customers.filter((customer) =>
        customer.id.toLowerCase().includes(query) ||
        customer.full_name.toLowerCase().includes(query) ||
        customer.phone_number.toLowerCase().includes(query) ||
        customer.orders.some((order) => order.order_id.toLowerCase().includes(query))
      );
    }

    const page = params?.page ?? 1;
    const limit = params?.limit ?? (customers.length > 0 ? customers.length : 10);
    const startIndex = (page - 1) * limit;

    return {
      data: customers.slice(startIndex, startIndex + limit),
      total: customers.length,
      page,
      limit,
    };
  },
};
