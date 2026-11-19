import React, { useState } from 'react'

/** Shared Input component using design tokens.
 * - 44px tap target min-height
 * - Visible focus-visible outline
 * - Proper label handling
 */
export interface InputProps {
  /** Input label text */
  label: string
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'number' | 'date'
  /** Initial value */
  defaultValue?: string
  /** Controlled value */
  value?: string
  /** On change handler */
  onChange?: (value: string) => void
  /** Whether the input is required */
  required?: boolean
  /** Whether the input is disabled */
  disabled?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Additional className */
  className?: string
}

/** Input - a shared component using design tokens.
 * - 44px tap target min-height
 * - Visible focus-visible outline
 * - Label above input layout
 * - Required/styling via classes
 */
export function Input({
  label,
  type = 'text',
  defaultValue,
  value,
  onChange,
  required,
  disabled,
  placeholder,
  className
}: InputProps) {
  const [valueInternal, setValueInternal] = useState(defaultValue || '')
  const realValue = value !== undefined ? value : valueInternal

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value
    setValueInternal(val)
    onChange?.(val)
  }

  return (
    <div className={`input ${className}`}>
      <label className="input__label" htmlFor={`input-${label}`}>
        {label}
      </label>
      <input
        id={`input-${label}`}
        type={type}
        placeholder={placeholder}
        value={realValue}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        className="input__field"
      />
    </div>
  )
}
