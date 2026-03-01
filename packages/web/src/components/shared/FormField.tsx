"use client";

import { cn } from "@/utils/cn";

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
  description?: string;
}

export function FormField({
  label,
  error,
  children,
  className,
  required,
  description,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-sm font-medium leading-none">
        {label}
        {required && <span className="text-[hsl(var(--destructive))] ml-1">*</span>}
      </label>
      {description && (
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {description}
        </p>
      )}
      {children}
      {error && (
        <p className="text-xs text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.1)] rounded px-2 py-1 transition-all">
          {error}
        </p>
      )}
    </div>
  );
}
