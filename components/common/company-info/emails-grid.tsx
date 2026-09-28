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

interface EmailItem {
  id: string;
  labelId: number;
  labelName: string;
  emailAddress: string;
  isPrimary: boolean;
  isVerified: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

interface EmailsGridProps {
  emails: EmailItem[];
  onAdd: (data: { labelId: number; emailAddress: string; isPrimary: boolean }) => void;
  onEdit: (id: string, data: { labelId: number; emailAddress: string; isPrimary: boolean }) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
  /** Hide add / edit / delete affordances entirely (view-only). */
  readOnly?: boolean;
  /** Label dropdown options — pass from the Common service. Falls back to built-in defaults. */
  labelOptions?: { id: number; name: string }[];
}

const EMAIL_LABEL_DEFS: { id: number; key: string; en: string }[] = [
  { id: 1, key: 'labels.email.main', en: 'Main' },
  { id: 2, key: 'labels.email.work', en: 'Work' },
  { id: 3, key: 'labels.email.personal', en: 'Personal' },
  { id: 4, key: 'labels.email.support', en: 'Support' },
  { id: 5, key: 'labels.email.other', en: 'Other' },
];

export function EmailsGrid({ emails, onAdd, onEdit, onDelete, disabled, readOnly = false, labelOptions }: EmailsGridProps) {
  const { t, i18n } = useTranslation('company-information');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';
  const defaultLabels = EMAIL_LABEL_DEFS.map((l) => ({ id: l.id, name: t(l.key, { defaultValue: l.en }) }));
  const labels = labelOptions ?? defaultLabels;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ labelId: 1, emailAddress: '', isPrimary: false });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ labelId: 1, emailAddress: '', isPrimary: false });
    setDialogOpen(true);
  };

  const handleOpenEdit = (email: EmailItem) => {
    setEditingId(email.id);
    setFormData({
      labelId: email.labelId,
      emailAddress: email.emailAddress,
      isPrimary: email.isPrimary,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.emailAddress.trim()) return;
    if (editingId) {
      onEdit(editingId, formData);
    } else {
      onAdd(formData);
    }
    setFormData({ labelId: 1, emailAddress: '', isPrimary: false });
    setEditingId(null);
    setDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">3</span>
          {t('form.fields.email', { defaultValue: 'Email' })}
          {!readOnly && <Badge variant="secondary">{emails.length}</Badge>}
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
        {emails.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('form.placeholders.noEmails', { defaultValue: 'No emails recorded' })}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.label', { defaultValue: 'Label' })}</TableHead>
                <TableHead>{t('form.fields.email', { defaultValue: 'Email' })}</TableHead>
                <TableHead className="w-16 text-center">{t('common.primary', { defaultValue: 'Primary' })}</TableHead>
                <TableHead className="w-24 text-center whitespace-nowrap">{t('common.verified', { defaultValue: 'Verified' })}</TableHead>
                <TableHead className="w-32">{t('common:createdAt', { defaultValue: 'Created At' })}</TableHead>
                <TableHead className="w-32">{t('common:updatedAt', { defaultValue: 'Last Modified' })}</TableHead>
                {!readOnly && <TableHead className="w-24">{t('common:actions', { defaultValue: 'Actions' })}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {emails.map((email) => (
                <TableRow key={email.id}>
                  <TableCell>{email.labelName || labels.find(l => l.id === email.labelId)?.name}</TableCell>
                  <TableCell className="font-mono text-sm" dir="ltr">{email.emailAddress}</TableCell>
                  <TableCell className="text-center">
                    {email.isPrimary
                      ? <Star className="h-4 w-4 text-yellow-500 mx-auto fill-yellow-500" />
                      : <StarOff className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                  </TableCell>
                  <TableCell className="text-center">
                    {email.isVerified
                      ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                      : <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                  </TableCell>
                  <TableCell className="text-sm" style={{ unicodeBidi: 'plaintext' }}>{formatDateTime(email.createdAt, locale)}</TableCell>
                  <TableCell className="text-sm" style={{ unicodeBidi: 'plaintext' }}>{formatDateTime(email.updatedAt, locale)}</TableCell>
                  {!readOnly && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenEdit(email)}
                          disabled={disabled}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => onDelete(email.id)}
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
                ? t('form.editEmail', { defaultValue: 'Edit Email' })
                : t('form.addEmail', { defaultValue: 'Add Email' })}
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
              <Label>{t('form.fields.email', { defaultValue: 'Email' })} <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                dir="ltr"
                value={formData.emailAddress}
                onChange={(e) => setFormData((p) => ({ ...p, emailAddress: e.target.value }))}
                placeholder={t('form.placeholders.emailExample', { defaultValue: 'example@company.com' })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="emailIsPrimary"
                checked={formData.isPrimary}
                onCheckedChange={(checked) => setFormData((p) => ({ ...p, isPrimary: checked === true }))}
              />
              <Label htmlFor="emailIsPrimary" className="cursor-pointer">
                {t('common.primary', { defaultValue: 'Primary' })}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!formData.emailAddress.trim()}>
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
