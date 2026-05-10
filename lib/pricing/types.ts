/**
 * Tipos TypeScript para el módulo de Precios y Tarifas
 */

export interface PricingMetal {
  id: string;
  metal_code: 'gold' | 'silver' | 'palladium' | 'copper';
  metal_name: string;
  international_price_per_gram: number;
  purchase_percentage: number | null;
  purchase_base_price: number | null;
  client_sale_percentage: number | null;
  client_sale_base_price: number | null;
  jeweler_sale_percentage: number | null;
  jeweler_sale_base_price: number | null;
  merma_percentage: number | null;
  has_percentages: boolean;
  updated_by_user_id: string | null;
  updated_at: string;
  created_at: string;
  updated_by?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface PricingService {
  id: string;
  category: 'setting' | 'casting' | 'design' | 'finishing' | 'laser_engraving' | '3d_printing' | 'assembly' | 'laser_cutting' | 'vulcanization' | 'refinement';
  subcategory: 'simple' | 'bezel' | 'pave' | null;
  difficulty_level: 'easy' | 'medium' | 'hard' | null;
  service_name: string;
  price_cop: number;
  price_unit: 'per_stone' | 'per_service' | 'per_gram';
  allows_custom_value: boolean;
  updated_by_user_id: string | null;
  updated_at: string;
  created_at: string;
  updated_by?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface PricingWorkerRate {
  id: string;
  category: 'setting' | 'casting' | 'design' | 'finishing' | 'laser_engraving' | '3d_printing' | 'assembly' | 'laser_cutting' | 'vulcanization';
  subcategory: 'simple' | 'bezel' | 'pave' | null;
  difficulty_level: 'easy' | 'medium' | 'hard' | null;
  service_name: string;
  rate_cop: number;
  rate_unit: 'per_stone' | 'per_service' | 'per_gram';
  allows_custom_value: boolean;
  custom_value_percentage: number;
  updated_by_user_id: string | null;
  updated_at: string;
  created_at: string;
  updated_by?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface PricingChangeLog {
  id: string;
  table_name: string;
  record_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string;
  changed_by_user_id: string | null;
  created_at: string;
  changed_by?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface ServiceCategory {
  code: string;
  name: string;
  icon: string;
  services: PricingService[];
}

export interface WorkerRateCategory {
  code: string;
  name: string;
  icon: string;
  rates: PricingWorkerRate[];
}

// Mapeo de categorías a nombres legibles e iconos
export const SERVICE_CATEGORY_META: Record<string, { name: string; icon: string }> = {
  setting: { name: 'Engaste', icon: 'gem' },
  casting: { name: 'Fundición', icon: 'flame' },
  design: { name: 'Diseño', icon: 'pencil-ruler' },
  finishing: { name: 'Acabados', icon: 'sparkles' },
  laser_engraving: { name: 'Grabado en Láser', icon: 'scan-line' },
  '3d_printing': { name: 'Impresión 3D', icon: 'printer' },
  assembly: { name: 'Armado', icon: 'wrench' },
  laser_cutting: { name: 'Corte Láser', icon: 'scissors' },
  vulcanization: { name: 'Vulcanización', icon: 'thermometer' },
  refinement: { name: 'Refinamiento', icon: 'flask-conical' },
};

// Mapeo de subcategorías de engaste a nombres legibles
export const SETTING_SUBCATEGORY_META: Record<string, { name: string }> = {
  simple: { name: 'Simple' },
  bezel: { name: 'Bisel' },
  pave: { name: 'Pave' },
};

// Mapeo de difficulty_level a nombres legibles
export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Fácil',
  medium: 'Medio',
  hard: 'Difícil',
};

// Orden de las categorías en la UI
export const SERVICE_CATEGORY_ORDER = [
  'setting',
  'casting',
  'design',
  'finishing',
  'laser_engraving',
  '3d_printing',
  'assembly',
  'laser_cutting',
  'vulcanization',
  'refinement',
];
