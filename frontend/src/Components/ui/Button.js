import React from 'react';

export default function Button({ children, className = '', ...props }) {
  return (
    <button
      className={`px-4 py-2 rounded-lg font-bold bg-blue-500 text-white shadow hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-200 text-xs sm:text-base ${className}`}
      {...props}
    >
      {children}
    </button>
  );
} 