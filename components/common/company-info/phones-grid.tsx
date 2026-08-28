'use client';

import { useState } from 'react';
import { Plus, Trash2, Pencil, Star, StarOff, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/lib/format-utils';

interface PhoneItem {
  id: string;
  labelId: number;
  labelName: string;
  countryId: number;
  phoneNumber: string;
  isPrimary: boolean;
  isVerified: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

interface PhonesGridProps {
  phones: PhoneItem[];
  onAdd: (data: { labelId: number; countryId: number; phoneNumber: string; isPrimary: boolean }) => void;
  onEdit: (id: string, data: { labelId: number; countryId: number; phoneNumber: string; isPrimary: boolean }) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
  /** Hide add / edit / delete affordances entirely (view-only). */
  readOnly?: boolean;
  /** Label dropdown options — pass from the Common service (`useData('phone-labels')`). */
  labelOptions?: { id: number; name: string }[];
  /** Override the section header. Defaults to the built-in "phones" label. */
  title?: string;
  /** Show the count badge next to the section title. Defaults to true. */
  showCountBadge?: boolean;
  /** Show the colored section-number circle before the title. Defaults to true. */
  showSectionNumber?: boolean;
}

const E164_REGEX = /^\+\d{7,15}$/;

function isValidE164(phone: string): boolean {
  return E164_REGEX.test(phone);
}

const PHONE_LABEL_DEFS: { id: number; key: string; en: string }[] = [
  { id: 1, key: 'labels.phone.landline', en: 'Landline' },
  { id: 2, key: 'labels.phone.mobile', en: 'Mobile' },
  { id: 3, key: 'labels.phone.fax', en: 'Fax' },
  { id: 4, key: 'labels.phone.emergency', en: 'Emergency' },
  { id: 5, key: 'labels.phone.other', en: 'Other' },
];

export function PhonesGrid({ phones, onAdd, onEdit, onDelete, disabled, readOnly = false, labelOptions, title, showCountBadge = true, showSectionNumber = true }: PhonesGridProps) {
  const { t, i18n } = useTranslation('company-information');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';

  const defaultLabels = PHONE_LABEL_DEFS.map((l) => ({
    id: l.id,
    name: t(l.key, { defaultValue: l.en }),
  }));
  const labels = labelOptions ?? defaultLabels;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ labelId: 1, countryId: 98, phoneNumber: '', isPrimary: false });
  const [phoneError, setPhoneError] = useState('');

  const handlePhoneChange = (value: string) => {
    const sanitized = value.replace(/[^+\d]/g, '');
    setFormData((p) => ({ ...p, phoneNumber: sanitized }));
    if (sanitized && !isValidE164(sanitized)) {
      setPhoneError(t('form.validation.invalidPhone', {
        defaultValue: 'Phone number must be in E.164 format: + and 7 to 15 digits (e.g. +982112345678)'
      }));
    } else {
      setPhoneError('');
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ labelId: 1, countryId: 98, phoneNumber: '', isPrimary: false });
    setPhoneError('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (phone: PhoneItem) => {
    setEditingId(phone.id);
    setFormData({
      labelId: phone.labelId,
      countryId: phone.countryId,
      phoneNumber: phone.phoneNumber,
      isPrimary: phone.isPrimary,
    });
    setPhoneError('');
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!isValidE164(formData.phoneNumber)) return;
    if (editingId) {
      onEdit(editingId, formData);
    } else {
      onAdd(formData);
    }
    setFormData({ labelId: 1, countryId: 98, phoneNumber: '', isPrimary: false });
    setPhoneError('');
    setEditingId(null);
    setDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          {showSectionNumber && <span className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">4</span>}
          {title ?? t('form.fields.phoneNumber', { defaultValue: 'Phone Number' })}
          {!readOnly && showCountBadge && <Badge variant="secondary">{phones.length}</Badge>}
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
        {phones.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('form.placeholders.noPhones', { defaultValue: 'No phones recorded' })}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.label', { defaultValue: 'Label' })}</TableHead>
                <TableHead>{t('form.fields.phoneNumber', { defaultValue: 'Phone Number' })}</TableHead>
                <TableHead className="w-16 text-center">{t('common.primary', { defaultValue: 'Primary' })}</TableHead>
                <TableHead className="w-24 text-center whitespace-nowrap">{t('common.verified', { defaultValue: 'Verified' })}</TableHead>
                <TableHead className="w-32">{t('common:createdAt', { defaultValue: 'Created At' })}</TableHead>
                <TableHead className="w-32">{t('common:updatedAt', { defaultValue: 'Last Modified' })}</TableHead>
                {!readOnly && <TableHead className="w-24">{t('common:actions', { defaultValue: 'Actions' })}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {phones.map((phone) => (
                <TableRow key={phone.id}>
                  <TableCell>{phone.labelName || labels.find(l => l.id === phone.labelId)?.name}</TableCell>
                  <TableCell className="font-mono text-sm" dir="ltr">{phone.phoneNumber}</TableCell>
                  <TableCell className="text-center">
                    {phone.isPrimary
                      ? <Star className="h-4 w-4 text-yellow-500 mx-auto fill-yellow-500" />
                      : <StarOff className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                  </TableCell>
                  <TableCell className="text-center">
                    {phone.isVerified
                      ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                      : <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                  </TableCell>
                  <TableCell className="text-sm" style={{ unicodeBidi: 'plaintext' }}>{formatDateTime(phone.createdAt, locale)}</TableCell>
                  <TableCell className="text-sm" style={{ unicodeBidi: 'plaintext' }}>{formatDateTime(phone.updatedAt, locale)}</TableCell>
                  {!readOnly && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenEdit(phone)}
                          disabled={disabled}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => onDelete(phone.id)}
                          disabled={disabled}
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
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-white! dark:border-white!">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t('form.editPhone', { defaultValue: 'Edit Phone' })
                : t('form.addPhone', { defaultValue: 'Add Phone' })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('common.label', { defaultValue: 'Label' })}</Label>
              <Select
                value={formData.labelId.toString()}
                onValueChange={(v) => setFormData((p) => ({ ...p, labelId: parseInt(v) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {labels.map((l) => (
                    <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('form.fields.phoneNumber', { defaultValue: 'Phone Number' })} <span className="text-destructive">*</span></Label>
              <Input
                type="tel"
                dir="ltr"
                value={formData.phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder={t('form.placeholders.phoneExample', { defaultValue: '+982112345678' })}
                maxLength={16}
              />
              {phoneError && (
                <p className="text-sm text-destructive">{phoneError}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="phoneIsPrimary"
                checked={formData.isPrimary}
                onCheckedChange={(checked) => setFormData((p) => ({ ...p, isPrimary: checked === true }))}
              />
              <Label htmlFor="phoneIsPrimary" className="cursor-pointer">
                {t('common.primary', { defaultValue: 'Primary' })}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!isValidE164(formData.phoneNumber)}>
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
