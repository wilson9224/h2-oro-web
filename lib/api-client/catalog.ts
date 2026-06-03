import { createClient } from '@supabase/supabase-js';
import { sanitizePostgrestSearch } from '@/lib/supabase/postgrest';

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
  publicUrl: string;
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

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  material: string | null;
  base_price_cop: number | null;
  base_price_usd: number | null;
  is_active: boolean;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  category: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
  variants: VariantRow[] | null;
  images: ImageRow[] | null;
};

type VariantRow = {
  id: string;
  name: string;
  sku: string | null;
  price_cop: number | null;
  price_usd: number | null;
  is_active: boolean;
};

type ImageRow = {
  id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number | null;
  is_primary: boolean | null;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number | null;
  children: { id: string; name: string; slug: string; sort_order: number | null }[] | null;
};

const PRODUCT_SELECT = `
  id,
  name,
  slug,
  description,
  material,
  base_price_cop,
  base_price_usd,
  is_active,
  is_featured,
  seo_title,
  seo_description,
  category:categories!inner ( id, name, slug ),
  variants:product_variants ( id, name, sku, price_cop, price_usd, is_active ),
  images:product_images ( id, storage_path, alt_text, sort_order, is_primary )
`;

const CATEGORY_SELECT = `
  id,
  name,
  slug,
  description,
  parent_id,
  sort_order,
  children:categories!parent_id ( id, name, slug, sort_order )
`;

function getCatalogClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase no está configurado para leer el catálogo.');
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function cleanSearch(value?: string) {
  return sanitizePostgrestSearch(value ?? '');
}

function toNumber(value?: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function imageUrl(storagePath: string) {
  const supabase = getCatalogClient();
  return supabase.storage.from('products').getPublicUrl(storagePath).data.publicUrl;
}

function mapProduct(row: ProductRow): Product {
  const category = first(row.category);
  const images = (row.images ?? [])
    .filter((img) => Boolean(img.storage_path))
    .sort((a, b) => {
      if (Boolean(a.is_primary) !== Boolean(b.is_primary)) return a.is_primary ? -1 : 1;
      return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
    })
    .map((img) => ({
      id: img.id,
      storagePath: img.storage_path,
      publicUrl: imageUrl(img.storage_path),
      altText: img.alt_text,
      sortOrder: Number(img.sort_order ?? 0),
      isPrimary: Boolean(img.is_primary),
    }));

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    material: row.material,
    basePriceCop: row.base_price_cop == null ? null : Number(row.base_price_cop),
    basePriceUsd: row.base_price_usd == null ? null : Number(row.base_price_usd),
    isActive: row.is_active,
    isFeatured: row.is_featured,
    seoTitle: row.seo_title,
    seoDesc: row.seo_description,
    category: category ? { id: category.id, name: category.name, slug: category.slug } : { id: '', name: 'Sin categoría', slug: '' },
    variants: (row.variants ?? [])
      .filter((variant) => variant.is_active !== false)
      .map((variant) => ({
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        priceCop: variant.price_cop == null ? null : Number(variant.price_cop),
        priceUsd: variant.price_usd == null ? null : Number(variant.price_usd),
        isActive: variant.is_active,
      })),
    images,
  };
}

function mapCategory(row: CategoryRow, counts: Record<string, number>): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    parentId: row.parent_id,
    sortOrder: Number(row.sort_order ?? 0),
    children: (row.children ?? [])
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      .map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        sortOrder: Number(child.sort_order ?? 0),
      })),
    _count: { products: counts[row.id] ?? 0 },
  };
}

export async function getProducts(params?: Record<string, string>): Promise<PaginatedResponse<Product>> {
  const supabase = getCatalogClient();
  const page = Math.max(1, toNumber(params?.page) ?? 1);
  const limit = Math.min(60, Math.max(1, toNumber(params?.limit) ?? 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const search = cleanSearch(params?.search);
  const minPrice = toNumber(params?.minPrice);
  const maxPrice = toNumber(params?.maxPrice);

  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT, { count: 'exact' })
    .eq('is_active', true)
    .is('deleted_at', null);

  if (params?.categorySlug) query = query.eq('category.slug', params.categorySlug);
  if (params?.material) query = query.ilike('material', `%${cleanSearch(params.material)}%`);
  if (minPrice != null) query = query.gte('base_price_cop', minPrice);
  if (maxPrice != null) query = query.lte('base_price_cop', maxPrice);
  if (params?.featured === 'true') query = query.eq('is_featured', true);
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,material.ilike.%${search}%`);
  }

  switch (params?.sort) {
    case 'price_asc':
      query = query.order('base_price_cop', { ascending: true, nullsFirst: false });
      break;
    case 'price_desc':
      query = query.order('base_price_cop', { ascending: false, nullsFirst: false });
      break;
    case 'name':
      query = query.order('name', { ascending: true });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  return {
    data: ((data ?? []) as ProductRow[]).map(mapProduct),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getProductBySlug(slug: string): Promise<Product> {
  const supabase = getCatalogClient();
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single();

  if (error || !data) throw new Error('Product not found');
  return mapProduct(data as ProductRow);
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const products = await getProducts({ featured: 'true', limit: String(limit), sort: 'newest' });
  return products.data;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = getCatalogClient();
  const [{ data: categories, error }, { data: products, error: productError }] = await Promise.all([
    supabase
      .from('categories')
      .select(CATEGORY_SELECT)
      .eq('is_active', true)
      .is('deleted_at', null)
      .is('parent_id', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('products')
      .select('id, category_id')
      .eq('is_active', true)
      .is('deleted_at', null),
  ]);

  if (error) throw new Error(error.message);
  if (productError) throw new Error(productError.message);

  const counts = ((products ?? []) as { category_id: string | null }[]).reduce<Record<string, number>>((acc, product) => {
    if (product.category_id) acc[product.category_id] = (acc[product.category_id] ?? 0) + 1;
    return acc;
  }, {});

  return ((categories ?? []) as CategoryRow[]).map((category) => mapCategory(category, counts));
}
