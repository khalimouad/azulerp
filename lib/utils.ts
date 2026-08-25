import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency with French/Moroccan spacing and 2 decimals
 */
export function formatCurrency(amount: number | undefined | null, showCurrency = true): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return showCurrency ? '0,00 DH' : '0,00';
  }
  const formatted = new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return showCurrency ? `${formatted} DH` : formatted;
}

/**
 * Format dates into DD/MM/YYYY
 */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Compare document numbers by their numeric sequence, newest/largest first.
 * Works with BL/BR numbers (2637/26) and invoice numbers (FA001481/26).
 */
export function compareDocumentNumbersDesc(a?: string | null, b?: string | null): number {
  const parse = (value?: string | null) => {
    const match = String(value || '').match(/(\d+)(?:\s*\/\s*(\d+))?\s*$/);
    return {
      sequence: match ? Number(match[1]) : Number.NEGATIVE_INFINITY,
      year: match?.[2] ? Number(match[2]) : Number.NEGATIVE_INFINITY,
    };
  };

  const left = parse(a);
  const right = parse(b);
  return right.sequence - left.sequence || right.year - left.year;
}

/**
 * Number to French words for Invoice footer ("Arrêté la présente facture à la somme de...")
 */
export function numberToFrenchWords(n: number): string {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

  if (n === 0) return 'zéro dirhams';

  const integerPart = Math.floor(n);
  const decimalPart = Math.round((n - integerPart) * 100);

  function convertGroup(num: number): string {
    let result = '';
    const hundreds = Math.floor(num / 100);
    const rest = num % 100;

    if (hundreds > 0) {
      if (hundreds === 1) {
        result += 'cent ';
      } else {
        result += units[hundreds] + ' cent ';
      }
    }

    if (rest > 0) {
      if (rest < 20) {
        result += units[rest] + ' ';
      } else {
        const ten = Math.floor(rest / 10);
        const unit = rest % 10;
        if (ten === 7) {
          result += 'soixante-' + (unit === 1 ? 'et-onze ' : units[10 + unit] + ' ');
        } else if (ten === 9) {
          result += 'quatre-vingt-' + units[10 + unit] + ' ';
        } else {
          result += tens[ten] + (unit === 1 ? '-et-un ' : (unit > 0 ? '-' + units[unit] + ' ' : ' '));
        }
      }
    }

    return result.trim();
  }

  let words = '';
  const millions = Math.floor(integerPart / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const remainder = integerPart % 1000;

  if (millions > 0) {
    words += (millions === 1 ? 'un million ' : convertGroup(millions) + ' millions ');
  }

  if (thousands > 0) {
    words += (thousands === 1 ? 'mille ' : convertGroup(thousands) + ' mille ');
  }

  if (remainder > 0) {
    words += convertGroup(remainder) + ' ';
  }

  words = words.trim() + ' dirhams';

  if (decimalPart > 0) {
    words += ' et ' + convertGroup(decimalPart) + ' centimes';
  }

  // Capitalize first letter
  return words.charAt(0).toUpperCase() + words.slice(1);
}
