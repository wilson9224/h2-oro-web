// Types for Joyero interface

export type AssignmentStatus = 'pending' | 'assigned' | 'in_progress' | 'paused' | 'completed' | 'blocked';

export interface WorkerAssignment {
  assignmentId: string;
  stageCode: string;
  stageName: string;
  status: AssignmentStatus;
  startedAt: string | null;
  completedAt: string | null;
  pausedAt: string | null;
  priority: number;
  progressPct: number;
  pieceName: string;
  pieceDescription: string | null;
  orderNumber: string;
  orderId: string;
  orderType: string;
}

export interface PauseLog {
  id: string;
  assignmentId: string;
  pausedAt: string;
  resumedAt: string | null;
  reason: string;
  durationMinutes: number | null;
}

export interface WorkerPayment {
  id: string;
  workerId: string;
  assignmentId: string | null;
  concept: string;
  serviceCode: string | null;
  pieceName: string | null;
  amountCop: number;
  status: 'pending' | 'paid';
  paidAt: string | null;
  confirmedAt: string | null;
  notes: string | null;
  createdAt: string;
  orderNumber?: string;
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
    status: AssignmentStatus;
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
  status: AssignmentStatus;
  startedAt: string | null;
  completedAt: string | null;
  pausedAt: string | null;
  pauseReason: string | null;
  effectiveMinutes: number | null;
  progressPct: number;
  priority: number | null;
  pieceId: string;
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
