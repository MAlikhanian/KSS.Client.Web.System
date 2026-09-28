'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime, translateApiError } from '@/app/components/person/components/format-utils';

interface StatusSectionProps {
  personId: string;
  isReadOnly?: boolean;
}

interface StatusItem {
  id: string;
  personId: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt?: string;
}

export function StatusSection({ personId, isReadOnly = false }: StatusSectionProps) {
  const { t, i18n } = useTranslation('person-status');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');

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

  const loadStatuses = useCallback(async () => {
    try {
      const response = await fetch(`/api/person/status?personId=${personId}`);
      if (!response.ok) return;
      const data: StatusItem[] = await response.json();
      if (Array.isArray(data)) {
        const sorted = [...data].sort(
          (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );
        setStatuses(sorted);
      }
    } catch (error) {
      console.error('Error loading statuses:', error);
    }
  }, [personId]);

  useEffect(() => { loadStatuses(); }, [loadStatuses]);

  const currentStatus = statuses.length > 0 ? statuses[statuses.length - 1] : null;
  const isCurrentlyActive = currentStatus !== null && !currentStatus.endDate;

  const handleOpenAdd = () => {
    setEditingId(null);
    if (currentStatus?.endDate) {
      setFormStartDate(currentStatus.endDate.split('T')[0]);
    } else {
      setFormStartDate(new Date().toISOString().split('T')[0]);
    }
    setFormEndDate('');
    setDialogOpen(true);
  };

  const handleOpenSetEndDate = (status: StatusItem) => {
    setEditingId(status.id);
    setFormStartDate(status.startDate.split('T')[0]);
    setFormEndDate(new Date().toISOString().split('T')[0]);
    setDialogOpen(true);
  };

  const validateDates = (): string | null => {
    if (!formStartDate) return t('startDateRequired', { defaultValue: 'Start date is required' });

    const startDate = new Date(formStartDate);

    if (editingId) {
      if (!formEndDate) return t('endDateRequired', { defaultValue: 'End date is required' });
      const endDate = new Date(formEndDate);
      if (endDate <= startDate) return t('endDateAfterStart', { defaultValue: 'End date must be after start date' });
    } else {
      if (isCurrentlyActive) {
        return t('closeCurrentFirst', { defaultValue: 'Set end date for current period first' });
      }
      if (currentStatus?.endDate) {
        const prevEnd = new Date(currentStatus.endDate);
        if (startDate < prevEnd) {
          return t('startAfterPrevEnd', { defaultValue: 'Start date must be after previous period end date' });
        }
      }
      if (formEndDate) {
        const endDate = new Date(formEndDate);
        if (endDate <= startDate) return t('endDateAfterStart', { defaultValue: 'End date must be after start date' });
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateDates();
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    try {
      if (editingId) {
        const existing = statuses.find((s) => s.id === editingId);
        if (!existing) return;

        const response = await fetch('/api/person/status', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            personId,
            startDate: existing.startDate,
            endDate: formEndDate,
          }),
        });
        if (!response.ok) throw new Error('Failed to update status');
        showToast(t('updated', { defaultValue: 'Status updated' }), 'success');
      } else {
        const newId = crypto.randomUUID();
        const response = await fetch('/api/person/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newId,
            personId,
            startDate: formStartDate,
            endDate: formEndDate || null,
          }),
        });
        if (!response.ok) throw new Error('Failed to add status');
        showToast(t('added', { defaultValue: 'Active period added' }), 'success');
      }

      await loadStatuses();
      setDialogOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? translateApiError(error.message, t) : t('common:error', { defaultValue: 'An error occurred' }), 'error');
    }
  };

  const handleDelete = async (status: StatusItem) => {
    if (statuses.indexOf(status) !== statuses.length - 1) {
      showToast(t('canOnlyDeleteLast', { defaultValue: 'Only the last record can be deleted' }), 'error');
      return;
    }

    try {
      await fetch('/api/person/status', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: status.id }),
      });
      await loadStatuses();
      showToast(t('deleted', { defaultValue: 'Period deleted' }), 'error');
    } catch {
      showToast(t('deleteFailed', { defaultValue: 'Failed to delete period' }), 'error');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">12</span>
          {t('sectionTitle', { defaultValue: 'Status' })}
          {statuses.length > 0 && (
            <Badge variant={isCurrentlyActive ? 'success' : 'secondary'}>
              {isCurrentlyActive
                ? t('common:active', { defaultValue: 'Active' })
                : t('common:inactive', { defaultValue: 'Inactive' })}
            </Badge>
          )}
          <Badge variant="outline">{statuses.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!isReadOnly && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenAdd}
                disabled={isCurrentlyActive}
              >
                <Plus className="h-4 w-4 ml-1" />
                {t('common:add', { defaultValue: 'Add' })}
              </Button>
            </div>
          )}

          {statuses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('noItems', { defaultValue: 'No active periods registered' })}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t('common:startDate', { defaultValue: 'Start Date' })}</TableHead>
                  <TableHead>{t('common:endDate', { defaultValue: 'End Date' })}</TableHead>
                  <TableHead>{t('common:createdAt', { defaultValue: 'Created At' })}</TableHead>
                  <TableHead>{t('common:updatedAt', { defaultValue: 'Last Modified' })}</TableHead>
                  <TableHead className="w-24">{t('common:actions', { defaultValue: 'Actions' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((status, index) => {
                  const isLast = index === statuses.length - 1;
                  const isCurrent = isLast && !status.endDate;
                  return (
                    <TableRow key={status.id} className={isCurrent ? 'bg-muted/30' : ''}>
                      <TableCell>{(index + 1).toLocaleString(locale)}</TableCell>
                      <TableCell>{formatDate(status.startDate)}</TableCell>
                      <TableCell>
                        {status.endDate ? formatDate(status.endDate) : (
                          <Badge variant="success" className="text-xs font-sans">
                            {t('common:current', { defaultValue: 'Current' })}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell style={{ unicodeBidi: "plaintext" }}>{formatDateTime(status.createdAt, locale)}</TableCell>
                      <TableCell style={{ unicodeBidi: "plaintext" }}>{formatDateTime(status.updatedAt, locale)}</TableCell>
                      <TableCell>
                        {isLast && (
                          <div className="flex items-center gap-1">
                            {!status.endDate && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleOpenSetEndDate(status)}
                                title={t('setEndDate', { defaultValue: 'Set End Date' })}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDelete(status)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg border-white! dark:border-white!">
            <DialogHeader>
              <DialogTitle>
                {editingId
                  ? t('setEndDate', { defaultValue: 'Set End Date' })
                  : t('addDialog', { defaultValue: 'Add Active Period' })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!editingId && (
                <div className="space-y-2">
                  <Label>{t('common:startDate', { defaultValue: 'Start Date' })} <span className="text-destructive">*</span></Label>
                  <DatePickerComponent
                    value={formStartDate}
                    onChange={(value) => setFormStartDate(value)}
                    placeholder={t('selectDate', { defaultValue: 'Select Date' })}
                    forcePersian={true}
                  />
                </div>
              )}

              {editingId ? (
                <div className="space-y-2">
                  <Label>{t('common:endDate', { defaultValue: 'End Date' })} <span className="text-destructive">*</span></Label>
                  <DatePickerComponent
                    value={formEndDate}
                    onChange={(value) => setFormEndDate(value)}
                    placeholder={t('selectDate', { defaultValue: 'Select Date' })}
                    forcePersian={true}
                    minDate={formStartDate ? new Date(formStartDate) : undefined}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>{t('common:endDate', { defaultValue: 'End Date' })}</Label>
                  <DatePickerComponent
                    value={formEndDate}
                    onChange={(value) => setFormEndDate(value)}
                    placeholder={t('selectDate', { defaultValue: 'Select Date' })}
                    forcePersian={true}
                    minDate={formStartDate ? new Date(formStartDate) : undefined}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('endDateOptional', { defaultValue: 'Leave empty if period is current' })}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t('common:cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button type="button" onClick={handleSubmit}>
                {t('common:save', { defaultValue: 'Save' })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
