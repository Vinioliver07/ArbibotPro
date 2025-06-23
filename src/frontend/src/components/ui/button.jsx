import React from 'react';
import { clsx } from 'clsx';

const Button = React.forwardRef(({ 
  className, 
  variant = "default", 
  size = "default", 
  children, 
  disabled,
  ...props 
}, ref) => {
  const baseClasses = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none gpu-accelerated";
  
  const variants = {
    default: "bg-electric text-white hover:bg-electric/90 shadow-md hover:shadow-lg",
    outline: "border border-border bg-transparent hover:bg-secondary-bg text-primary-text",
    ghost: "hover:bg-secondary-bg text-primary-text",
    destructive: "bg-loss text-white hover:bg-loss/90"
  };
  
  const sizes = {
    default: "h-10 px-4 py-2 text-sm",
    sm: "h-8 px-3 text-xs",
    lg: "h-12 px-8 text-base",
    icon: "h-10 w-10"
  };

  return (
    <button
      className={clsx(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      ref={ref}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button };