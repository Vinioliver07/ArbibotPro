import React from 'react';

export function Card({ children, className = '', style = {}, ...props }) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white shadow-lg p-4 sm:p-6 w-full max-w-full ${className}`}
      style={{ ...style, boxSizing: 'border-box' }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h2 className={`text-lg sm:text-xl font-extrabold text-gray-900 mb-1 tracking-tight ${className}`} {...props}>
      {children}
    </h2>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`text-gray-700 text-sm sm:text-base ${className}`} {...props}>
      {children}
    </div>
  );
} 