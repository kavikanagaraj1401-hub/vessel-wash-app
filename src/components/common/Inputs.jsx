import React from 'react';
import { Search, AlertCircle } from 'lucide-react';

export function TextInput({
  label,
  id,
  value,
  onChange,
  placeholder,
  error,
  helperText,
  disabled = false,
  required = false,
  icon: Icon,
  className = '',
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-neutral-textPrimary flex items-center gap-1">
          {label}
          {required && <span className="text-status-error">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-neutral-textTertiary pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={id}
          type="text"
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full min-h-[44px] px-3.5 text-sm bg-white text-neutral-textPrimary placeholder:text-neutral-textTertiary rounded-lg border transition-all outline-none
            ${Icon ? 'pl-10' : ''}
            ${error
              ? 'border-status-error focus:ring-2 focus:ring-status-error/20'
              : 'border-neutral-border focus:border-primary focus:ring-2 focus:ring-primary/20'
            }
            ${disabled ? 'bg-neutral-surfaceSecondary text-neutral-textTertiary cursor-not-allowed' : ''}
          `}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-xs text-status-error flex items-center gap-1 mt-0.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-neutral-textSecondary mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <TextInput
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      icon={Search}
      className={className}
    />
  );
}

export function Toggle({ checked, onChange, label, description, disabled = false }) {
  return (
    <label className={`flex items-center justify-between gap-3 cursor-pointer select-none ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-sm font-medium text-neutral-textPrimary">{label}</span>}
          {description && <span className="text-xs text-neutral-textSecondary">{description}</span>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          checked ? 'bg-primary' : 'bg-neutral-border'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}
