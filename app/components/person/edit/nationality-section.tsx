'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime, translateApiError } from '@/app/components/person/components/format-utils';
import { LocationSelect } from '@/components/common/location-select';

interface NationalitySectionProps {
  personId: string;
  isReadOnly?: boolean;
}

interface NationalityItem {
  id?: string;
  personId: string;
  countryId: number;
  countryName?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CountryData {
  id: string;
  name: string;
}

export function NationalitySection({ personId, isReadOnly = false }: NationalitySectionProps) {
  const { t, i18n } = useTranslation('person-nationality');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';

  const [nationalities, setNationalities] = useState<NationalityItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formCountryId, setFormCountryId] = useState<number>(1);
  const countriesRef = useRef<CountryData[]>([]);

  useEffect(() => {
    fetch('/api/locations?type=countries')
      .then((r) => r.json())
      .then((data: CountryData[]) => {
        countriesRef.current = data;
      })
      .catch(() => {});
  }, []);

  const getCountryName = useCallback((countryId: number): string => {
    return countriesRef.current.find((c) => c.id === String(countryId))?.name || String(countryId);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const response = await fetch(`/api/person/nationality?personId=${personId}`);
      if (!response.ok) return;
      const items = (await response.json()) as NationalityItem[];
      if (Array.isArray(items)) {
        setNationalities(
          items.map((n) => ({
            ...n,
            countryName: getCountryName(n.countryId),
          })),
        );
      }
    } catch (error) {
      console.error('Error loading nationality data:', error);
    }
  }, [personId, getCountryName]);

  useEffect(() => {
    const timer = setTimeout(() => { loadData(); }, 300);
    return () => clearTimeout(timer);
  }, [loadData]);

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

  const handleOpenDialog = () => {
    setEditingIndex(null);
    setFormCountryId(1);
    setDialogOpen(true);
  };

  const handleEditNationality = (index: number) => {
    const item = nationalities[index];
    setEditingIndex(index);
    setFormCountryId(item.countryId);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    // Check duplicate (skip self in edit mode)
    if (nationalities.some((n, i) => n.countryId === formCountryId && i !== editingIndex)) {
      showToast(t('duplicate', { defaultValue: 'This nationality has already been added' }), 'error');
      return;
    }

    try {
      if (editingIndex !== null) {
        // Edit: delete old + add new
        const existing = nationalities[editingIndex];
        await fetch('/api/person/nationality', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existing.id }),
        });
        const newId = crypto.randomUUID();
        const response = await fetch('/api/person/nationality', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: newId, personId, countryId: formCountryId }),
        });
        if (!response.ok) throw new Error('Failed to update nationality');
        const countryName = getCountryName(formCountryId);
        setNationalities((prev) => prev.map((n, i) => i === editingIndex ? { id: newId, personId, countryId: formCountryId, countryName } : n));
        setDialogOpen(false);
        showToast(t('updated', { defaultValue: 'Nationality updated' }), 'success');
        await loadData();
      } else {
        // Add
        const newId = crypto.randomUUID();
        const response = await fetch('/api/person/nationality', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: newId, personId, countryId: formCountryId }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to add nationality');
        }
        const countryName = getCountryName(formCountryId);
        setNationalities((prev) => [...prev, { id: newId, personId, countryId: formCountryId, countryName }]);
        setDialogOpen(false);
        showToast(t('added', { defaultValue: 'Nationality added successfully' }), 'success');
        await loadData();
      }
    } catch (error) {
      showToast(error instanceof Error ? translateApiError(error.message, t) : t('common:error', { defaultValue: 'An error occurred' }), 'error');
    }
  };

  const handleRemove = async (index: number) => {
    const item = nationalities[index];
    if (item.id) {
      try {
        await fetch('/api/person/nationality', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id }),
        });
      } catch {
        showToast(t('deleteFailed', { defaultValue: 'Failed to remove nationality' }), 'error');
        return;
      }
    }
    setNationalities((prev) => prev.filter((_, i) => i !== index));
    showToast(t('deleted', { defaultValue: 'Nationality deleted' }), 'error');
    await loadData();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">3</span>
          {t('sectionTitle', { defaultValue: 'Nationalities' })}
          <Badge variant="outline">{nationalities.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!isReadOnly && (
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={handleOpenDialog}>
                <Plus className="h-4 w-4 ml-1" />
                {t('common:add', { defaultValue: 'Add' })}
              </Button>
            </div>
          )}

          {nationalities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('noItems', { defaultValue: 'No nationalities registered' })}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t('country', { defaultValue: 'Nationality Country' })}</TableHead>
                  <TableHead>{t('common:createdAt', { defaultValue: 'Created At' })}</TableHead>
                  <TableHead>{t('common:updatedAt', { defaultValue: 'Last Modified' })}</TableHead>
                  <TableHead className="w-20">{t('common:actions', { defaultValue: 'Actions' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nationalities.map((item, index) => (
                  <TableRow key={item.id || index}>
                    <TableCell>{(index + 1).toLocaleString(locale)}</TableCell>
                    <TableCell>{item.countryName || getCountryName(item.countryId)}</TableCell>
                    <TableCell style={{ unicodeBidi: "plaintext" }}>{formatDateTime(item.createdAt, locale)}</TableCell>
                    <TableCell style={{ unicodeBidi: "plaintext" }}>{formatDateTime(item.updatedAt, locale)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditNationality(index)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg border-white! dark:border-white!">
            <DialogHeader>
              <DialogTitle>{editingIndex !== null ? t('editDialog', { defaultValue: 'Edit Nationality' }) : t('addDialog', { defaultValue: 'Add Nationality' })}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <LocationSelect
                type="country"
                value={String(formCountryId)}
                onValueChange={(value) => setFormCountryId(Number(value))}
                label={t('country', { defaultValue: 'Nationality Country' })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t('common:cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button type="button" onClick={handleSave}>
                {t('common:save', { defaultValue: 'Save' })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
