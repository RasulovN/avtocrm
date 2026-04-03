import type { Product, ProductFormData, ProductFilters, PaginatedResponse, ApiResponse } from '../types';

const PRODUCTS_API_ENABLED = false;

// Mock data for demo (when backend is not available)
const mockProducts: Product[] = [
  {
    id: '1',
    product_id: 'PR-001',
    name: 'Oil Filter X500',
    description: 'Premium oil filter for cars',
    purchase_price: 15000,
    selling_price: 25000,
    category_id: 'Filters',
    category: 'Filters',
    supplier_id: '1',
    supplier_name: 'AutoParts Co',
    store_id: '1',
    store_name: 'Main Store',
    sku: 'SKU-001',
    barcode: '1234567890123',
    barcode_img: '',
    images: '',
    total_count: 100,
    is_active: true,
    quantity: 100,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    product_id: 'PR-002',
    name: 'Brake Pads Premium',
    description: 'Ceramic brake pads',
    purchase_price: 45000,
    selling_price: 75000,
    category_id: 'Brakes',
    category: 'Brakes',
    supplier_id: '1',
    supplier_name: 'AutoParts Co',
    store_id: '1',
    store_name: 'Main Store',
    sku: 'SKU-002',
    barcode: '1234567890124',
    barcode_img: '',
    images: '',
    total_count: 50,
    is_active: true,
    quantity: 50,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    product_id: 'PR-003',
    name: 'Air Filter AF200',
    description: 'High quality air filter',
    purchase_price: 20000,
    selling_price: 35000,
    category_id: 'Filters',
    category: 'Filters',
    supplier_id: '2',
    supplier_name: 'Parts Plus',
    store_id: '1',
    store_name: 'Main Store',
    sku: 'SKU-003',
    barcode: '1234567890125',
    barcode_img: '',
    images: '',
    total_count: 75,
    is_active: true,
    quantity: 75,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    product_id: 'PR-004',
    name: 'Spark Plug SP11',
    description: 'Iridium spark plugs',
    purchase_price: 8000,
    selling_price: 15000,
    category_id: 'Electrical',
    category: 'Electrical',
    supplier_id: '2',
    supplier_name: 'Parts Plus',
    store_id: '2',
    store_name: 'Warehouse',
    sku: 'SKU-004',
    barcode: '1234567890126',
    barcode_img: '',
    images: '',
    total_count: 200,
    is_active: true,
    quantity: 200,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    product_id: 'PR-005',
    name: 'Wiper Blades WB15',
    description: 'Universal wiper blades',
    purchase_price: 12000,
    selling_price: 22000,
    category_id: 'Body Parts',
    category: 'Body Parts',
    supplier_id: '1',
    supplier_name: 'AutoParts Co',
    store_id: '1',
    store_name: 'Main Store',
    sku: 'SKU-005',
    barcode: '1234567890127',
    barcode_img: '',
    images: '',
    total_count: 80,
    is_active: true,
    quantity: 80,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const productService = {
  getAll: async (filters?: ProductFilters & { page?: number; limit?: number }): Promise<PaginatedResponse<Product>> => {
    try {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.store_id) params.append('store_id', filters.store_id);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      if (PRODUCTS_API_ENABLED) {
        const response = await fetch(`https://autocrm.pythonanywhere.com/api/products?${params.toString()}`);
        if (!response.ok) throw new Error('API not available');
        const data = await response.json();
        return data;
      }

      throw new Error('Products API disabled');
    } catch {
      // Use mock data if API is not available
      let filtered = [...mockProducts];
      
      if (filters?.search) {
        filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(filters.search!.toLowerCase()) ||
          p.sku.toLowerCase().includes(filters.search!.toLowerCase())
        );
      }
      
      if (filters?.category) {
        filtered = filtered.filter(p => p.category === filters.category);
      }
      
      if (filters?.store_id) {
        filtered = filtered.filter(p => p.store_id === filters.store_id);
      }
      
      const page = filters?.page || 1;
      const limit = filters?.limit || 10;
      const start = (page - 1) * limit;
      const end = start + limit;
      
      return {
        data: filtered.slice(start, end),
        total: filtered.length,
        page,
        limit,
      };
    }
  },

  getById: async (id: string): Promise<Product> => {
    try {
      if (PRODUCTS_API_ENABLED) {
        const response = await fetch(`https://autocrm.pythonanywhere.com/api/products/${id}`);
        if (!response.ok) throw new Error('API not available');
        const data: ApiResponse<Product> = await response.json();
        return data.data;
      }

      throw new Error('Products API disabled');
    } catch {
      const product = mockProducts.find(p => p.id === id);
      if (!product) throw new Error('Product not found');
      return product;
    }
  },

  create: async (data: ProductFormData): Promise<Product> => {
    try {
      if (PRODUCTS_API_ENABLED) {
        const response = await fetch('https://autocrm.pythonanywhere.com/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('API not available');
        const result: ApiResponse<Product> = await response.json();
        return result.data;
      }

      throw new Error('Products API disabled');
    } catch {
      const newProduct: Product = {
        id: Date.now().toString(),
        ...data,
        sku: data.sku || `SKU-${Date.now()}`,
        barcode: data.barcode || `1234567890${Date.now()}`,
        category: data.category || data.category_id || '',
        image: data.image,
        total_count: data.total_count ?? 0,
        is_active: data.is_active ?? true,
        quantity: data.total_count ?? 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockProducts.push(newProduct);
      return newProduct;
    }
  },

  update: async (id: string, data: Partial<ProductFormData>): Promise<Product> => {
    try {
      if (PRODUCTS_API_ENABLED) {
        const response = await fetch(`https://autocrm.pythonanywhere.com/api/products/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('API not available');
        const result: ApiResponse<Product> = await response.json();
        return result.data;
      }

      throw new Error('Products API disabled');
    } catch {
      const index = mockProducts.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Product not found');
      
      const updated = {
        ...mockProducts[index],
        ...data,
        category: data.category || data.category_id || mockProducts[index].category,
        updated_at: new Date().toISOString(),
      };
      mockProducts[index] = updated;
      return updated;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      if (PRODUCTS_API_ENABLED) {
        const response = await fetch(`https://autocrm.pythonanywhere.com/api/products/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('API not available');
        return;
      }

      throw new Error('Products API disabled');
    } catch {
      const index = mockProducts.findIndex(p => p.id === id);
      if (index !== -1) {
        mockProducts.splice(index, 1);
      }
    }
  },

  getByBarcode: async (barcode: string): Promise<Product | null> => {
    try {
      if (PRODUCTS_API_ENABLED) {
        const response = await fetch(`https://autocrm.pythonanywhere.com/api/products/barcode/${barcode}`);
        if (!response.ok) throw new Error('API not available');
        const data: ApiResponse<Product> = await response.json();
        return data.data;
      }

      throw new Error('Products API disabled');
    } catch {
      return mockProducts.find(p => p.barcode === barcode) || null;
    }
  },
};
