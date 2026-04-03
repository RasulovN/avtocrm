// User and Auth Types
export type UserRole = 'admin' | 'store_user' | 'store_admin' | 'su';

export interface UserLog {
  id: number;
  action: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface User {
  id: number;
  role: string;
  full_name: string;
  phone_number: string;
  email?: string;
  history?: UserLog[];
}

export interface UserFormData {
  full_name: string;
  password?: string;
  role: UserRole;
  phone_number: string;
  store_id?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

// Product Types
export interface ProductStoreInventory {
  store_id: string;
  store_name: string;
  quantity: number;
  purchase_price?: number;
  selling_price?: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  supplier_id: string;
  supplier_name?: string;
  sku: string;
  image?: string;
  barcode?: string;
  created_at: string;
  updated_at: string;
  // Aggregated data (new format for list page)
  total_quantity?: number;
  min_purchase_price?: number;
  max_purchase_price?: number;
  min_selling_price?: number;
  max_selling_price?: number;
  inventory_by_store?: ProductStoreInventory[];
  // Legacy fields (for backward compatibility)
  store_id?: string;
  store_name?: string;
  purchase_price?: number;
  selling_price?: number;
  quantity?: number;
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
  inn?: string;
  phone?: string;
  email?: string;
  address?: string;
  debt: number;
  created_at: string;
}

export interface SupplierFormData {
  name: string;
  inn?: string;
  phone?: string;
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
  product_barcode?: string;
  quantity: number;
  purchase_price: number;
  selling_price?: number;
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
  product_barcode?: string;
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
