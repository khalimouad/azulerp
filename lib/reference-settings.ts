export interface ReferenceSettings { cities: string[]; banks: string[]; }
export const DEFAULT_REFERENCE_SETTINGS: ReferenceSettings = {
  cities: ['Marrakech', 'Casablanca', 'Rabat', 'Agadir', 'Tanger', 'Fès', 'Essaouira', 'El Jadida', 'Mohammedia', 'Ouarzazate', 'Ben Guerir', 'Sidi Bou Othmane'],
  banks: ['Attijariwafa Bank', 'Banque Populaire', 'Bank of Africa', 'BMCI', 'CIH Bank', 'Crédit du Maroc', 'Crédit Agricole du Maroc', 'Société Générale Maroc', 'CFG Bank'],
};
const KEY = 'verdeorto.reference-settings.v1';
export function getReferenceSettings(): ReferenceSettings {
  if (typeof window === 'undefined') return DEFAULT_REFERENCE_SETTINGS;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { cities: Array.isArray(saved.cities) ? saved.cities : DEFAULT_REFERENCE_SETTINGS.cities, banks: Array.isArray(saved.banks) ? saved.banks : DEFAULT_REFERENCE_SETTINGS.banks };
  } catch { return DEFAULT_REFERENCE_SETTINGS; }
}
export function saveReferenceSettings(settings: ReferenceSettings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event('verdeorto-reference-settings'));
}
