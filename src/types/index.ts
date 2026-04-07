// User and Auth Types
export type UserRole = 'admin' | 'store_user' | 'store_admin' | 's' | 'su';

export interface UserLog {
  id: string;
  action: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface User {
  id: string;
  user_id?: string;
  role: string;
  is_superuser?: boolean;
  full_name: string;
  phone_number: string;
  email?: string;
  store_id?: string;
  store_name?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  history?: UserLog[];
}

export interface UserFormData {
  full_name: string;
  email: string;
  password?: string;
  confirm_password?: string;
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
  product_id?: string;
  name: string;
  description: string;
  category_id?: string;
  category: string;
  supplier_id: string;
  supplier_name?: string;
  sku: string;
  image?: string;
  images?: string[] | string;
  barcode?: string;
  barcode_img?: string;
  total_count?: number;
  is_active?: boolean;
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
  product_id?: string;
  name: string;
  name_uz_cyrl?: string;
  description?: string;
  description_uz_cyrl?: string;
  category_id?: string;
  images?: string[] | string | File[];
  sku?: string;
  barcode?: string;
  barcode_img?: string;
  total_count?: number;
  is_active?: boolean;
  // Legacy fields (optional for backward compatibility)
  purchase_price?: number;
  selling_price?: number;
  category?: string;
  supplier_id?: string;
  store_id?: string;
  image?: string | File | null;
}

// Category Types
export interface Category {
  id: string;
  slug?: string;
  name: string;
  name_uz?: string;
  name_uz_cyrl?: string;
  description?: string;
  description_uz?: string;
  description_uz_cyrl?: string;
  image?: string;
  created_at?: string;
}

export interface CategoryFormData {
  name_uz: string;
  name_uz_cyrl: string;
  description_uz: string;
  description_uz_cyrl: string;
  image?: File | string | null;
}

// Supplier Types
export interface Supplier {
  id: string;
  name: string;
  name_uz?: string;
  name_uz_cyrl?: string;
  description?: string;
  description_uz?: string;
  description_uz_cyrl?: string;
  inn?: string;
  phone?: string;
  phone_number?: string;
  email?: string;
  address?: string;
  address_uz?: string;
  address_uz_cyrl?: string;
  is_active?: boolean;
  debt: number;
  created_at?: string;
}

export interface SupplierFormData {
  name_uz: string;
  name_uz_cyrl: string;
  description_uz: string;
  description_uz_cyrl: string;
  address_uz: string;
  address_uz_cyrl: string;
  phone_number: string;
  inn: string;
}

// Store Types
export interface Store {
  id: string;
  name: string;
  name_uz?: string;
  name_uz_cyrl?: string;
  address?: string;
  address_uz?: string;
  address_uz_cyrl?: string;
  phone?: string;
  phone_number?: string;
  type?: string;
  latitude?: string;
  longitude?: string;
  is_active?: boolean;
  sellers?: unknown[];
  is_warehouse: boolean;
  created_at: string;
}

export interface StoreFormData {
  name: string;
  name_uz?: string;
  name_uz_cyrl?: string;
  address?: string;
  address_uz?: string;
  address_uz_cyrl?: string;
  phone?: string;
  phone_number?: string;
  type?: string;
  latitude?: string;
  longitude?: string;
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

// Customer Types
export interface CustomerOrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface CustomerOrder {
  id: string;
  order_id: string;
  sale_id?: string;
  store_id: string;
  store_name?: string;
  created_at: string;
  total_amount: number;
  paid_amount: number;
  debt_amount: number;
  payment_method?: 'cash' | 'card' | 'mixed';
  items: CustomerOrderItem[];
}

export interface Customer {
  id: string;
  full_name: string;
  phone_number: string;
  store_id: string;
  store_name?: string;
  latest_order_id?: string;
  order_count: number;
  total_spent: number;
  total_paid: number;
  total_debt: number;
  last_order_at?: string;
  orders: CustomerOrder[];
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
