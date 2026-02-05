
export interface Debt {
  id: string;
  created_at: string;
  descricao: string;
  credor: string;
  valor: number;
  data_limite: string;
  obs: string;
  situacao: 'Aberta' | 'Fechada';
}

export interface DashboardStats {
  totalDebt: number;
  totalPaid: number;
  pendingCount: number;
  urgentCount: number;
}
