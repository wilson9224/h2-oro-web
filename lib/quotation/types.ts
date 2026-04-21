export type QuoteType = 'client' | 'jeweler';
export type QuotationStatus = 'draft' | 'converted';
export type MetalType = 'gold' | 'silver';
export type GoldColor = 'yellow' | 'rose' | 'white';

export const PIECE_TYPES = [
  'Anillos',
  'Aretes',
  'Collares y Cadenas',
  'Pulseras y Brazaletes',
  'Dijes y Medallas',
] as const;

export const STONE_TYPES = [
  'Diamante',
  'Rubí',
  'Esmeralda',
  'Zafiro',
  'Amatista',
  'Topacio',
  'Aguamarina',
  'Cuarzo',
  'Circón',
  'Moissanita',
] as const;

export const STONE_CUTS = [
  'Brillante (Redonda)',
  'Princesa',
  'Esmeralda',
  'Oval',
  'Pera (Lágrima)',
  'Marquesa o Navette',
  'Corazón',
  'Baguette',
  'Cabujón',
] as const;

export const GOLD_COLOR_LABELS: Record<GoldColor, string> = {
  yellow: 'Amarillo',
  rose: 'Rosado',
  white: 'Blanco',
};

export interface StoneRow {
  id: string;
  client_delivers: boolean;
  stone_type: string;
  cut: string;
  weight_ct: number;
  quantity: number;
  price_per_ct: number;
  total_cop: number;
}

export interface AlloyBreakdown {
  color: GoldColor;
  silver_gr: number;
  copper_gr: number;
  palladium_gr: number;
  silver_price_cop: number;
  copper_price_cop: number;
  palladium_price_cop: number;
  total_cop: number;
}

export interface LaborItem {
  service_category: string;
  service_name: string;
  service_code: string;
  has_difficulty: boolean;
  difficulty_level: 'easy' | 'medium' | 'hard' | null;
  price_cop: number;
  other_value: number | null;
  effective_price: number;
}

export interface QuotationRecord {
  id: string;
  quote_number: string;
  quote_type: QuoteType;
  status: QuotationStatus;

  client_id: string | null;
  client_phone: string | null;
  client_name_temp: string | null;

  piece_type: string;
  description: string | null;

  metal_type: MetalType;
  metal_purity: number;
  metal_purity_pct: number;
  estimated_weight_gr: number;
  total_weight_gr: number;
  gold_color: GoldColor | null;
  metal_price_cop: number;
  alloy_price_cop: number;
  alloy_breakdown: AlloyBreakdown | null;

  client_provides_metal: boolean;
  client_metal_weight_gr: number | null;
  client_metal_purity: number | null;
  client_metal_purity_pct: number | null;
  client_pure_metal_gr: number | null;
  required_pure_metal_gr: number | null;
  pending_metal_gr: number | null;
  pending_metal_value_cop: number | null;
  metal_excess_gr: number | null;

  has_stones: boolean;
  stones: StoneRow[] | null;
  stones_total_cop: number;

  labor_items: LaborItem[] | null;
  labor_total_cop: number;

  total_cop: number;

  order_id: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;

  client?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
  } | null;
}

export interface QuotationFormState {
  id: string | null;
  quote_type: QuoteType | null;

  // Información general
  piece_type: string;
  description: string;

  // Cliente
  client_id: string | null;
  client_phone: string;
  client_name_temp: string;
  searched_client: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
  } | null;

  // Metal
  metal_type: MetalType;
  metal_purity: string;
  metal_purity_pct: number;
  estimated_weight_gr: string;
  total_weight_gr: number;
  gold_color: GoldColor | '';

  // Calculados de metal
  metal_price_cop: number;
  alloy_price_cop: number;
  alloy_breakdown: AlloyBreakdown | null;

  // Cliente entrega metal
  client_provides_metal: boolean;
  client_metal_weight_gr: string;
  client_metal_purity: string;
  client_metal_purity_pct: number;
  client_pure_metal_gr: number;
  required_pure_metal_gr: number;
  pending_metal_gr: number;
  pending_metal_value_cop: number;
  metal_excess_gr: number;

  // Piedras
  has_stones: boolean;
  stones: StoneRow[];
  stones_total_cop: number;

  // Mano de obra
  labor_items: LaborItem[];
  labor_total_cop: number;

  // Total
  total_cop: number;
}

export const DEFAULT_FORM_STATE: QuotationFormState = {
  id: null,
  quote_type: null,

  piece_type: '',
  description: '',

  client_id: null,
  client_phone: '',
  client_name_temp: '',
  searched_client: null,

  metal_type: 'gold',
  metal_purity: '',
  metal_purity_pct: 0,
  estimated_weight_gr: '',
  total_weight_gr: 0,
  gold_color: '',

  metal_price_cop: 0,
  alloy_price_cop: 0,
  alloy_breakdown: null,

  client_provides_metal: false,
  client_metal_weight_gr: '',
  client_metal_purity: '',
  client_metal_purity_pct: 0,
  client_pure_metal_gr: 0,
  required_pure_metal_gr: 0,
  pending_metal_gr: 0,
  pending_metal_value_cop: 0,
  metal_excess_gr: 0,

  has_stones: false,
  stones: [],
  stones_total_cop: 0,

  labor_items: [],
  labor_total_cop: 0,

  total_cop: 0,
};
