
export interface Debt {
  id: string;
  created_at: string;
  descricao: string;
  credor: string;
  valor: number;
  data_limite: string;
  obs: string;
  status?: 'ativa' | 'quitada'; // Adicionado para suportar o filtro da UI
}

export interface DashboardStats {
  totalDebt: number;
  totalPaid: number;
  pendingCount: number;
  urgentCount: number;
}
