import React from 'react';
import { LABEL, SUBTLE } from '@/lib/ui/tokens';

export interface FormToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export default function FormToggle({
  id,
  label,
  checked,
  onChange,
  hint,
  disabled = false,
  className = '',
}: FormToggleProps) {
  const opacityClass = disabled ? 'opacity-50' : '';
  
  return (
    <div className={`flex items-center justify-between px-4 py-3 bg-muted border border-border rounded-lg ${className}`}>
      <div className="flex-1">
        <label htmlFor={id} className={`${LABEL} block ${opacityClass}`}>
          {label}
        </label>
        {hint && <p className={`${SUBTLE} mt-0.5`}>{hint}</p>}
      </div>
      
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          id={id}
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
        <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-foreground peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
      </label>
    </div>
  );
}
