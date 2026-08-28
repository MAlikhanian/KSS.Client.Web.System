'use client';

import { useState } from 'react';
import { Plus, Trash2, Pencil, Star, StarOff } from 'lucide-react';
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

interface WebsiteItem {
  id: string;
  labelId: number;
  labelName: string;
  url: string;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

interface WebsitesGridProps {
  websites: WebsiteItem[];
  onAdd: (data: { labelId: number; url: string; isPrimary: boolean }) => void;
  onEdit: (id: string, data: { labelId: number; url: string; isPrimary: boolean }) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
  /** Hide add / edit / delete affordances entirely (view-only). */
  readOnly?: boolean;
  /** Label dropdown options. Falls back to built-in defaults. */
  labelOptions?: { id: number; name: string }[];
}

const WEBSITE_LABEL_DEFS: { id: number; key: string; en: string }[] = [
  { id: 1, key: 'labels.website.main', en: 'Main' },
  { id: 2, key: 'labels.website.support', en: 'Support' },
  { id: 3, key: 'labels.website.shop', en: 'Shop' },
  { id: 4, key: 'labels.website.careers', en: 'Careers' },
  { id: 5, key: 'labels.website.other', en: 'Other' },
];

export function WebsitesGrid({ websites, onAdd, onEdit, onDelete, disabled, readOnly = false, labelOptions }: WebsitesGridProps) {
  const { t, i18n } = useTranslation('company-information');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';
  const defaultLabels = WEBSITE_LABEL_DEFS.map((l) => ({ id: l.id, name: t(l.key, { defaultValue: l.en }) }));
  const labels = labelOptions ?? defaultLabels;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ labelId: 1, url: '', isPrimary: false });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ labelId: 1, url: '', isPrimary: false });
    setDialogOpen(true);
  };

  const handleOpenEdit = (website: WebsiteItem) => {
    setEditingId(website.id);
    setFormData({ labelId: website.labelId, url: website.url, isPrimary: website.isPrimary });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.url.trim()) return;
    if (editingId) {
      onEdit(editingId, formData);
    } else {
      onAdd(formData);
    }
    setFormData({ labelId: 1, url: '', isPrimary: false });
    setEditingId(null);
    setDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">6</span>
          {t('form.fields.website', { defaultValue: 'Website' })}
          {!readOnly && <Badge variant="secondary">{websites.length}</Badge>}
        </CardTitle>
        {!readOnly && (
          <Button type="button" variant="outline" size="sm" onClick={handleOpenAdd} disabled={disabled}>
            <Plus className="h-4 w-4 ml-1" />
            {t('common.add', { defaultValue: 'Add' })}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {websites.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('form.placeholders.noWebsites', { defaultValue: 'No websites recorded' })}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.label', { defaultValue: 'Label' })}</TableHead>
                <TableHead>{t('form.fields.website', { defaultValue: 'Website' })}</TableHead>
                <TableHead className="w-16 text-center">{t('common.primary', { defaultValue: 'Primary' })}</TableHead>
                <TableHead className="w-32">{t('common:createdAt', { defaultValue: 'Created At' })}</TableHead>
                <TableHead className="w-32">{t('common:updatedAt', { defaultValue: 'Last Modified' })}</TableHead>
                {!readOnly && <TableHead className="w-24">{t('common:actions', { defaultValue: 'Actions' })}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {websites.map((website) => (
                <TableRow key={website.id}>
                  <TableCell>{website.labelName || labels.find(l => l.id === website.labelId)?.name}</TableCell>
                  <TableCell className="font-mono text-sm" dir="ltr">{website.url}</TableCell>
                  <TableCell className="text-center">
                    {website.isPrimary
                      ? <Star className="h-4 w-4 text-yellow-500 mx-auto fill-yellow-500" />
                      : <StarOff className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                  </TableCell>
                  <TableCell className="text-sm" style={{ unicodeBidi: 'plaintext' }}>{formatDateTime(website.createdAt, locale)}</TableCell>
                  <TableCell className="text-sm" style={{ unicodeBidi: 'plaintext' }}>{formatDateTime(website.updatedAt, locale)}</TableCell>
                  {!readOnly && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(website)} disabled={disabled}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(website.id)} disabled={disabled}>
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
                ? t('form.editWebsite', { defaultValue: 'Edit Website' })
                : t('form.addWebsite', { defaultValue: 'Add Website' })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('common.label', { defaultValue: 'Label' })}</Label>
              <Select value={formData.labelId.toString()} onValueChange={(v) => setFormData((p) => ({ ...p, labelId: parseInt(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {labels.map((l) => (
                    <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('form.fields.website', { defaultValue: 'Website' })} <span className="text-destructive">*</span></Label>
              <Input
                type="url"
                dir="ltr"
                value={formData.url}
                onChange={(e) => setFormData((p) => ({ ...p, url: e.target.value }))}
                placeholder={t('form.placeholders.websiteExample', { defaultValue: 'https://www.company.com' })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="websiteIsPrimary" checked={formData.isPrimary} onCheckedChange={(checked) => setFormData((p) => ({ ...p, isPrimary: checked === true }))} />
              <Label htmlFor="websiteIsPrimary" className="cursor-pointer">{t('common.primary', { defaultValue: 'Primary' })}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel', { defaultValue: 'Cancel' })}</Button>
            <Button type="button" onClick={handleSubmit} disabled={!formData.url.trim()}>
              {editingId ? t('common.save', { defaultValue: 'Save' }) : t('common.add', { defaultValue: 'Add' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
