'use client';

import React, { useEffect, useRef, useState } from 'react';

interface DecimalInputProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  required?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

const DECIMAL_PATTERN = /^\d*(?:[.,]\d*)?$/;

export function parseLocalizedDecimal(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized || normalized === '.') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

const formatDecimal = (value: number) => (Number.isFinite(value) ? String(value) : '0');

export const DecimalInput: React.FC<DecimalInputProps> = ({
  value,
  onValueChange,
  min,
  max,
  required,
  placeholder,
  className,
  ariaLabel,
}) => {
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
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={draft}
      required={required}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={className}
      onFocus={() => {
        editingRef.current = true;
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
};
