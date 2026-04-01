// User and Auth Types
export type UserRole = 'admin' | 'store_user';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  store_id?: string;
  store_name?: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

// Product Types
export interface Product {
  id: string;
  name: string;
  description: string;
  purchase_price: number;
  selling_price: number;
  category: string;
  supplier_id: string;
  supplier_name?: string;
  store_id: string;
  store_name?: string;
  sku: string;
  image?: string;
  barcode?: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  purchase_price: number;
  selling_price: number;
  category: string;
  supplier_id: string;
  store_id: string;
  image?: string;
  sku?: string;
  barcode?: string;
}

// Category Types
export interface Category {
  id: string;
  name: string;
  description?: string;
}

// Supplier Types
export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  debt: number;
  created_at: string;
}

export interface SupplierFormData {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

// Store Types
export interface Store {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  is_warehouse: boolean;
  created_at: string;
}

export interface StoreFormData {
  name: string;
  address?: string;
  phone?: string;
  is_warehouse: boolean;
}

// Inventory Types (Incoming Stock)
export interface InventoryItem {
  id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  quantity: number;
  purchase_price: number;
  total: number;
}

export interface Inventory {
  id: string;
  supplier_id: string;
  supplier_name?: string;
  store_id: string;
  store_name?: string;
  items: InventoryItem[];
  total: number;
  paid: number;
  debt: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
}

export interface InventoryFormData {
  supplier_id: string;
  store_id: string;
  items: Omit<InventoryItem, 'id' | 'product_name' | 'product_sku'>[];
  paid: number;
}

// Transfer Types
export interface TransferItem {
  id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  quantity: number;
}

export interface Transfer {
  id: string;
  from_store_id: string;
  from_store_name?: string;
  to_store_id: string;
  to_store_name?: string;
  items: TransferItem[];
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface TransferFormData {
  from_store_id: string;
  to_store_id: string;
  items: Omit<TransferItem, 'id' | 'product_name' | 'product_sku'>[];
}

// Sales Types
export interface SaleItem {
  id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  total: number;
}

export interface Sale {
  id: string;
  store_id: string;
  store_name?: string;
  items: SaleItem[];
  total_cost: number;
  total_price: number;
  total?: number;
  profit: number;
  payment_method?: 'cash' | 'card';
  created_at: string;
}

export interface SaleFormData {
  store_id: string;
  items: Omit<SaleItem, 'id' | 'product_name' | 'product_sku' | 'total'>[];
}

// Dashboard Stats Types
export interface DashboardStats {
  total_products: number;
  total_sales: number;
  total_debt: number;
  supplier_debt: number;
  store_stats: {
    store_id: string;
    store_name: string;
    product_count: number;
    sales_count: number;
  }[];
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Form Types
export interface SelectOption {
  value: string;
  label: string;
}

// Filter Types
export interface ProductFilters {
  search?: string;
  category?: string;
  store_id?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}
