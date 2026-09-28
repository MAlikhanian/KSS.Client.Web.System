'use client';

import { Fragment, useState } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  Building2,
  User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { PersonSearch, type PersonSearchResult } from '@/components/common/person-search';
import { CompanySelect } from '@/components/common/company-select';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDate, formatDateTime } from '@/lib/format-utils';

export interface StakeholderHistoryItem {
  id: string;
  ownershipPercentage: number;
  shareCount: number;
  boardRepresentativePersonId: string | null;
  /** Backend-resolved board-representative display name. */
  boardRepresentativeName?: string | null;
  registrationDate: string;
  effectiveDate: string;
  endDate: string | null;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface StakeholderItem {
  id: string;
  companyId: string;
  relatedPartyType: number; // 1=Company, 2=Person
  relatedPartyId: string;
  /** Backend-resolved related-party display name (company or person). */
  relatedPartyName?: string;
  stakeholderTypeId: number;
  stakeholderTypeName: string;
  current: StakeholderHistoryItem | null;
  history: StakeholderHistoryItem[];
}

export interface StakeholderUpsertPayload {
  relatedPartyType: number;
  relatedPartyId: string;
  stakeholderTypeId: number;
  ownershipPercentage: number;
  shareCount: number;
  boardRepresentativePersonId: string | null;
  registrationDate: string;
  effectiveDate: string;
}

interface StakeholdersGridProps {
  stakeholders: StakeholderItem[];
  onAdd: (data: StakeholderUpsertPayload) => void;
  onEdit: (id: string, data: StakeholderUpsertPayload) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

// Matches dbo.StakeholderType (8 system rows). Translated via i18n keys.
const STAKEHOLDER_TYPES: { id: number; key: string; defaultEn: string }[] = [
  { id: 1, key: 'stakeholderTypes.parent', defaultEn: 'Parent Company' },
  { id: 2, key: 'stakeholderTypes.subsidiary', defaultEn: 'Subsidiary' },
  { id: 3, key: 'stakeholderTypes.investor', defaultEn: 'Investor' },
  { id: 4, key: 'stakeholderTypes.partner', defaultEn: 'Partner' },
  { id: 5, key: 'stakeholderTypes.shareholder', defaultEn: 'Shareholder' },
  { id: 6, key: 'stakeholderTypes.franchisor', defaultEn: 'Franchisor' },
  { id: 7, key: 'stakeholderTypes.franchisee', defaultEn: 'Franchisee' },
  { id: 8, key: 'stakeholderTypes.other', defaultEn: 'Other' },
];

const PERSIAN_LANGUAGE_ID = 12;

interface FormState {
  stakeholderTypeId: number;
  relatedPartyType: 1 | 2;
  relatedPartyPerson: PersonSearchResult | null;
  relatedPartyCompanyId: string;
  ownershipPercentage: string;
  shareCount: string;
  registrationDate: string;
  effectiveDate: string;
  boardRepresentative: PersonSearchResult | null;
}

const emptyForm: FormState = {
  stakeholderTypeId: 5, // default to "Shareholder" — most common use case
  relatedPartyType: 2,
  relatedPartyPerson: null,
  relatedPartyCompanyId: '',
  ownershipPercentage: '',
  shareCount: '',
  registrationDate: '',
  effectiveDate: '',
  boardRepresentative: null,
};

export function StakeholdersGrid({
  stakeholders,
  onAdd,
  onEdit,
  onDelete,
  disabled,
  readOnly = false,
}: StakeholdersGridProps) {
  const { t, i18n } = useTranslation('company-information');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<FormState>(emptyForm);

  const stakeholderTypeName = (id: number) => {
    const def = STAKEHOLDER_TYPES.find((s) => s.id === id);
    return def ? t(def.key, { defaultValue: def.defaultEn }) : String(id);
  };

  // Names are resolved server-side and arrive on each stakeholder/history row
  // (relatedPartyName / boardRepresentativeName). The frontend only displays
  // them — no person/company directory join here. The i18n fallback only shows
  // if the backend couldn't resolve a name (e.g. Person service unavailable).
  const relatedPartyName = (item: StakeholderItem) => {
    if (item.relatedPartyName) return item.relatedPartyName;
    return item.relatedPartyType === 1
      ? t('form.placeholders.unknownCompany', { defaultValue: 'Unknown company' })
      : t('form.placeholders.unknownPerson', { defaultValue: 'Unknown person' });
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: StakeholderItem) => {
    const current = item.current;
    // Seed the pickers from the backend-resolved names (no directory lookup).
    // Opening a picker still loads the full searchable list to change the value.
    const boardRep: PersonSearchResult | null = current?.boardRepresentativePersonId
      ? {
          id: current.boardRepresentativePersonId,
          nationalId: '',
          translations: [{ languageId: PERSIAN_LANGUAGE_ID, firstName: current.boardRepresentativeName ?? '', lastName: '' }],
        }
      : null;
    const relatedPerson: PersonSearchResult | null = item.relatedPartyType === 2
      ? {
          id: item.relatedPartyId,
          nationalId: '',
          translations: [{ languageId: PERSIAN_LANGUAGE_ID, firstName: item.relatedPartyName ?? '', lastName: '' }],
        }
      : null;

    setEditingId(item.id);
    setFormData({
      stakeholderTypeId: item.stakeholderTypeId,
      relatedPartyType: item.relatedPartyType === 1 ? 1 : 2,
      relatedPartyPerson: relatedPerson,
      relatedPartyCompanyId: item.relatedPartyType === 1 ? item.relatedPartyId : '',
      ownershipPercentage: current ? String(current.ownershipPercentage) : '',
      shareCount: current ? String(current.shareCount) : '',
      registrationDate: current?.registrationDate?.split('T')[0] ?? '',
      effectiveDate: current?.effectiveDate?.split('T')[0] ?? '',
      boardRepresentative: boardRep,
    });
    setDialogOpen(true);
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const buildPayload = (): StakeholderUpsertPayload | null => {
    const relatedPartyId =
      formData.relatedPartyType === 1
        ? formData.relatedPartyCompanyId
        : formData.relatedPartyPerson?.id ?? '';
    if (!relatedPartyId) return null;
    if (!formData.registrationDate || !formData.effectiveDate) return null;

    return {
      relatedPartyType: formData.relatedPartyType,
      relatedPartyId,
      stakeholderTypeId: formData.stakeholderTypeId,
      ownershipPercentage: parseFloat(formData.ownershipPercentage) || 0,
      shareCount: parseInt(formData.shareCount, 10) || 0,
      boardRepresentativePersonId: formData.boardRepresentative?.id ?? null,
      registrationDate: formData.registrationDate,
      effectiveDate: formData.effectiveDate,
    };
  };

  const handleSubmit = () => {
    const payload = buildPayload();
    if (!payload) return;
    if (editingId) {
      onEdit(editingId, payload);
    } else {
      onAdd(payload);
    }
    setDialogOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const submitEnabled =
    formData.stakeholderTypeId > 0 &&
    !!(formData.relatedPartyType === 1
      ? formData.relatedPartyCompanyId
      : formData.relatedPartyPerson) &&
    !!formData.registrationDate &&
    !!formData.effectiveDate;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
            7
          </span>
          {t('form.sections.stakeholders', { defaultValue: 'Stakeholders' })}
          {!readOnly && <Badge variant="secondary">{stakeholders.length}</Badge>}
        </CardTitle>
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
      </CardHeader>
      <CardContent>
        {stakeholders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('form.placeholders.noStakeholders', {
              defaultValue: 'No stakeholders recorded',
            })}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>{t('form.fields.stakeholderType', { defaultValue: 'Stakeholder Type' })}</TableHead>
                <TableHead>{t('form.fields.relatedParty', { defaultValue: 'Related Party' })}</TableHead>
                <TableHead className="text-end">{t('form.fields.ownershipPercentage', { defaultValue: 'Ownership %' })}</TableHead>
                <TableHead className="text-end">{t('form.fields.shareCount', { defaultValue: 'Share Count' })}</TableHead>
                <TableHead>{t('form.fields.effectiveDate', { defaultValue: 'Effective Date' })}</TableHead>
                <TableHead>{t('form.fields.boardRepresentative', { defaultValue: 'Board Representative' })}</TableHead>
                {!readOnly && <TableHead className="w-24">{t('common:actions', { defaultValue: 'Actions' })}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {stakeholders.map((item) => {
                const isExpanded = expanded[item.id] === true;
                const showHistory = isExpanded && item.history.length > 0;
                return (
                  <Fragment key={item.id}>
                    <TableRow>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleExpanded(item.id)}
                          disabled={item.history.length === 0}
                          aria-label={t('common.toggleHistory', { defaultValue: 'Show history' })}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {item.stakeholderTypeName || stakeholderTypeName(item.stakeholderTypeId)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.relatedPartyType === 1 ? (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>{relatedPartyName(item)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-end font-mono text-sm">
                        {item.current ? `${item.current.ownershipPercentage}%` : '—'}
                      </TableCell>
                      <TableCell className="text-end font-mono text-sm">
                        {item.current ? item.current.shareCount.toLocaleString('fa-IR') : '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(item.current?.effectiveDate ?? null, locale)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.current?.boardRepresentativeName || '—'}
                      </TableCell>
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
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => onDelete(item.id)}
                              disabled={disabled}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                    {showHistory && (
                      <TableRow>
                        <TableCell colSpan={readOnly ? 7 : 8} className="bg-muted/30">
                          <div className="px-2 py-2">
                            <div className="text-xs text-muted-foreground mb-2">
                              {t('form.sections.stakeholderHistory', { defaultValue: 'Stakeholder History' })}
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-end">{t('form.fields.ownershipPercentage', { defaultValue: 'Ownership %' })}</TableHead>
                                  <TableHead className="text-end">{t('form.fields.shareCount', { defaultValue: 'Share Count' })}</TableHead>
                                  <TableHead>{t('form.fields.boardRepresentative', { defaultValue: 'Board Representative' })}</TableHead>
                                  <TableHead>{t('form.fields.registrationDate', { defaultValue: 'Registration Date' })}</TableHead>
                                  <TableHead>{t('form.fields.effectiveDate', { defaultValue: 'Effective Date' })}</TableHead>
                                  <TableHead>{t('form.fields.endDate', { defaultValue: 'End Date' })}</TableHead>
                                  <TableHead>{t('common:createdAt', { defaultValue: 'Created At' })}</TableHead>
                                  <TableHead>{t('common:updatedAt', { defaultValue: 'Last Modified' })}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {item.history.map((h) => (
                                  <TableRow key={h.id}>
                                    <TableCell className="text-end font-mono text-sm">
                                      {h.ownershipPercentage}%
                                    </TableCell>
                                    <TableCell className="text-end font-mono text-sm">
                                      {h.shareCount.toLocaleString('fa-IR')}
                                    </TableCell>
                                    <TableCell className="text-sm">{h.boardRepresentativeName || '—'}</TableCell>
                                    <TableCell className="text-sm">{formatDate(h.registrationDate, locale)}</TableCell>
                                    <TableCell className="text-sm">{formatDate(h.effectiveDate, locale)}</TableCell>
                                    <TableCell className="text-sm">
                                      {h.endDate ? formatDate(h.endDate, locale) : (
                                        <Badge variant="secondary">
                                          {t('common.current', { defaultValue: 'Current' })}
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm" style={{ unicodeBidi: 'plaintext' }}>{formatDateTime(h.createdAt, locale)}</TableCell>
                                    <TableCell className="text-sm" style={{ unicodeBidi: 'plaintext' }}>{formatDateTime(h.updatedAt, locale)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-white! dark:border-white! max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t('form.editStakeholder', { defaultValue: 'Edit Stakeholder' })
                : t('form.addStakeholder', { defaultValue: 'Add Stakeholder' })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {t('form.fields.stakeholderType', { defaultValue: 'Stakeholder Type' })}
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.stakeholderTypeId.toString()}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, stakeholderTypeId: parseInt(v, 10) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAKEHOLDER_TYPES.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {t(s.key, { defaultValue: s.defaultEn })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  {t('form.fields.relatedPartyType', { defaultValue: 'Related Party Type' })}
                  <span className="text-destructive">*</span>
                </Label>
                <RadioGroup
                  value={formData.relatedPartyType.toString()}
                  onValueChange={(v) =>
                    setFormData((p) => ({
                      ...p,
                      relatedPartyType: (v === '1' ? 1 : 2) as 1 | 2,
                      relatedPartyPerson: v === '1' ? null : p.relatedPartyPerson,
                      relatedPartyCompanyId: v === '2' ? '' : p.relatedPartyCompanyId,
                    }))
                  }
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="2" id="rp-type-person" />
                    <Label htmlFor="rp-type-person" className="cursor-pointer">
                      {t('common.person', { defaultValue: 'Person' })}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="1" id="rp-type-company" />
                    <Label htmlFor="rp-type-company" className="cursor-pointer">
                      {t('common.company', { defaultValue: 'Company' })}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {formData.relatedPartyType === 2 ? (
              <PersonSearch
                label={t('form.fields.relatedParty', { defaultValue: 'Related Party' })}
                required
                apiUrl="/api/person/directory"
                value={formData.relatedPartyPerson}
                onSelect={(person) =>
                  setFormData((p) => ({ ...p, relatedPartyPerson: person }))
                }
              />
            ) : (
              <CompanySelect
                value={formData.relatedPartyCompanyId}
                onValueChange={(id) =>
                  setFormData((p) => ({ ...p, relatedPartyCompanyId: id }))
                }
                label={t('form.fields.relatedParty', { defaultValue: 'Related Party' })}
                required
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {t('form.fields.ownershipPercentage', { defaultValue: 'Ownership %' })}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  dir="ltr"
                  value={formData.ownershipPercentage}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, ownershipPercentage: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {t('form.fields.shareCount', { defaultValue: 'Share Count' })}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  dir="ltr"
                  value={formData.shareCount}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, shareCount: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {t('form.fields.registrationDate', { defaultValue: 'Registration Date' })}
                  <span className="text-destructive">*</span>
                </Label>
                <DatePickerComponent
                  value={formData.registrationDate}
                  onChange={(value) =>
                    setFormData((p) => ({ ...p, registrationDate: value }))
                  }
                  placeholder={t('form.placeholders.registrationDate', { defaultValue: 'Select registration date' })}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {t('form.fields.effectiveDate', { defaultValue: 'Effective Date' })}
                  <span className="text-destructive">*</span>
                </Label>
                <DatePickerComponent
                  value={formData.effectiveDate}
                  onChange={(value) =>
                    setFormData((p) => ({ ...p, effectiveDate: value }))
                  }
                  placeholder={t('form.placeholders.effectiveDate', { defaultValue: 'Select effective date' })}
                />
              </div>
            </div>

            <PersonSearch
              label={t('form.fields.boardRepresentative', { defaultValue: 'Board Representative' })}
              apiUrl="/api/person/directory"
              value={formData.boardRepresentative}
              onSelect={(person) =>
                setFormData((p) => ({ ...p, boardRepresentative: person }))
              }
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!submitEnabled}>
              {editingId
                ? t('common.save', { defaultValue: 'Save' })
                : t('common.add', { defaultValue: 'Add' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
