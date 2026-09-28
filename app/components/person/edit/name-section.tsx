'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { PersonNameGrid, type PersonTranslationEntry } from './person-name-grid';

const EN_LANGUAGE_ID = 10;

interface NameSectionProps {
  translations: PersonTranslationEntry[];
  onTranslationsChange: (translations: PersonTranslationEntry[]) => void;
  disabled?: boolean;
  /** When true, lock English row so it cannot be edited/deleted (matches backend rule). */
  lockEnglishIfPresent?: boolean;
  isReadOnly?: boolean;
  /** Existing person id when editing; undefined when creating. */
  personId?: string;
}

export function NameSection({ translations, onTranslationsChange, disabled, lockEnglishIfPresent, isReadOnly = false, personId }: NameSectionProps) {
  const { t } = useTranslation();

  const englishExists = translations.some((tr) => tr.languageId === EN_LANGUAGE_ID);
  const lockedLanguageIds: number[] = lockEnglishIfPresent && englishExists
    ? [EN_LANGUAGE_ID]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">1</span>
          {t('sectionTitle', { ns: 'person-name-grid', defaultValue: 'Name, Family Name & Father Name' })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PersonNameGrid
          translations={translations}
          onChange={onTranslationsChange}
          disabled={disabled}
          lockedLanguageIds={lockedLanguageIds}
          isReadOnly={isReadOnly}
          personId={personId}
        />
        {lockedLanguageIds.includes(EN_LANGUAGE_ID) && (
          <p className="mt-2 text-xs italic text-muted-foreground">
            {t('person-form:englishNameFrozen', { defaultValue: 'English name cannot be changed after creation' })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
