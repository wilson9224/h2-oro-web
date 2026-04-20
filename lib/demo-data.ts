/**
 * Mock data for DEMO_MODE — keeps panels populated without a real API.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const d = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
const DEMO_ORDERS = [
  {
    id: 'demo-order-1',
    orderNumber: 'ORD-20260320-0001',
    type: 'custom',
    status: 'in_progress',
    totalAmountCop: 4_500_000,
    currency: 'COP',
    notes: 'Anillo de compromiso en oro 18k con diamante 0.5ct',
    createdAt: d(12),
    estimatedDeliveryDate: d(-5),
    clientPhone: '+573001234567',
    client: { id: 'demo-client-1', firstName: 'María', lastName: 'Restrepo', email: 'maria@email.com' },
    pieces: [
      { id: 'p1', name: 'Anillo de compromiso', sortOrder: 1, currentState: { code: 'production', name: 'Producción', isFinal: false } },
    ],
    _count: { pieces: 1, payments: 1 },
    payments: [
      { id: 'pay-1', orderId: 'demo-order-1', method: 'transferencia', amountCop: 2_250_000, amountUsd: null, status: 'completed', wompiReference: null, paidAt: d(12), createdAt: d(12) },
    ],
  },
  {
    id: 'demo-order-2',
    orderNumber: 'ORD-20260322-0002',
    type: 'catalog',
    status: 'pending',
    totalAmountCop: 1_200_000,
    currency: 'COP',
    notes: null,
    createdAt: d(10),
    estimatedDeliveryDate: d(-10),
    clientPhone: '+573109876543',
    client: { id: 'demo-client-2', firstName: 'Carlos', lastName: 'Gómez', email: 'carlos@email.com' },
    pieces: [
      { id: 'p2', name: 'Cadena eslabón cubano', sortOrder: 1, currentState: { code: 'quote', name: 'Cotización', isFinal: false } },
    ],
    _count: { pieces: 1, payments: 0 },
    payments: [],
  },
  {
    id: 'demo-order-3',
    orderNumber: 'ORD-20260325-0003',
    type: 'repair',
    status: 'in_progress',
    totalAmountCop: 350_000,
    currency: 'COP',
    notes: 'Soldadura de pulsera rota',
    createdAt: d(7),
    estimatedDeliveryDate: d(-2),
    clientPhone: '+573205551234',
    client: { id: 'demo-client-3', firstName: 'Luisa', lastName: 'Hernández', email: 'luisa@email.com' },
    pieces: [
      { id: 'p3', name: 'Pulsera tejida', sortOrder: 1, currentState: { code: 'production', name: 'Producción', isFinal: false } },
    ],
    _count: { pieces: 1, payments: 1 },
    payments: [
      { id: 'pay-2', orderId: 'demo-order-3', method: 'efectivo', amountCop: 350_000, amountUsd: null, status: 'completed', wompiReference: null, paidAt: d(7), createdAt: d(7) },
    ],
  },
  {
    id: 'demo-order-4',
    orderNumber: 'ORD-20260328-0004',
    type: 'custom',
    status: 'in_progress',
    totalAmountCop: 8_000_000,
    currency: 'COP',
    notes: 'Juego de aretes y collar con esmeraldas',
    createdAt: d(4),
    estimatedDeliveryDate: d(-15),
    clientPhone: '+573001234567',
    client: { id: 'demo-client-1', firstName: 'María', lastName: 'Restrepo', email: 'maria@email.com' },
    pieces: [
      { id: 'p4', name: 'Aretes esmeralda', sortOrder: 1, currentState: { code: 'design', name: 'Diseño', isFinal: false } },
      { id: 'p5', name: 'Collar esmeralda', sortOrder: 2, currentState: { code: 'design_approval', name: 'Aprobación diseño', isFinal: false } },
    ],
    _count: { pieces: 2, payments: 1 },
    payments: [
      { id: 'pay-3', orderId: 'demo-order-4', method: 'wompi', amountCop: 4_000_000, amountUsd: null, status: 'completed', wompiReference: 'WMP-123456', paidAt: d(4), createdAt: d(4) },
    ],
  },
  {
    id: 'demo-order-5',
    orderNumber: 'ORD-20260330-0005',
    type: 'resize',
    status: 'completed',
    totalAmountCop: 180_000,
    currency: 'COP',
    notes: 'Ajuste de talla 8 a 6',
    createdAt: d(2),
    estimatedDeliveryDate: d(0),
    clientPhone: '+573109876543',
    client: { id: 'demo-client-2', firstName: 'Carlos', lastName: 'Gómez', email: 'carlos@email.com' },
    pieces: [
      { id: 'p6', name: 'Anillo solitario', sortOrder: 1, currentState: { code: 'ready', name: 'Listo para entrega', isFinal: true } },
    ],
    _count: { pieces: 1, payments: 1 },
    payments: [
      { id: 'pay-4', orderId: 'demo-order-5', method: 'efectivo', amountCop: 180_000, amountUsd: null, status: 'completed', wompiReference: null, paidAt: d(2), createdAt: d(2) },
    ],
  },
  {
    id: 'demo-order-6',
    orderNumber: 'ORD-20260401-0006',
    type: 'catalog',
    status: 'delivered',
    totalAmountCop: 2_800_000,
    currency: 'COP',
    notes: null,
    createdAt: d(20),
    estimatedDeliveryDate: d(5),
    clientPhone: '+573205551234',
    client: { id: 'demo-client-3', firstName: 'Luisa', lastName: 'Hernández', email: 'luisa@email.com' },
    pieces: [
      { id: 'p7', name: 'Anillo Triple Oro', sortOrder: 1, currentState: { code: 'delivered', name: 'Entregado', isFinal: true } },
      { id: 'p8', name: 'Dije corazón', sortOrder: 2, currentState: { code: 'delivered', name: 'Entregado', isFinal: true } },
    ],
    _count: { pieces: 2, payments: 2 },
    payments: [
      { id: 'pay-5', orderId: 'demo-order-6', method: 'wompi', amountCop: 1_400_000, amountUsd: null, status: 'completed', wompiReference: 'WMP-654321', paidAt: d(20), createdAt: d(20) },
      { id: 'pay-6', orderId: 'demo-order-6', method: 'transferencia', amountCop: 1_400_000, amountUsd: null, status: 'completed', wompiReference: null, paidAt: d(10), createdAt: d(10) },
    ],
  },
  {
    id: 'demo-order-jewelry-1',
    orderNumber: 'ORD-20260402-J001',
    type: 'jewelry',
    status: 'in_progress',
    totalAmountCop: 5_500_000,
    currency: 'COP',
    notes: 'Anillo de compromiso personalizado en oro blanco con diamante',
    createdAt: d(1),
    estimatedDeliveryDate: d(-3),
    clientPhone: '+573001112233',
    client: { id: 'demo-client-1', firstName: 'María', lastName: 'Restrepo', email: 'maria@email.com' },
    pieces: [
      { id: 'p-jewelry-1', name: 'Anillo compromiso personalizado', sortOrder: 1, currentState: { code: 'production', name: 'Producción', isFinal: false } },
    ],
    _count: { pieces: 1, payments: 1 },
    payments: [
      { id: 'pay-jewelry-1', orderId: 'demo-order-jewelry-1', method: 'transferencia', amountCop: 2_750_000, amountUsd: null, status: 'completed', wompiReference: null, paidAt: d(1), createdAt: d(1) },
    ],
  },
];

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
const DEMO_USERS = [
  { id: 'demo-admin-id', email: 'admin@h2oro.demo', firstName: 'Admin', lastName: 'Demo', phone: '+573001112233', isActive: true, createdAt: d(90), role: { name: 'admin', description: 'Administrador' } },
  { id: 'demo-manager-1', email: 'gerente@h2oro.demo', firstName: 'Andrés', lastName: 'Mejía', phone: '+573004445566', isActive: true, createdAt: d(80), role: { name: 'manager', description: 'Gerente' } },
  { id: 'demo-jeweler-1', email: 'joyero1@h2oro.demo', firstName: 'Pedro', lastName: 'Muñoz', phone: '+573007778899', isActive: true, createdAt: d(60), role: { name: 'jeweler', description: 'Joyero' } },
  { id: 'demo-jeweler-2', email: 'joyero2@h2oro.demo', firstName: 'Rosa', lastName: 'Vargas', phone: '+573002223344', isActive: true, createdAt: d(50), role: { name: 'jeweler', description: 'Joyero' } },
  { id: 'demo-designer-1', email: 'disenador@h2oro.demo', firstName: 'Camila', lastName: 'Ríos', phone: '+573006667788', isActive: true, createdAt: d(45), role: { name: 'designer', description: 'Diseñador' } },
  { id: 'demo-client-1', email: 'maria@email.com', firstName: 'María', lastName: 'Restrepo', phone: '+573001234567', isActive: true, createdAt: d(30), role: { name: 'client', description: 'Cliente' } },
  { id: 'demo-client-2', email: 'carlos@email.com', firstName: 'Carlos', lastName: 'Gómez', phone: '+573109876543', isActive: true, createdAt: d(25), role: { name: 'client', description: 'Cliente' } },
  { id: 'demo-client-3', email: 'luisa@email.com', firstName: 'Luisa', lastName: 'Hernández', phone: '+573205551234', isActive: true, createdAt: d(20), role: { name: 'client', description: 'Cliente' } },
];

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
const DEMO_DASHBOARD = {
  kpis: {
    totalOrders: 6,
    activeOrders: 3,
    ordersLast30Days: 5,
    activeAssignments: 4,
    blockedAssignments: 1,
    delayedOrders: 1,
    totalRevenueCop: 9_580_000,
    totalPaymentsCount: 6,
  },
  ordersByStatus: [
    { status: 'pending', _count: 1 },
    { status: 'in_progress', _count: 3 },
    { status: 'completed', _count: 1 },
    { status: 'delivered', _count: 1 },
  ],
  ordersByType: [
    { type: 'custom', _count: 2 },
    { type: 'catalog', _count: 2 },
    { type: 'repair', _count: 1 },
    { type: 'resize', _count: 1 },
  ],
  recentOrders: DEMO_ORDERS.slice(0, 5).map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    type: o.type,
    status: o.status,
    createdAt: o.createdAt,
    client: o.client,
    _count: { pieces: o.pieces.length },
  })),
};

// ---------------------------------------------------------------------------
// Router — resolves an API path to mock data
// ---------------------------------------------------------------------------
export function resolveDemoData(endpoint: string): unknown {
  // Remove query string for matching
  const [path, qs] = endpoint.split('?');
  const params = new URLSearchParams(qs || '');

  // Dashboard
  if (path === '/dashboard/admin') return DEMO_DASHBOARD;

  // Orders list
  if (path === '/orders') {
    let filtered = [...DEMO_ORDERS];
    const status = params.get('status');
    const type = params.get('type');
    const search = params.get('search')?.toLowerCase();
    const clientId = params.get('clientId');

    if (status) filtered = filtered.filter((o) => o.status === status);
    if (type) filtered = filtered.filter((o) => o.type === type);
    if (clientId) filtered = filtered.filter((o) => o.client.id === clientId);
    if (search) {
      filtered = filtered.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(search) ||
          o.client.firstName.toLowerCase().includes(search) ||
          o.client.lastName.toLowerCase().includes(search),
      );
    }

    const page = Number(params.get('page') || 1);
    const limit = Number(params.get('limit') || 15);
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    return {
      data,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  }

  // Single order by ID
  const orderMatch = path.match(/^\/orders\/(.+)$/);
  if (orderMatch) {
    const order = DEMO_ORDERS.find((o) => o.id === orderMatch[1]);
    return order || null;
  }

  // Users list
  if (path === '/users') {
    const page = Number(params.get('page') || 1);
    const limit = Number(params.get('limit') || 20);
    const start = (page - 1) * limit;
    return {
      data: DEMO_USERS.slice(start, start + limit),
      total: DEMO_USERS.length,
      page,
      limit,
    };
  }

  // Auth profile
  if (path === '/auth/profile') {
    return DEMO_USERS[0];
  }

  // Reports — return empty blob-like response (won't break UI)
  if (path.startsWith('/reports/')) {
    return null;
  }

  // Workflow transitions — return empty array (won't break UI)
  if (path.startsWith('/workflow/')) {
    return [];
  }

  return null;
}
