import React from 'react';
import { clsx } from 'clsx';

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-electric text-white",
    secondary: "bg-secondary-bg text-secondary-text border border-border",
    success: "bg-profit text-black",
    destructive: "bg-loss text-white",
    outline: "border border-border text-primary-text"
  };

  return (
    <div
      ref={ref}
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge };