'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

export interface DecimalInputProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  required?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  selectOnFocus?: boolean;
  onEnter?: () => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

const DECIMAL_PATTERN = /^\d*(?:[.,]\d*)?$/;

export function parseLocalizedDecimal(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized || normalized === '.') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

const formatDecimal = (value: number) => (Number.isFinite(value) ? String(value) : '0');

export const DecimalInput = forwardRef<HTMLInputElement, DecimalInputProps>(
  (
    {
      value,
      onValueChange,
      min,
      max,
      required,
      placeholder,
      className,
      ariaLabel,
      selectOnFocus = true,
      onEnter,
      onFocus,
      onKeyDown,
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const [draft, setDraft] = useState(() => formatDecimal(value));
    const editingRef = useRef(false);

    useEffect(() => {
      if (!editingRef.current) setDraft(formatDecimal(value));
    }, [value]);

    const clamp = (nextValue: number) => {
      let result = nextValue;
      if (min !== undefined) result = Math.max(min, result);
      if (max !== undefined) result = Math.min(max, result);
      return result;
    };

    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={draft}
        required={required}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={className}
        onFocus={(event) => {
          editingRef.current = true;
          if (selectOnFocus) {
            // Highlight text so typing immediately replaces initial '1'
            event.target.select();
          }
          onFocus?.(event);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            if (onEnter) {
              onEnter();
            } else {
              // Trigger form validation/submit on Enter
              (event.target as HTMLInputElement).form?.requestSubmit?.();
            }
          }
          onKeyDown?.(event);
        }}
        onChange={(event) => {
          const nextDraft = event.target.value.replace(/\s/g, '');
          if (!DECIMAL_PATTERN.test(nextDraft)) return;
          setDraft(nextDraft);
          const parsed = parseLocalizedDecimal(nextDraft);
          if (parsed !== null) onValueChange(clamp(parsed));
        }}
        onBlur={() => {
          editingRef.current = false;
          const parsed = parseLocalizedDecimal(draft);
          const committed = clamp(parsed ?? min ?? 0);
          setDraft(formatDecimal(committed));
          onValueChange(committed);
        }}
      />
    );
  }
);

DecimalInput.displayName = 'DecimalInput';
