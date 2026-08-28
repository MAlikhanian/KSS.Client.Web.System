'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Pencil, CheckCircle, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/providers/i18n-provider';
import { formatDate, formatDateTime } from '@/lib/format-utils';

/** Language info from Common service */
interface LanguageOption {
  id: number;
  code: string;
  name: string;
  nativeName: string | null;
}

/** Map i18n code → backend language id (fallback) */
const LANG_CODE_TO_ID: Record<string, number> = { fa: 12, en: 10 };

interface TranslationEntry {
  languageId: number;
  name: string;
}

interface NameHistoryItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description?: string;
  translations?: TranslationEntry[];
  createdAt?: string;
  updatedAt?: string | null;
}

interface NameHistoryGridProps {
  nameHistory: NameHistoryItem[];
  onAdd: (data: { translations: TranslationEntry[]; startDate: string; endDate: string | null; description?: string }) => void;
  onEdit: (id: string, data: { translations: TranslationEntry[]; startDate: string; endDate: string | null; description?: string }) => void;
  onDelete: (id: string) => void;
  onDeleteTranslation: (historyId: string, languageId: number, name: string) => void;
  disabled?: boolean;
  /**
   * When true, all add/edit/delete affordances are hidden entirely (not just
   * greyed-out). Use this for view-only callers. `disabled` greys them out;
   * `readOnly` removes them from the DOM.
   */
  readOnly?: boolean;
}

/** Persian language ID — cannot be deleted, only edited */
const FA_LANGUAGE_ID = 12;

export function NameHistoryGrid({ nameHistory, onAdd, onEdit, onDelete, onDeleteTranslation, disabled, readOnly = false }: NameHistoryGridProps) {
  const { t } = useTranslation('company-information');
  const { languageCode } = useLanguage();

  // Resolve the user's display language ID
  const displayLanguageId = LANG_CODE_TO_ID[languageCode] ?? 12;
  const locale = languageCode === 'fa' ? 'fa-IR' : 'en-US';

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

  // ──────────────────────────────────────────────
  // Name Change Add/Edit Dialog state
  // ──────────────────────────────────────────────
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  // Only used in add mode: first translation
  const [formLanguageId, setFormLanguageId] = useState<number>(displayLanguageId);
  const [formNameValue, setFormNameValue] = useState('');

  const isAddMode = editingEntryId === null;

  // ──────────────────────────────────────────────
  // Translations Dialog state
  // ──────────────────────────────────────────────
  const [translationDialogOpen, setTranslationDialogOpen] = useState(false);
  const [translationEntryId, setTranslationEntryId] = useState<string | null>(null);
  // Sub-form inside translations dialog (add/edit a single translation)
  const [trEditingLangId, setTrEditingLangId] = useState<number | null>(null);
  const [trSelectedLangId, setTrSelectedLangId] = useState<number>(displayLanguageId);
  const [trNameValue, setTrNameValue] = useState('');
  const [trFormVisible, setTrFormVisible] = useState(false);

  const translationEntry = useMemo(
    () => nameHistory.find((nh) => nh.id === translationEntryId) || null,
    [nameHistory, translationEntryId],
  );

  // ──────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────
  const getDisplayName = (item: NameHistoryItem): string => {
    if (item.translations && item.translations.length > 0) {
      const tr = item.translations.find((t) => t.languageId === displayLanguageId);
      if (tr) return tr.name;
    }
    return item.name;
  };

  const getLanguageName = (langId: number): string => {
    const lang = languages.find((l) => l.id === langId);
    return lang?.nativeName || lang?.name || String(langId);
  };

  const selectedFormLang = languages.find((l) => l.id === formLanguageId);
  const isFormLangRtl = selectedFormLang?.code === 'fa' || selectedFormLang?.code === 'ar';

  const trSelectedLang = languages.find((l) => l.id === trSelectedLangId);
  const isTrLangRtl = trSelectedLang?.code === 'fa' || trSelectedLang?.code === 'ar';

  // ──────────────────────────────────────────────
  // Name Change Dialog handlers
  // ──────────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditingEntryId(null);
    setFormStartDate('');
    setFormEndDate('');
    setFormDescription('');
    setFormLanguageId(displayLanguageId);
    setFormNameValue('');
    setNameDialogOpen(true);
  };

  const handleOpenEdit = (item: NameHistoryItem) => {
    setEditingEntryId(item.id);
    setFormStartDate(item.startDate);
    setFormEndDate(item.endDate || '');
    setFormDescription(item.description || '');
    setNameDialogOpen(true);
  };

  const handleSubmitNameDialog = () => {
    if (isAddMode) {
      // Add mode: requires start date + first translation
      if (!formStartDate || !formNameValue.trim()) return;
      onAdd({
        translations: [{ languageId: formLanguageId, name: formNameValue.trim() }],
        startDate: formStartDate,
        endDate: formEndDate || null,
        description: formDescription || undefined,
      });
    } else {
      // Edit mode: update dates/description only
      if (!formStartDate) return;
      const entry = nameHistory.find((nh) => nh.id === editingEntryId);
      if (!entry) return;
      onEdit(editingEntryId!, {
        translations: entry.translations || [],
        startDate: formStartDate,
        endDate: formEndDate || null,
        description: formDescription || undefined,
      });
    }
    setNameDialogOpen(false);
  };

  const isNameFormValid = isAddMode
    ? formStartDate !== '' && formNameValue.trim() !== ''
    : formStartDate !== '';

  // ──────────────────────────────────────────────
  // Translations Dialog handlers
  // ──────────────────────────────────────────────
  const handleOpenTranslations = (item: NameHistoryItem) => {
    setTranslationEntryId(item.id);
    setTrFormVisible(false);
    setTrEditingLangId(null);
    setTrNameValue('');
    setTranslationDialogOpen(true);
  };

  // Languages not yet used for this entry
  const availableTrLanguages = useMemo(() => {
    if (!translationEntry?.translations) return languages;
    if (trEditingLangId !== null) return languages; // editing — show all
    const usedIds = new Set(translationEntry.translations.map((tr) => tr.languageId));
    return languages.filter((l) => !usedIds.has(l.id));
  }, [languages, translationEntry, trEditingLangId]);

  const handleOpenAddTranslation = () => {
    setTrEditingLangId(null);
    const defaultLangId = availableTrLanguages.find((l) => l.id === displayLanguageId)?.id
      ?? availableTrLanguages[0]?.id
      ?? displayLanguageId;
    setTrSelectedLangId(defaultLangId);
    setTrNameValue('');
    setTrFormVisible(true);
  };

  const handleOpenEditTranslation = (tr: TranslationEntry) => {
    setTrEditingLangId(tr.languageId);
    setTrSelectedLangId(tr.languageId);
    setTrNameValue(tr.name);
    setTrFormVisible(true);
  };

  const handleSubmitTranslation = () => {
    if (!translationEntry || !trNameValue.trim()) return;
    onEdit(translationEntry.id, {
      translations: [{ languageId: trSelectedLangId, name: trNameValue.trim() }],
      startDate: translationEntry.startDate,
      endDate: translationEntry.endDate,
      description: translationEntry.description,
    });
    setTrFormVisible(false);
    setTrEditingLangId(null);
    setTrNameValue('');
  };

  const handleCancelTranslationForm = () => {
    setTrFormVisible(false);
    setTrEditingLangId(null);
    setTrNameValue('');
  };

  return (
    <div className="space-y-4">
      {/* ──────────────────────────── */}
      {/* Header                      */}
      {/* ──────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {t('form.fields.names', { defaultValue: 'Names' })}
          {!readOnly && <Badge variant="secondary">{nameHistory.length}</Badge>}
        </div>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenAdd}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 ml-1" />
            {t('common.add', { defaultValue: 'Add' })}
          </Button>
        )}
      </div>

      {/* ──────────────────────────── */}
      {/* Grid / Table                */}
      {/* ──────────────────────────── */}
      {nameHistory.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {t('form.placeholders.noNameHistory', { defaultValue: 'No names recorded' })}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t('form.fields.companyName', { defaultValue: 'Name' })}
              </TableHead>
              <TableHead className="w-28">
                {t('form.fields.startDate', { defaultValue: 'Start Date' })}
              </TableHead>
              <TableHead className="w-28">
                {t('form.fields.endDate', { defaultValue: 'End Date' })}
              </TableHead>
              <TableHead className="w-20">
                {t('form.fields.status', { defaultValue: 'Status' })}
              </TableHead>
              <TableHead>
                {t('form.fields.description', { defaultValue: 'Description' })}
              </TableHead>
              <TableHead className="w-32">
                {t('common:createdAt', { defaultValue: 'Created At' })}
              </TableHead>
              <TableHead className="w-32">
                {t('common:updatedAt', { defaultValue: 'Last Modified' })}
              </TableHead>
              {!readOnly && <TableHead className="w-28">{t('common:actions', { defaultValue: 'Actions' })}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {nameHistory.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{getDisplayName(item)}</TableCell>
                <TableCell className="text-sm">{formatDate(item.startDate, locale)}</TableCell>
                <TableCell className="text-sm">{formatDate(item.endDate, locale)}</TableCell>
                <TableCell>
                  {item.isCurrent && (
                    <Badge variant="primary" className="text-xs px-1.5">
                      <CheckCircle className="h-3 w-3 ml-1" />
                      {t('form.fields.current', { defaultValue: 'Current' })}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                  {item.description || '—'}
                </TableCell>
                <TableCell className="text-sm" style={{ unicodeBidi: 'plaintext' }}>{formatDateTime(item.createdAt, locale)}</TableCell>
                <TableCell className="text-sm" style={{ unicodeBidi: 'plaintext' }}>{formatDateTime(item.updatedAt, locale)}</TableCell>
                {!readOnly && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenEdit(item)}
                        disabled={disabled}
                        title={t('common.edit', { defaultValue: 'Edit' })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenTranslations(item)}
                        disabled={disabled}
                        title={t('form.fields.translations', { defaultValue: 'Translations' })}
                      >
                        <Languages className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => onDelete(item.id)}
                        disabled={disabled}
                        title={t('common.delete', { defaultValue: 'Delete' })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* ──────────────────────────────────────── */}
      {/* Dialog: Add / Edit Name Change           */}
      {/* ──────────────────────────────────────── */}
      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent className="max-w-lg border-white! dark:border-white!">
          <DialogHeader>
            <DialogTitle>
              {isAddMode
                ? t('form.addNameHistory', { defaultValue: 'Add New Name Change' })
                : t('form.editNameHistory', { defaultValue: 'Edit Name Change' })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Date range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {t('form.fields.startDate', { defaultValue: 'Start Date' })}
                  <span className="text-destructive mr-1">*</span>
                </Label>
                <DatePickerComponent
                  value={formStartDate}
                  onChange={setFormStartDate}
                  placeholder={t('form.placeholders.startDate', { defaultValue: 'Start Date' })}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {t('form.fields.endDate', { defaultValue: 'End Date' })}
                </Label>
                <DatePickerComponent
                  value={formEndDate}
                  onChange={setFormEndDate}
                  placeholder={t('form.placeholders.endDate', { defaultValue: 'Empty = current name' })}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>{t('form.fields.description', { defaultValue: 'Description' })}</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t('form.placeholders.nameChangeDescription', { defaultValue: 'Reason for name change...' })}
                rows={2}
              />
            </div>

            {/* First translation — only in Add mode */}
            {isAddMode && (
              <>
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">
                    {t('form.fields.firstTranslation', { defaultValue: 'Company Name (first translation)' })}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {t('form.fields.language', { defaultValue: 'Language' })}
                      <span className="text-destructive mr-1">*</span>
                    </Label>
                    <Select
                      value={formLanguageId.toString()}
                      onValueChange={(v) => setFormLanguageId(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang.id} value={lang.id.toString()}>
                            {lang.nativeName || lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>
                      {t('form.fields.companyName', { defaultValue: 'Company Name' })}
                      <span className="text-destructive mr-1">*</span>
                    </Label>
                    <Input
                      type="text"
                      dir={isFormLangRtl ? 'rtl' : 'ltr'}
                      value={formNameValue}
                      onChange={(e) => setFormNameValue(e.target.value)}
                      placeholder={
                        selectedFormLang
                          ? `${t('form.placeholders.companyNameIn', { defaultValue: 'Company name in' })} ${selectedFormLang.nativeName || selectedFormLang.name}`
                          : ''
                      }
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNameDialogOpen(false)}>
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              type="button"
              onClick={handleSubmitNameDialog}
              disabled={!isNameFormValid}
            >
              {isAddMode
                ? t('common.add', { defaultValue: 'Add' })
                : t('common.save', { defaultValue: 'Save' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────────────────────── */}
      {/* Dialog: Translations                     */}
      {/* ──────────────────────────────────────── */}
      <Dialog open={translationDialogOpen} onOpenChange={setTranslationDialogOpen}>
        <DialogContent className="max-w-xl border-white! dark:border-white!">
          <DialogHeader>
            <DialogTitle>
              {t('form.fields.translations', { defaultValue: 'Translations' })}
              {translationEntry && (
                <span className="text-muted-foreground font-normal text-sm mr-2">
                  — {getDisplayName(translationEntry)}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Translations table */}
            {(!translationEntry?.translations || translationEntry.translations.length === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-3">
                {t('form.placeholders.noTranslations', { defaultValue: 'No translations recorded' })}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">
                      {t('form.fields.language', { defaultValue: 'Language' })}
                    </TableHead>
                    <TableHead>
                      {t('form.fields.companyName', { defaultValue: 'Company Name' })}
                    </TableHead>
                    <TableHead className="w-20">{t('common:actions', { defaultValue: 'Actions' })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {translationEntry.translations.map((tr) => (
                    <TableRow key={tr.languageId}>
                      <TableCell>
                        <Badge variant="outline" className="text-xs px-1.5">
                          {getLanguageName(tr.languageId)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{tr.name}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenEditTranslation(tr)}
                            disabled={disabled}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {tr.languageId !== FA_LANGUAGE_ID && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => onDeleteTranslation(translationEntry!.id, tr.languageId, tr.name)}
                              disabled={disabled}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Add/Edit translation form */}
            {trFormVisible ? (
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <p className="text-sm font-medium">
                  {trEditingLangId !== null
                    ? t('form.editTranslation', { defaultValue: 'Edit Translation' })
                    : t('form.addTranslation', { defaultValue: 'Add Translation' })}
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {t('form.fields.language', { defaultValue: 'Language' })}
                      <span className="text-destructive mr-1">*</span>
                    </Label>
                    <Select
                      value={trSelectedLangId.toString()}
                      onValueChange={(v) => {
                        setTrSelectedLangId(parseInt(v));
                        setTrNameValue('');
                      }}
                      disabled={trEditingLangId !== null}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(trEditingLangId !== null ? languages : availableTrLanguages).map((lang) => (
                          <SelectItem key={lang.id} value={lang.id.toString()}>
                            {lang.nativeName || lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>
                      {t('form.fields.companyName', { defaultValue: 'Company Name' })}
                      <span className="text-destructive mr-1">*</span>
                    </Label>
                    <Input
                      type="text"
                      dir={isTrLangRtl ? 'rtl' : 'ltr'}
                      value={trNameValue}
                      onChange={(e) => setTrNameValue(e.target.value)}
                      placeholder={
                        trSelectedLang
                          ? `${t('form.placeholders.companyNameIn', { defaultValue: 'Company name in' })} ${trSelectedLang.nativeName || trSelectedLang.name}`
                          : ''
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleCancelTranslationForm}>
                    {t('common.cancel', { defaultValue: 'Cancel' })}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSubmitTranslation}
                    disabled={!trNameValue.trim()}
                  >
                    {trEditingLangId !== null
                      ? t('common.save', { defaultValue: 'Save' })
                      : t('common.add', { defaultValue: 'Add' })}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAddTranslation}
                  disabled={disabled || availableTrLanguages.length === 0}
                >
                  <Plus className="h-4 w-4 ml-1" />
                  {t('form.addTranslation', { defaultValue: 'Add Translation' })}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
