import type { PersonSearchResult } from '@/components/common/person-search';

const PERSON_KEY = 'person-current-selection';

/**
 * Persist the currently-selected person across the protected /person sub-pages
 * (information / assets / access). Mirrors the pattern used by
 * `credit-rating/report/use-report-filters.ts` so navigating between pages
 * keeps the same person selected.
 */
export function savePersonSelection(person: PersonSearchResult | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (person) window.localStorage.setItem(PERSON_KEY, JSON.stringify(person));
    else window.localStorage.removeItem(PERSON_KEY);
  } catch {}
}

export function loadPersonSelection(): PersonSearchResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PERSON_KEY);
    return raw ? (JSON.parse(raw) as PersonSearchResult) : null;
  } catch {
    return null;
  }
}
