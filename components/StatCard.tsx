
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  colorClass?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, colorClass = "text-white" }) => {
  return (
    <div className="glass-card rounded-2xl p-6 min-w-[180px] flex-1">
      <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">
        {label}
      </p>
      <h3 className={`text-2xl font-bold ${colorClass}`}>
        {value}
      </h3>
    </div>
  );
};

export default StatCard;
