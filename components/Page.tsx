
import React from 'react';

interface PageProps {
    children: React.ReactNode;
    className?: string;
}

const Page: React.FC<PageProps> = ({ children, className }) => {
    return (
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 ${className}`}>
            {children}
        </div>
    );
};

export default Page;
