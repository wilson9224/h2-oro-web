const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  material: string | null;
  basePriceCop: number | null;
  basePriceUsd: number | null;
  isActive: boolean;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDesc: string | null;
  category: { id: string; name: string; slug: string };
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string | null;
  priceCop: number | null;
  priceUsd: number | null;
  isActive: boolean;
}

export interface ProductImage {
  id: string;
  storagePath: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  children: { id: string; name: string; slug: string; sortOrder: number }[];
  _count: { products: number };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getProducts(params?: Record<string, string>): Promise<PaginatedResponse<Product>> {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await fetch(`${API_BASE_URL}/catalog/products${query}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function getProductBySlug(slug: string): Promise<Product> {
  const res = await fetch(`${API_BASE_URL}/catalog/products/${slug}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error('Product not found');
  return res.json();
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const res = await fetch(`${API_BASE_URL}/catalog/products/featured?limit=${limit}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error('Failed to fetch featured products');
  return res.json();
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE_URL}/catalog/categories`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}
