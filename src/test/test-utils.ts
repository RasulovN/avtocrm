import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Wrapper with BrowserRouter for components that use routing
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(BrowserRouter, null, children);
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Mock user data
export const mockUser = {
  id: '1',
  user_id: 'USR001',
  full_name: 'Test User',
  role: 'admin' as const,
  phone: '+998901234567',
  store_id: undefined,
  store_name: undefined,
  created_at: new Date().toISOString(),
  logs: [],
};

// Mock store data
export const mockStore = {
  id: '1',
  name: 'Test Store',
  address: 'Tashkent',
  phone: '+998901234567',
  is_warehouse: false,
  created_at: new Date().toISOString(),
};

// Mock product data
export const mockProduct = {
  id: '1',
  name: 'Test Product',
  sku: 'SKU-001',
  barcode: '123456789',
  purchase_price: 10000,
  selling_price: 15000,
  category_id: '1',
  category_name: 'Test Category',
  supplier_id: '1',
  supplier_name: 'Test Supplier',
  store_id: '1',
  store_name: 'Test Store',
  quantity: 100,
  created_at: new Date().toISOString(),
};

// Mock API responses
export const mockPaginatedResponse = <T>(data: T[], total = 10) => ({
  data,
  total,
  page: 1,
  limit: 10,
  totalPages: Math.ceil(total / 10),
});

// Create mock function with return value
export const createMockFn = <T>(returnValue?: T) => {
  return vi.fn().mockResolvedValue(returnValue);
};

// re-export everything
export * from '@testing-library/react';
export { customRender as render };
