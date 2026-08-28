'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { PersonSearch, type PersonSearchResult } from '@/components/common/person-search';

const LANG_CODE_TO_ID: Record<string, number> = { fa: 12, en: 10 };

interface PersonSelectionCardProps {
  value: PersonSearchResult | null;
  onValueChange: (value: PersonSearchResult | null) => void;
  isEditMode?: boolean;
  /** Endpoint override forwarded to PersonSearch. */
  apiUrl?: string;
}

export function PersonSelectionCard({
  value,
  onValueChange,
  isEditMode = false,
  apiUrl,
}: PersonSelectionCardProps) {
  const { t, i18n } = useTranslation('person-access');
  const uiLangId = LANG_CODE_TO_ID[i18n.language] ?? 12;

  const personName = (() => {
    if (!value) return '';
    const tr =
      value.translations.find((x) => x.languageId === uiLangId) ||
      value.translations[0];
    const name = tr ? `${tr.firstName} ${tr.lastName}`.trim() : '';
    return name || value.nationalId || '';
  })();

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>
          {t('selectPerson.title', { defaultValue: 'Select Person' })}
        </CardTitle>
        <CardDescription className="mx-auto max-w-2xl">
          {t('selectPerson.description', {
            defaultValue: 'Select a person from the list to manage their access.',
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PersonSearch
          onSelect={onValueChange}
          value={value}
          label={t('selectPerson.label', { defaultValue: 'Person' })}
          apiUrl={apiUrl}
        />
        {isEditMode && personName && (
          <div className="mt-3 p-3 bg-blue-200 border border-blue-200 rounded-md dark:bg-blue-950 dark:border-blue-800">
            <p className="text-sm text-card-foreground">
              <span className="font-semibold">
                {t('selectPerson.editMode', { defaultValue: 'Edit mode:' })}
              </span>{' '}
              {personName}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
