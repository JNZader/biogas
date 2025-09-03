
import React from 'react';
import type { KpiCardProps } from '../types';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

const KpiCard: React.FC<KpiCardProps> = ({ title, value, unit, trend, icon }) => {
  const isPositive = trend >= 0;
  const trendColor = isPositive ? 'text-success' : 'text-error';

  return (
    <div className="bg-surface rounded-xl shadow-md p-4 flex flex-col justify-between transition-shadow hover:shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
        <div className="text-primary">{icon}</div>
      </div>
      <div>
        <p className="text-3xl font-bold text-text-primary">
          {value}
          {unit && <span className="text-lg font-medium text-text-secondary ml-1">{unit}</span>}
        </p>
        <div className={`flex items-center text-sm font-medium ${trendColor}`}>
          {isPositive ? <ArrowUpIcon className="h-4 w-4 mr-1" aria-hidden="true" /> : <ArrowDownIcon className="h-4 w-4 mr-1" aria-hidden="true" />}
          <span className="sr-only">{isPositive ? 'Aumento del' : 'Disminución del'}</span>
          <span>{Math.abs(trend)}% vs last period</span>
        </div>
      </div>
    </div>
  );
};

export default KpiCard;