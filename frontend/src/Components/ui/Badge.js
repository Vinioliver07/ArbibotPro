import React from 'react';

export default function Badge({ children, className = '', ...props }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs sm:text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-300 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </span>
  );
} 