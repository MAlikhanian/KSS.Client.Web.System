'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime, translateApiError } from '@/app/components/person/components/format-utils';
import { toast } from 'sonner';
import { RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';

/** Language info from Common service */
interface LanguageOption {
  id: number;
  code: string;
  name: string;
  nativeName: string | null;
}

export interface PersonTranslationEntry {
  languageId: number;
  firstName: string;
  lastName: string;
  fatherName?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PersonNameGridProps {
  translations: PersonTranslationEntry[];
  onChange: (translations: PersonTranslationEntry[]) => void;
  disabled?: boolean;
  /** Languages whose existing rows can no longer be edited/removed (e.g. English after first save). */
  lockedLanguageIds?: number[];
  isReadOnly?: boolean;
  /** When set, inner Save / Delete persists immediately via PUT /api/person/translation.
   *  When undefined (new-person flow before first save), changes are buffered locally
   *  and the outer form's main Save creates the person + all translations in one call. */
  personId?: string;
}

/** Persian language ID — cannot be deleted, only edited */
const FA_LANGUAGE_ID = 12;

export function PersonNameGrid({ translations, onChange, disabled, lockedLanguageIds = [], isReadOnly = false, personId }: PersonNameGridProps) {
  const lockedSet = new Set<number>(lockedLanguageIds);
  const { t, i18n } = useTranslation('person-name-grid');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    toast.custom(
      () => (
        <Alert variant="mono" icon={type === 'success' ? 'success' : 'destructive'}>
          <AlertIcon>
            {type === 'success' ? <RiCheckboxCircleFill /> : <RiErrorWarningFill />}
          </AlertIcon>
          <AlertTitle>{message}</AlertTitle>
        </Alert>
      ),
      { position: 'top-center' },
    );
  }, []);

  // Languages loaded from Common service
  const [languages, setLanguages] = useState<LanguageOption[]>([]);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const res = await fetch('/api/common/languages');
        if (res.ok) {
          const data: LanguageOption[] = await res.json();
          setLanguages(data);
        }
      } catch (err) {
        console.error('Error loading languages:', err);
      }
    };
    fetchLanguages();
  }, []);

  // ── Sub-form state ──
  const [formVisible, setFormVisible] = useState(false);
  const [editingLangId, setEditingLangId] = useState<number | null>(null);
  const [selectedLangId, setSelectedLangId] = useState<number>(FA_LANGUAGE_ID);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [fatherName, setFatherName] = useState('');

  // ── Helpers ──
  const getLanguageName = (langId: number): string => {
    const lang = languages.find((l) => l.id === langId);
    return lang?.nativeName || lang?.name || String(langId);
  };

  const selectedLang = languages.find((l) => l.id === selectedLangId);
  const isLangRtl = selectedLang?.code === 'fa' || selectedLang?.code === 'ar';

  // Languages not yet used
  const availableLanguages = useMemo(() => {
    if (editingLangId !== null) return languages;
    const usedIds = new Set(translations.map((tr) => tr.languageId));
    return languages.filter((l) => !usedIds.has(l.id));
  }, [languages, translations, editingLangId]);

  // ── Handlers ──
  const handleOpenAdd = () => {
    setEditingLangId(null);
    const defaultLangId = availableLanguages.find((l) => l.id === FA_LANGUAGE_ID)?.id
      ?? availableLanguages[0]?.id
      ?? FA_LANGUAGE_ID;
    setSelectedLangId(defaultLangId);
    setFirstName('');
    setLastName('');
    setFatherName('');
    setFormVisible(true);
  };

  const handleOpenEdit = (tr: PersonTranslationEntry) => {
    setEditingLangId(tr.languageId);
    setSelectedLangId(tr.languageId);
    setFirstName(tr.firstName);
    setLastName(tr.lastName);
    setFatherName(tr.fatherName || '');
    setFormVisible(true);
  };

  const handleCancel = () => {
    setFormVisible(false);
    setEditingLangId(null);
    setFirstName('');
    setLastName('');
    setFatherName('');
  };

  const persistTranslations = useCallback(
    async (next: PersonTranslationEntry[]): Promise<boolean> => {
      // No personId = creating a brand-new person; buffer locally and let the
      // outer form's main Save handle the initial create with the translations
      // array. The earlier flow (full-replace via /api/person POST) still owns
      // that path.
      if (!personId) return true;

      try {
        const res = await fetch('/api/person/translation', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personId,
            translations: next.map((tr) => ({
              languageId: tr.languageId,
              firstName: tr.firstName,
              lastName: tr.lastName,
              fatherName: tr.fatherName ?? null,
            })),
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Save failed');
        }
        return true;
      } catch (e) {
        const msg = e instanceof Error ? translateApiError(e.message, t) : t('saveFailed', { defaultValue: 'Save failed' });
        showToast(msg, 'error');
        return false;
      }
    },
    [personId, t, showToast],
  );

  const handleSubmit = async () => {
    if (!firstName.trim() && !lastName.trim()) return;

    const entry: PersonTranslationEntry = {
      languageId: selectedLangId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fatherName: fatherName.trim() || undefined,
    };

    const next = editingLangId !== null
      ? translations.map((tr) => tr.languageId === editingLangId ? entry : tr)
      : [...translations, entry];

    // Persist to backend first (no-op for new-person buffer mode). If the API
    // rejects, abort — don't update local state with values the DB never accepted.
    const persisted = await persistTranslations(next);
    if (!persisted) return;

    onChange(next);
    showToast(
      editingLangId !== null
        ? t('updated', { defaultValue: 'Name updated' })
        : t('added', { defaultValue: 'Name added' }),
      'success',
    );
    handleCancel();
  };

  const handleDelete = async (langId: number) => {
    const next = translations.filter((tr) => tr.languageId !== langId);
    const persisted = await persistTranslations(next);
    if (!persisted) return;
    onChange(next);
    showToast(t('deleted', { defaultValue: 'Name deleted' }), 'error');
  };

  const isFormValid = firstName.trim() !== '' && lastName.trim() !== '' && fatherName.trim() !== '';

  return (
    <div className="space-y-4">
      {/* Translations table */}
      {translations.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">
          {t('noItems', { defaultValue: 'No names registered. Add at least one language.' })}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t('language', { defaultValue: 'Language' })}
              </TableHead>
              <TableHead>
                {t('firstName', { defaultValue: 'First Name' })}
              </TableHead>
              <TableHead>
                {t('lastName', { defaultValue: 'Last Name' })}
              </TableHead>
              <TableHead>
                {t('fatherName', { defaultValue: 'Father Name' })}
              </TableHead>
              <TableHead>{t('common:createdAt', { defaultValue: 'Created At' })}</TableHead>
              <TableHead>{t('common:updatedAt', { defaultValue: 'Last Modified' })}</TableHead>
              <TableHead className="w-20">{t('common:actions', { defaultValue: 'Actions' })}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {translations.map((tr) => {
              const rowLocked = lockedSet.has(tr.languageId);
              return (
              <TableRow key={tr.languageId}>
                <TableCell>
                  <Badge variant="outline" className="text-xs px-1.5">
                    {getLanguageName(tr.languageId)}
                  </Badge>
                </TableCell>
                <TableCell>{tr.firstName}</TableCell>
                <TableCell>{tr.lastName}</TableCell>
                <TableCell>{tr.fatherName || '—'}</TableCell>
                <TableCell style={{ unicodeBidi: "plaintext" }}>{formatDateTime(tr.createdAt, locale)}</TableCell>
                <TableCell style={{ unicodeBidi: "plaintext" }}>{formatDateTime(tr.updatedAt, locale)}</TableCell>
                <TableCell>
                  {!isReadOnly && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenEdit(tr)}
                        disabled={disabled || rowLocked}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {tr.languageId !== FA_LANGUAGE_ID && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(tr.languageId)}
                          disabled={disabled || rowLocked}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Add/Edit translation form */}
      {formVisible ? (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          <p className="text-sm font-medium">
            {editingLangId !== null
              ? t('editDialog', { defaultValue: 'Edit Name' })
              : t('addDialog', { defaultValue: 'Add Language' })}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>
                {t('language', { defaultValue: 'Language' })}
                <span className="text-destructive mr-1">*</span>
              </Label>
              <Select
                value={selectedLangId.toString()}
                onValueChange={(v) => {
                  setSelectedLangId(parseInt(v));
                }}
                disabled={editingLangId !== null}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(editingLangId !== null ? languages : availableLanguages).map((lang) => (
                    <SelectItem key={lang.id} value={lang.id.toString()}>
                      {lang.nativeName || lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {t('firstName', { defaultValue: 'First Name' })}
                <span className="text-destructive mr-1">*</span>
              </Label>
              <Input
                type="text"
                dir={isLangRtl ? 'rtl' : 'ltr'}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={selectedLang ? `${t('nameIn', { defaultValue: 'First name in' })} ${selectedLang.nativeName || selectedLang.name}` : ''}
              />
            </div>
            <div className="space-y-2">
              <Label>
                {t('lastName', { defaultValue: 'Last Name' })}
                <span className="text-destructive mr-1">*</span>
              </Label>
              <Input
                type="text"
                dir={isLangRtl ? 'rtl' : 'ltr'}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={selectedLang ? `${t('lastNameIn', { defaultValue: 'Last name in' })} ${selectedLang.nativeName || selectedLang.name}` : ''}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('fatherName', { defaultValue: 'Father Name' })} <span className="text-destructive">*</span></Label>
              <Input
                type="text"
                dir={isLangRtl ? 'rtl' : 'ltr'}
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                placeholder={selectedLang ? `${t('fatherNameIn', { defaultValue: 'Father name in' })} ${selectedLang.nativeName || selectedLang.name}` : ''}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
              {t('common:cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={!isFormValid}
            >
              {t('common:save', { defaultValue: 'Save' })}
            </Button>
          </div>
        </div>
      ) : (
        !isReadOnly && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenAdd}
              disabled={disabled || availableLanguages.length === 0}
            >
              <Plus className="h-4 w-4 ml-1" />
              {t('addDialog', { defaultValue: 'Add Language' })}
            </Button>
          </div>
        )
      )}
    </div>
  );
}
