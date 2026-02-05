
import React, { useState, useEffect, useCallback } from 'react';
import { Debt, DashboardStats } from './types';
import { supabase } from './supabaseClient';
import { analyzeDebts } from './services/geminiService';
import StatCard from './components/StatCard';
import DebtForm from './components/DebtForm';

const App: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'Aberta' | 'Fechada' | 'todas'>('Aberta');
  
  // Estados para modais de ação
  const [adjustmentModal, setAdjustmentModal] = useState<{ id: string, current: number, type: 'add' | 'sub' } | null>(null);
  const [confirmSettleModal, setConfirmSettleModal] = useState<string | null>(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<string | null>(null);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [adjustmentValue, setAdjustmentValue] = useState('');

  const filterOptions = ['Aberta', 'Fechada', 'todas'] as const;
  const activeFilterIndex = filterOptions.indexOf(filter);

  const fetchDebts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .order('data_limite', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error fetching debts:', error);
    } else if (data) {
      setDebts(data as Debt[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  const handleSettleRequest = (id: string) => setConfirmSettleModal(id);
  const handleDeleteRequest = (id: string) => setConfirmDeleteModal(id);
  const handleEditRequest = (debt: Debt) => setEditDebt(debt);

  const executeSettle = async () => {
    if (!confirmSettleModal) return;
    const id = confirmSettleModal;
    setDebts(prev => prev.map(d => d.id === id ? { ...d, situacao: 'Fechada' } : d));
    setConfirmSettleModal(null);

    const { error } = await supabase.from('debts').update({ situacao: 'Fechada' }).eq('id', id);
    if (error) {
      alert('Erro ao quitar: ' + error.message);
      fetchDebts();
    }
  };

  const executeDelete = async () => {
    if (!confirmDeleteModal) return;
    const id = confirmDeleteModal;
    setDebts(prev => prev.filter(d => d.id !== id));
    setConfirmDeleteModal(null);

    const { error } = await supabase.from('debts').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
      fetchDebts();
    }
  };

  const submitAdjustment = async () => {
    if (!adjustmentModal) return;
    const amount = parseFloat(adjustmentValue.replace(/\D/g, '')) / 100;
    if (isNaN(amount) || amount <= 0) return;

    const newVal = adjustmentModal.type === 'add' ? adjustmentModal.current + amount : adjustmentModal.current - amount;
    const finalVal = Math.max(0, newVal);

    setDebts(prev => prev.map(d => d.id === adjustmentModal.id ? { ...d, valor: finalVal } : d));
    const { error } = await supabase.from('debts').update({ valor: finalVal }).eq('id', adjustmentModal.id);

    if (error) {
      alert('Erro ao ajustar: ' + error.message);
      fetchDebts();
    } else {
      setAdjustmentModal(null);
      setAdjustmentValue('');
    }
  };

  const handleAIAnalysis = async () => {
    setAnalyzing(true);
    const result = await analyzeDebts(debts);
    setAiAnalysis(result);
    setAnalyzing(false);
  };

  const stats = (() => {
    const active = debts.filter(d => d.situacao === 'Aberta');
    const closed = debts.filter(d => d.situacao === 'Fechada');
    const totalDebt = active.reduce((acc, d) => acc + d.valor, 0);
    const totalPaid = closed.reduce((acc, d) => acc + d.valor, 0);
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const urgentCount = active.filter(d => {
      if (!d.data_limite) return false;
      return new Date(d.data_limite) <= nextWeek;
    }).length;

    return { totalDebt, totalPaid, pendingCount: active.length, urgentCount };
  })();

  const filteredDebts = debts.filter(d => filter === 'todas' ? true : d.situacao === filter);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatCurrencyInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseInt(digits || '0') / 100);
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-indigo-700 h-80 w-full absolute top-0 left-0 -z-10 rounded-b-[40px] shadow-lg overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0,100 C20,80 40,120 60,100 C80,80 100,120 100,100 L100,0 L0,0 Z" fill="white" /></svg>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none"><path d="M3 16.5L9 10.5L13 14.5L21 6.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 6.5H21V11.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <h1 className="text-3xl font-extrabold tracking-tight">DebtManager</h1>
            </div>
            <p className="text-white/80 font-medium">Gestão inteligente de dívidas.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold px-8 py-4 rounded-2xl shadow-xl transition-all flex items-center gap-2 w-fit transform active:scale-95"><span className="text-xl">+</span> Nova Dívida</button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard label="Dívida Total" value={formatCurrency(stats.totalDebt)} />
          <StatCard label="Total Pago" value={formatCurrency(stats.totalPaid)} colorClass="text-emerald-400" />
          <StatCard label="Pendências" value={stats.pendingCount} />
          <StatCard label="Urgentes" value={stats.urgentCount} colorClass="text-orange-400" />
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 mb-10 shadow-xl border border-gray-100 flex flex-col md:flex-row items-start gap-6 relative overflow-hidden">
          <div className="bg-indigo-600 w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div><h2 className="text-xl font-bold text-gray-800">Análise Financeira IA</h2><span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Estratégias personalizadas</span></div>
              <button onClick={handleAIAnalysis} disabled={analyzing} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50">{analyzing ? 'Gerando...' : 'Gerar Dicas'}</button>
            </div>
            <div className="text-gray-600 text-sm">{aiAnalysis ? <div className="prose prose-sm max-w-none whitespace-pre-wrap">{aiAnalysis}</div> : <p className="italic text-gray-400">Analise suas dívidas para receber estratégias...</p>}</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Minhas Dívidas</h2>
          
          {/* Aba "Porta Corrediça" */}
          <div className="relative bg-gray-200/50 p-1.5 rounded-2xl flex shadow-inner min-w-[340px]">
            {/* Indicador Deslizante */}
            <div 
              className="absolute top-1.5 bottom-1.5 bg-white rounded-xl shadow-md transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)"
              style={{ 
                left: `calc(${(activeFilterIndex * 100) / 3}% + 6px)`, 
                width: `calc(100% / 3 - 12px)` 
              }}
            />
            {filterOptions.map((f) => (
              <button 
                key={f} 
                onClick={() => setFilter(f)} 
                className={`relative z-10 flex-1 px-4 py-2.5 text-xs font-bold transition-colors duration-300 ${filter === f ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <div className="flex flex-col items-center">
                  <span>{f === 'Aberta' ? 'ATIVAS' : f === 'Fechada' ? 'QUITADAS' : 'TODAS'}</span>
                  <span className={`text-[9px] mt-0.5 opacity-60`}>({f === 'todas' ? debts.length : debts.filter(d => d.situacao === f).length})</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Container da Lista com Animação Suave */}
        <div key={filter} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-content-in">
          {loading && debts.length === 0 ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4 text-gray-400"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div><p className="font-medium">Carregando...</p></div>
          ) : filteredDebts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-100">
                  <tr><th className="px-8 py-4">Descrição</th><th className="px-8 py-4">Credor</th><th className="px-8 py-4">Valor</th><th className="px-8 py-4">Vencimento</th><th className="px-8 py-4 text-center">Ações</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredDebts.map(debt => (
                    <tr key={debt.id} className="hover:bg-gray-50/30 transition-colors group">
                      <td className="px-8 py-5"><div className="font-semibold text-gray-800">{debt.descricao}</div>{debt.obs && <div className="text-[10px] text-gray-400 max-w-[200px] truncate">{debt.obs}</div>}</td>
                      <td className="px-8 py-5 text-sm text-gray-600">{debt.credor}</td>
                      <td className="px-8 py-5 font-bold text-gray-800">{formatCurrency(debt.valor)}</td>
                      <td className="px-8 py-5 text-sm text-gray-500">
                        {debt.data_limite ? (
                          new Date(debt.data_limite).toLocaleDateString('pt-BR')
                        ) : (
                          <span className="italic text-gray-400 font-medium">Sem Vencimento</span>
                        )}
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-center gap-2">
                          {debt.situacao === 'Aberta' && (
                            <>
                              <button onClick={() => handleSettleRequest(debt.id)} className="w-9 h-9 flex items-center justify-center rounded-lg text-emerald-500 border border-emerald-100 bg-white hover:bg-emerald-500 hover:text-white transition-all shadow-sm" title="Quitar">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                              </button>
                              <button onClick={() => setAdjustmentModal({ id: debt.id, current: debt.valor, type: 'add' })} className="w-9 h-9 flex items-center justify-center rounded-lg text-indigo-500 border border-indigo-100 bg-white hover:bg-indigo-500 hover:text-white transition-all shadow-sm" title="Acrescentar">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                              </button>
                              <button onClick={() => setAdjustmentModal({ id: debt.id, current: debt.valor, type: 'sub' })} className="w-9 h-9 flex items-center justify-center rounded-lg text-orange-500 border border-orange-100 bg-white hover:bg-orange-500 hover:text-white transition-all shadow-sm" title="Reduzir">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4"></path></svg>
                              </button>
                              <div className="w-2" />
                              <button onClick={() => handleEditRequest(debt)} className="w-9 h-9 flex items-center justify-center rounded-lg text-indigo-500 border border-indigo-100 bg-white hover:bg-indigo-500 hover:text-white transition-all shadow-sm" title="Editar">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                              </button>
                            </>
                          )}
                          <button onClick={() => handleDeleteRequest(debt.id)} className="w-9 h-9 flex items-center justify-center rounded-lg text-red-400 border border-red-50 bg-white hover:bg-red-500 hover:text-white transition-all shadow-sm" title="Excluir">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-20 flex flex-col items-center justify-center text-center"><h3 className="text-xl font-bold text-gray-400 mb-2">Nada por aqui!</h3></div>
          )}
        </div>
      </div>

      {(showModal || editDebt) && (
        <DebtForm 
          initialData={editDebt || undefined}
          onClose={() => { setShowModal(false); setEditDebt(null); }} 
          onSuccess={fetchDebts} 
        />
      )}

      {confirmSettleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200 p-8 text-center">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Deseja Quitar?</h2>
            <p className="text-gray-500 text-sm mb-8">Esta dívida será marcada como paga.</p>
            <div className="flex gap-3"><button onClick={() => setConfirmSettleModal(null)} className="flex-1 px-6 py-4 rounded-2xl bg-gray-50 text-gray-500 font-bold hover:bg-gray-100 transition-all active:scale-95">Cancelar</button><button onClick={executeSettle} className="flex-1 px-6 py-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-lg active:scale-95">Sim, Quitar!</button></div>
          </div>
        </div>
      )}

      {confirmDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200 p-8 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Excluir Dívida?</h2>
            <p className="text-gray-500 text-sm mb-8">Esta ação não pode ser desfeita. Tem certeza que deseja apagar este registro?</p>
            <div className="flex gap-3"><button onClick={() => setConfirmDeleteModal(null)} className="flex-1 px-6 py-4 rounded-2xl bg-gray-50 text-gray-500 font-bold hover:bg-gray-100 transition-all active:scale-95">Manter</button><button onClick={executeDelete} className="flex-1 px-6 py-4 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-lg active:scale-95">Sim, Excluir</button></div>
          </div>
        </div>
      )}

      {adjustmentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden animate-in zoom-in duration-150 p-6 space-y-4">
            <div className="flex justify-between items-center"><h2 className="text-lg font-bold text-gray-800">{adjustmentModal.type === 'add' ? 'Aumentar' : 'Reduzir'} Valor</h2><button onClick={() => setAdjustmentModal(null)} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button></div>
            <input autoFocus type="text" className="w-full px-4 py-4 rounded-xl border-2 border-indigo-100 focus:border-indigo-500 outline-none text-center font-bold text-2xl text-indigo-600 bg-indigo-50/30 transition-all" placeholder="R$ 0,00" value={adjustmentValue ? formatCurrencyInput(adjustmentValue) : ''} onChange={(e) => setAdjustmentValue(e.target.value)} />
            <button onClick={submitAdjustment} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95">Salvar Novo Valor</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
