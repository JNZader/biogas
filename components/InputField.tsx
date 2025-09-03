import React from 'react';

interface InputFieldProps {
  label: string;
  id: string;
  type: string;
  unit?: string;
  placeholder?: string;
  defaultValue?: string | number;
  options?: string[]; // for select
  rows?: number; // for textarea
  name?: string;
  required?: boolean;
  // Add value and onChange for controlled components
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

const InputField: React.FC<InputFieldProps> = ({ label, id, type, unit, placeholder, defaultValue, options, rows, name, required, value, onChange }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-text-secondary">{label}</label>
    <div className="mt-1 flex rounded-md shadow-sm">
      {type === 'select' ? (
        <select
          name={name || id}
          id={id}
          value={value as string}
          onChange={onChange}
          defaultValue={defaultValue as string}
          required={required}
          className="block w-full flex-1 rounded-md border border-border bg-surface focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
        >
          {options?.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          name={name || id}
          id={id}
          rows={rows || 3}
          required={required}
          className="block w-full flex-1 rounded-md border border-border bg-surface focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
          placeholder={placeholder}
          value={value as string}
          onChange={onChange}
          defaultValue={defaultValue as string}
        />
      ) : (
        <input
          type={type}
          name={name || id}
          id={id}
          required={required}
          className={`block w-full flex-1 border border-border bg-surface focus:border-primary focus:ring-primary sm:text-sm px-3 py-2 ${unit ? 'rounded-none rounded-l-md border-r-0' : 'rounded-md'}`}
          placeholder={placeholder || "0.00"}
          value={value}
          onChange={onChange}
          defaultValue={defaultValue}
        />
      )}
      {unit && (
        <span className="inline-flex items-center rounded-r-md border border-l-0 border-border bg-background px-3 text-sm text-text-secondary">{unit}</span>
      )}
    </div>
  </div>
);

export default InputField;