
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-surface rounded-xl shadow-md p-4 sm:p-6 transition-shadow hover:shadow-lg ${className}`}>
      {children}
    </div>
  );
};

export default Card;
