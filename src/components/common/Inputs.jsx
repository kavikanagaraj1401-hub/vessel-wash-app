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
    <div className={`flex flex-col gap-1.5 font-sans ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-[#111214] dark:text-[#F5F5F7] flex items-center gap-1">
          {label}
          {required && <span className="text-[#111214] dark:text-[#F5F5F7]">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-[#8E8E93] pointer-events-none">
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
          className={`w-full min-h-[40px] px-3 text-xs bg-[#F5F5F7] dark:bg-[#1C1D21] text-[#111214] dark:text-[#F5F5F7] placeholder-[#8E8E93] rounded-xl border transition-all outline-none
            ${Icon ? 'pl-9' : ''}
            ${error
              ? 'border-black dark:border-white focus:ring-1 focus:ring-black dark:focus:ring-white'
              : 'border-black/[0.07] dark:border-white/[0.08] focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-xs text-[#111214] dark:text-[#F5F5F7] flex items-center gap-1 mt-0.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">{helperText}</p>
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
    <label className={`flex items-center justify-between gap-3 cursor-pointer select-none font-sans ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-sm font-semibold text-[#111214] dark:text-[#F5F5F7]">{label}</span>}
          {description && <span className="text-xs text-[#6E6E73] dark:text-[#8E8E93]">{description}</span>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white ${
          checked ? 'bg-[#111214] dark:bg-white' : 'bg-black/15 dark:bg-white/15'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-[#0B0C0E] shadow-sm ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}
