
import React from 'react';

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    message: string;
    action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, action }) => {
    return (
        <div className="text-center py-10 px-4">
            <div className="text-text-secondary">
                {icon}
            </div>
            <h3 className="mt-2 text-lg font-semibold text-text-primary">{title}</h3>
            <p className="mt-1 text-sm text-text-secondary">{message}</p>
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
};

export default EmptyState;