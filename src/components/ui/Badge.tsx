import * as React from "react"
import { cn } from "../../utils"

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  children: React.ReactNode;
}

const badgeVariants: Record<string, string> = {
  default: "bg-primary/10 text-primary border border-primary/20",
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
  info: "badge-info",
  outline: "border border-border bg-transparent text-muted-foreground",
};

export const Badge = ({ children, variant = 'default', className, ...props }: BadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-lg transition-colors",
        badgeVariants[variant] || badgeVariants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};