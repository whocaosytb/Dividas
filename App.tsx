
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
  const [filter, setFilter] = useState<'ativas' | 'quitadas' | 'todas'>('todas');

  const fetchDebts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .order('data_limite', { ascending: true });

    if (error) {
      console.error('Error fetching debts:', error);
    } else if (data) {
      setDebts(data as Debt[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDebts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAIAnalysis = async () => {
    setAnalyzing(true);
    const result = await analyzeDebts(debts);
    setAiAnalysis(result);
    setAnalyzing(false);
  };

  const calculateStats = (): DashboardStats => {
    const activeDebts = debts.filter(d => d.status !== 'quitada');
    const totalDebt = activeDebts.reduce((acc, d) => acc + d.valor, 0);
    const totalPaid = debts.filter(d => d.status === 'quitada').reduce((acc, d) => acc + d.valor, 0);
    
    // Simulating "Urgent" as anything expiring within 7 days
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const urgentCount = activeDebts.filter(d => {
      const limit = new Date(d.data_limite);
      return limit <= nextWeek;
    }).length;

    return {
      totalDebt,
      totalPaid,
      pendingCount: activeDebts.length,
      urgentCount
    };
  };

  const stats = calculateStats();
  const filteredDebts = debts.filter(d => {
    if (filter === 'todas') return true;
    if (filter === 'ativas') return d.status !== 'quitada';
    if (filter === 'quitadas') return d.status === 'quitada';
    return true;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="min-h-screen">
      {/* Background Header */}
      <div className="bg-indigo-700 h-80 w-full absolute top-0 left-0 -z-10 rounded-b-[40px] shadow-lg overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,100 C20,80 40,120 60,100 C80,80 100,120 100,100 L100,0 L0,0 Z" fill="white" />
          </svg>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Navbar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 16.5L9 10.5L13 14.5L21 6.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 6.5H21V11.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h1 className="text-3xl font-extrabold tracking-tight">DebtManager</h1>
            </div>
            <p className="text-white/80 font-medium">Sua liberdade financeira começa aqui.</p>
          </div>
          
          <button 
            onClick={() => setShowModal(true)}
            className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold px-8 py-4 rounded-2xl shadow-xl transition-all flex items-center gap-2 w-fit transform active:scale-95"
          >
            <span className="text-xl">+</span> Nova Dívida
          </button>
        </header>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard label="Dívida Total" value={formatCurrency(stats.totalDebt)} />
          <StatCard label="Total Já Pago" value={formatCurrency(stats.totalPaid)} colorClass="text-emerald-400" />
          <StatCard label="Pendências" value={stats.pendingCount} />
          <StatCard label="Urgentes" value={stats.urgentCount} colorClass="text-orange-400" />
        </div>

        {/* AI Strategy Card */}
        <div className="bg-white rounded-[2.5rem] p-8 mb-10 shadow-xl border border-gray-100 flex flex-col md:flex-row items-start gap-6 relative overflow-hidden">
          <div className="bg-indigo-600 w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Estratégia do Mês</h2>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Consultoria Inteligente</span>
              </div>
              <button 
                onClick={handleAIAnalysis}
                disabled={analyzing}
                className="flex items-center gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {analyzing ? 'Analisando...' : 'Analisar'}
              </button>
            </div>
            
            <div className="text-gray-600 leading-relaxed min-h-[60px]">
              {aiAnalysis ? (
                <div className="prose prose-indigo max-w-none whitespace-pre-wrap">{aiAnalysis}</div>
              ) : (
                <p className="italic text-gray-400">Clique no botão analisar para receber dicas personalizadas para suas dívidas...</p>
              )}
            </div>
          </div>
        </div>

        {/* Debts Table/List */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Suas Dívidas</h2>
          <div className="bg-gray-200/50 p-1 rounded-xl flex gap-1">
            <button 
              onClick={() => setFilter('ativas')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'ativas' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              ATIVAS ({debts.filter(d => d.status !== 'quitada').length})
            </button>
            <button 
              onClick={() => setFilter('quitadas')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'quitadas' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              QUITADAS ({debts.filter(d => d.status === 'quitada').length})
            </button>
            <button 
              onClick={() => setFilter('todas')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'todas' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              TODAS
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4 text-gray-400">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="font-medium">Carregando seus dados...</p>
            </div>
          ) : filteredDebts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-100">
                  <tr>
                    <th className="px-8 py-4">Descrição</th>
                    <th className="px-8 py-4">Credor</th>
                    <th className="px-8 py-4">Valor</th>
                    <th className="px-8 py-4">Vencimento</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredDebts.map(debt => (
                    <tr key={debt.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="font-semibold text-gray-800">{debt.descricao}</div>
                        {debt.obs && <div className="text-[10px] text-gray-400 max-w-[200px] truncate">{debt.obs}</div>}
                      </td>
                      <td className="px-8 py-5 text-sm text-gray-600">{debt.credor}</td>
                      <td className="px-8 py-5 font-bold text-gray-800">{formatCurrency(debt.valor)}</td>
                      <td className="px-8 py-5 text-sm text-gray-500">
                        {new Date(debt.data_limite).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${debt.status === 'quitada' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                          {debt.status || 'Ativa'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                           {/* Mark as paid toggle simulation */}
                           <button className="p-2 text-gray-300 hover:text-indigo-600 transition-colors">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-20 flex flex-col items-center justify-center text-center">
              <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mb-6">
                <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-400 mb-2">Nada por aqui!</h3>
              <p className="text-gray-400 max-w-xs">Tudo sob controle ou pronto para começar um novo planejamento?</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <DebtForm 
          onClose={() => setShowModal(false)} 
          onSuccess={fetchDebts} 
        />
      )}
      
      <footer className="mt-20 pb-10 text-center text-gray-400 text-sm">
        <p>&copy; {new Date().getFullYear()} DebtManager Intelligence. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default App;
