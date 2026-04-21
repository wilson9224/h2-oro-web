// Types for Joyero interface

export interface WorkerAssignment {
  assignmentId: string;
  stageCode: string;
  stageName: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'blocked';
  startedAt: string | null;
  completedAt: string | null;
  priority: number;
  progressPct: number;
  pieceName: string;
  pieceDescription: string | null;
  orderNumber: string;
  orderId: string;
  orderType: string;
}

export interface WorkerStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

export interface StateDistribution {
  stageCode: string;
  stageName: string;
  count: number;
}

export interface AvgTime {
  stageCode: string;
  stageName: string;
  avgHours: number;
}

export interface PaymentSummary {
  pendingAmount: number;
  paidAmount: number;
  bonusAmount: number;
}

export interface OrderDetail {
  orderId: string;
  orderNumber: string;
  orderType: string;
  pieceName: string;
  pieceDescription: string | null;
  notes: string | null;
  assignments: Array<{
    id: string;
    stageCode: string;
    stageName: string;
    status: 'assigned' | 'in_progress' | 'completed';
    startedAt: string | null;
    completedAt: string | null;
    progressPct: number;
  }>;
  images: Array<{
    id: string;
    url: string;
    fileName: string;
  }>;
  materials: Array<{
    name: string;
    quantity: string;
    delivered: boolean;
  }>;
}

export interface Assignment {
  id: string;
  stageCode: string;
  stageName: string;
  status: 'assigned' | 'in_progress' | 'completed';
  startedAt: string | null;
  completedAt: string | null;
  progressPct: number;
  pieceName: string;
  pieceDescription: string | null;
  orderNumber: string;
  orderId: string;
  notes: string | null;
}

export interface Evidence {
  id: string;
  url: string;
  fileName: string;
}

export interface Notification {
  id: string;
  assignmentId: string;
  orderNumber: string;
  stageName: string;
  pieceName: string;
  createdAt: string;
}
