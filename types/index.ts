import React from 'react';

export interface KpiCardProps {
  title: string;
  value: string;
  unit?: string;
  trend: number; // percentage change, e.g., 5 for +5%, -2 for -2%
  icon: React.ReactNode;
}

export interface ChartData {
  name: string;
  value: number;
}