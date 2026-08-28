'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import type { PersonSearchResult } from '@/components/common/person-search';

const PERSON_SELECTION_KEY = 'person-current-selection';
const LANG_CODE_TO_ID: Record<string, number> = { fa: 12, en: 10 };

function loadStoredPerson(): PersonSearchResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PERSON_SELECTION_KEY);
    return raw ? (JSON.parse(raw) as PersonSearchResult) : null;
  } catch {
    return null;
  }
}

function saveStoredPerson(person: PersonSearchResult | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (person) window.localStorage.setItem(PERSON_SELECTION_KEY, JSON.stringify(person));
    else window.localStorage.removeItem(PERSON_SELECTION_KEY);
  } catch {}
}

interface PersonContextType {
  selectedPerson: PersonSearchResult | null;
  setSelectedPerson: (person: PersonSearchResult | null) => void;
  selectedPersonId: string;
  selectedPersonName: string;
  isEditMode: boolean;
  clearSelection: () => void;
}

const PersonContext = createContext<PersonContextType | undefined>(undefined);

export function PersonProvider({ children }: { children: ReactNode }) {
  const [selectedPerson, setSelectedPersonState] = useState<PersonSearchResult | null>(null);

  // Hydrate from localStorage AFTER mount — useState's lazy initializer
  // can't read window during SSR.
  useEffect(() => {
    const stored = loadStoredPerson();
    if (stored) {
      setSelectedPersonState(stored);
    }
  }, []);

  const setSelectedPerson = useCallback((person: PersonSearchResult | null) => {
    setSelectedPersonState(person);
    saveStoredPerson(person);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPerson(null);
  }, [setSelectedPerson]);

  // Pick best-available name (fa preferred for default, fall back to first translation).
  const selectedPersonName = (() => {
    if (!selectedPerson) return '';
    const lang =
      typeof document !== 'undefined' && document.documentElement.lang
        ? document.documentElement.lang
        : 'fa';
    const langId = LANG_CODE_TO_ID[lang] ?? 12;
    const tr =
      selectedPerson.translations.find((x) => x.languageId === langId) ||
      selectedPerson.translations[0];
    const name = tr ? `${tr.firstName} ${tr.lastName}`.trim() : '';
    return name || selectedPerson.nationalId || '';
  })();

  const selectedPersonId = selectedPerson?.id || '';
  const isEditMode = !!selectedPersonId;

  return (
    <PersonContext.Provider
      value={{
        selectedPerson,
        setSelectedPerson,
        selectedPersonId,
        selectedPersonName,
        isEditMode,
        clearSelection,
      }}
    >
      {children}
    </PersonContext.Provider>
  );
}

export function usePersonContext() {
  const context = useContext(PersonContext);
  if (context === undefined) {
    throw new Error('usePersonContext must be used within a PersonProvider');
  }
  return context;
}
