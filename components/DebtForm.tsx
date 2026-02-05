
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Debt } from '../types';

interface DebtFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Debt; // Prop opcional para modo de edição
}

const DebtForm: React.FC<DebtFormProps> = ({ onClose, onSuccess, initialData }) => {
  const [loading, setLoading] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const [hasNoLimit, setHasNoLimit] = useState(false);
  const [formData, setFormData] = useState({
    descricao: '',
    credor: '',
    valor: 0,
    data_limite: '',
    obs: ''
  });

  const isEditing = !!initialData;

  useEffect(() => {
    if (initialData) {
      const hasDate = !!initialData.data_limite;
      setFormData({
        descricao: initialData.descricao,
        credor: initialData.credor,
        valor: initialData.valor,
        data_limite: hasDate ? initialData.data_limite.split('T')[0] : '',
        obs: initialData.obs || ''
      });
      setHasNoLimit(!hasDate);
      setDisplayValue(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(initialData.valor));
    }
  }, [initialData]);

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const numberValue = parseInt(digits || '0') / 100;
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numberValue);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isEditing) return; // Bloqueia alteração no modo edição
    const rawValue = e.target.value.replace(/\D/g, '');
    const numberValue = parseInt(rawValue || '0') / 100;
    
    setFormData({ ...formData, valor: numberValue });
    setDisplayValue(formatCurrency(rawValue));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const dataLimiteFinal = hasNoLimit ? null : formData.data_limite;

    let error;
    if (isEditing) {
      const { error: updateError } = await supabase
        .from('debts')
        .update({
          descricao: formData.descricao,
          credor: formData.credor,
          data_limite: dataLimiteFinal,
          obs: formData.obs
        })
        .eq('id', initialData.id);
      error = updateError;
    } else {
      if (formData.valor <= 0) {
        alert('Por favor, insira um valor válido.');
        setLoading(false);
        return;
      }
      const { error: insertError } = await supabase.from('debts').insert([
        {
          descricao: formData.descricao,
          credor: formData.credor,
          valor: formData.valor,
          data_limite: dataLimiteFinal,
          obs: formData.obs,
          situacao: 'Aberta'
        }
      ]);
      error = insertError;
    }

    setLoading(false);
    if (error) {
      alert('Erro ao salvar: ' + error.message);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'Editar Dívida' : 'Nova Dívida'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Descrição</label>
            <input
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="Ex: Empréstimo Pessoal"
              value={formData.descricao}
              onChange={e => setFormData({...formData, descricao: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Credor</label>
              <input
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Ex: Banco Itaú"
                value={formData.credor}
                onChange={e => setFormData({...formData, credor: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Valor (R$)</label>
              <input
                disabled={isEditing}
                required
                type="text"
                className={`w-full px-4 py-3 rounded-xl border outline-none font-bold transition-all ${isEditing ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-200 focus:ring-2 focus:ring-indigo-500 text-indigo-600'}`}
                placeholder="R$ 0,00"
                value={displayValue}
                onChange={handleValueChange}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1 ml-1">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Data Limite</label>
              <label className="flex items-center gap-1.5 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  checked={hasNoLimit}
                  onChange={(e) => setHasNoLimit(e.target.checked)}
                />
                <span className="text-[10px] font-bold text-gray-400 group-hover:text-indigo-500 transition-colors uppercase tracking-tight">Sem data limite</span>
              </label>
            </div>
            <input
              required={!hasNoLimit}
              disabled={hasNoLimit}
              type="date"
              className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${hasNoLimit ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed opacity-50' : 'border-gray-200 focus:ring-2 focus:ring-indigo-500'}`}
              value={hasNoLimit ? '' : formData.data_limite}
              onChange={e => setFormData({...formData, data_limite: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Observações</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              rows={3}
              placeholder="Notas opcionais..."
              value={formData.obs}
              onChange={e => setFormData({...formData, obs: e.target.value})}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50 mt-4"
          >
            {loading ? 'Salvando...' : (isEditing ? 'Atualizar Dívida' : 'Cadastrar Dívida')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DebtForm;
