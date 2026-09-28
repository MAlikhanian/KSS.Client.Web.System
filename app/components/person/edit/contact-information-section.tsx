'use client';

import { localizeDigits, formatDateTime, translateApiError } from '@/app/components/person/components/format-utils';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Pencil, Star, StarOff } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';
import { useData } from '@/hooks/use-data';
import { AddressesGrid } from './addresses-grid';
import type { ReferenceData } from './person-form';

interface ContactInformationSectionProps {
  personId: string;
  referenceData?: ReferenceData;
  isReadOnly?: boolean;
}

interface EmailItem {
  id?: string;
  labelId: number;
  emailAddress: string;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface PhoneItem {
  id?: string;
  labelId: number;
  countryId: number;
  phoneNumber: string;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function ContactInformationSection({ personId, referenceData, isReadOnly = false }: ContactInformationSectionProps) {
  const { t, i18n } = useTranslation('person-contact');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';

  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [phones, setPhones] = useState<PhoneItem[]>([]);

  // Email dialog
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailEditingIndex, setEmailEditingIndex] = useState<number | null>(null);
  const [emailForm, setEmailForm] = useState<EmailItem>({ labelId: 1, emailAddress: '', isPrimary: false });

  // Phone dialog
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [phoneEditingIndex, setPhoneEditingIndex] = useState<number | null>(null);
  const [phoneForm, setPhoneForm] = useState<PhoneItem>({ labelId: 1, countryId: 1, phoneNumber: '', isPrimary: false });

  const PERSIAN_LANGUAGE_ID = 12;
  const emailLabelOptions = referenceData?.emailLabelTranslations?.filter((t) => t.languageId === PERSIAN_LANGUAGE_ID) || [];
  // Phone labels from the Common service (canonical lookup), mapped to the
  // existing { phoneLabelId, name } shape so the rest of this section is unchanged.
  const { data: commonPhoneLabels } = useData('phone-labels');
  const phoneLabelOptions = commonPhoneLabels.map((l) => ({ phoneLabelId: Number(l.id), name: l.name }));
  // Address labels from the Common service (canonical), mapped to the existing
  // { addressLabelId, name } shape so the AddressesGrid usage below is unchanged.
  const { data: commonAddressLabels } = useData('address-labels');
  const addressLabelOptions = commonAddressLabels.map((l) => ({ addressLabelId: Number(l.id), name: l.name }));

  const loadData = useCallback(async () => {
    try {
      const [emailsRes, phonesRes] = await Promise.all([
        fetch(`/api/person/email?personId=${personId}`),
        fetch(`/api/person/phone?personId=${personId}`),
      ]);

      if (emailsRes.ok) {
        const items = await emailsRes.json();
        if (Array.isArray(items)) {
          setEmails(items as EmailItem[]);
        }
      }

      if (phonesRes.ok) {
        const items = await phonesRes.json();
        if (Array.isArray(items)) {
          setPhones(items as PhoneItem[]);
        }
      }
    } catch (error) {
      console.error('Error loading contact data:', error);
    }
  }, [personId]);

  useEffect(() => { loadData(); }, [loadData]);

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

  // ─── Email ───
  const handleOpenEmailDialog = () => {
    setEmailEditingIndex(null);
    setEmailForm({ labelId: emailLabelOptions[0]?.emailLabelId || 1, emailAddress: '', isPrimary: false });
    setEmailDialogOpen(true);
  };

  const handleEditEmail = (index: number) => {
    const item = emails[index];
    setEmailEditingIndex(index);
    setEmailForm({ labelId: item.labelId, emailAddress: item.emailAddress, isPrimary: item.isPrimary });
    setEmailDialogOpen(true);
  };

  const handleSaveEmail = async () => {
    if (!emailForm.emailAddress.trim()) {
      showToast(t('emailRequired', { defaultValue: 'Email is required' }), 'error');
      return;
    }
    try {
      if (emailEditingIndex !== null) {
        // Update
        const existing = emails[emailEditingIndex];
        const response = await fetch('/api/person/email', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...existing, ...emailForm, personId }),
        });
        if (!response.ok) throw new Error('Failed to update email');
        setEmails((prev) => prev.map((e, i) => i === emailEditingIndex ? { ...e, ...emailForm } : e));
        showToast(t('emailUpdated', { defaultValue: 'Email updated' }), 'success');
        await loadData();
      } else {
        // Add
        const newId = crypto.randomUUID();
        const response = await fetch('/api/person/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...emailForm, id: newId, personId, isVerified: false }),
        });
        if (!response.ok) throw new Error('Failed to add email');
        const result = await response.json();
        setEmails((prev) => [...prev, { ...emailForm, id: result.id || newId }]);
        showToast(t('emailAdded', { defaultValue: 'Email added' }), 'success');
        await loadData();
      }
      setEmailDialogOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? translateApiError(error.message, t) : t('common:error', { defaultValue: 'An error occurred' }), 'error');
    }
  };

  const removeEmail = async (index: number) => {
    const email = emails[index];
    if (email.id) {
      try {
        const response = await fetch('/api/person/email', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: email.id }),
        });
        if (!response.ok) throw new Error('Delete failed');
      } catch {
        showToast(t('emailDeleteFailed', { defaultValue: 'Failed to delete email' }), 'error');
        return;
      }
    }
    setEmails((prev) => prev.filter((_, i) => i !== index));
    showToast(t('emailDeleted', { defaultValue: 'Email deleted' }), 'error');
    await loadData();
  };

  // ─── Phone ───
  const handleOpenPhoneDialog = () => {
    setPhoneEditingIndex(null);
    setPhoneForm({ labelId: phoneLabelOptions[0]?.phoneLabelId || 1, countryId: 1, phoneNumber: '', isPrimary: false });
    setPhoneDialogOpen(true);
  };

  const handleEditPhone = (index: number) => {
    const item = phones[index];
    setPhoneEditingIndex(index);
    setPhoneForm({ labelId: item.labelId, countryId: item.countryId, phoneNumber: item.phoneNumber, isPrimary: item.isPrimary });
    setPhoneDialogOpen(true);
  };

  const handleSavePhone = async () => {
    if (!phoneForm.phoneNumber.trim()) {
      showToast(t('phoneRequired', { defaultValue: 'Phone number is required' }), 'error');
      return;
    }
    try {
      if (phoneEditingIndex !== null) {
        const existing = phones[phoneEditingIndex];
        const response = await fetch('/api/person/phone', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...existing, ...phoneForm, personId }),
        });
        if (!response.ok) throw new Error('Failed to update phone');
        setPhones((prev) => prev.map((p, i) => i === phoneEditingIndex ? { ...p, ...phoneForm } : p));
        showToast(t('phoneUpdated', { defaultValue: 'Phone updated' }), 'success');
        await loadData();
      } else {
        const newId = crypto.randomUUID();
        const response = await fetch('/api/person/phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...phoneForm, id: newId, personId, isVerified: false }),
        });
        if (!response.ok) throw new Error('Failed to add phone');
        const result = await response.json();
        setPhones((prev) => [...prev, { ...phoneForm, id: result.id || newId }]);
        showToast(t('phoneAdded', { defaultValue: 'Phone added' }), 'success');
        await loadData();
      }
      setPhoneDialogOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? translateApiError(error.message, t) : t('common:error', { defaultValue: 'An error occurred' }), 'error');
    }
  };

  const removePhone = async (index: number) => {
    const phone = phones[index];
    if (phone.id) {
      try {
        const response = await fetch('/api/person/phone', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: phone.id }),
        });
        if (!response.ok) throw new Error('Delete failed');
      } catch {
        showToast(t('phoneDeleteFailed', { defaultValue: 'Failed to delete phone' }), 'error');
        return;
      }
    }
    setPhones((prev) => prev.filter((_, i) => i !== index));
    showToast(t('phoneDeleted', { defaultValue: 'Phone deleted' }), 'error');
    await loadData();
  };

  return (
    <div className="space-y-6">
      {/* Section 4 — Emails — purple badge */}
      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-purple-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-purple-500!">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">4</span>
            {t('emailsTitle', { defaultValue: 'Emails' })}
            <Badge variant="outline">{emails.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!isReadOnly && (
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={handleOpenEmailDialog}>
                  <Plus className="h-4 w-4 ml-1" />
                  {t('common:add', { defaultValue: 'Add' })}
                </Button>
              </div>
            )}

            {emails.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('noEmails', { defaultValue: 'No emails registered' })}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('common:type', { defaultValue: 'Type' })}</TableHead>
                    <TableHead>{t('emailAddress', { defaultValue: 'Email Address' })}</TableHead>
                    <TableHead>{t('common:createdAt', { defaultValue: 'Created At' })}</TableHead>
                    <TableHead>{t('common:updatedAt', { defaultValue: 'Last Modified' })}</TableHead>
                    <TableHead className="w-16 text-center">{t('common:primary', { defaultValue: 'Primary' })}</TableHead>
                    <TableHead className="w-20">{t('common:actions', { defaultValue: 'Actions' })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map((item, index) => {
                    const label = emailLabelOptions.find((l) => l.emailLabelId === item.labelId);
                    return (
                      <TableRow key={item.id || index}>
                        <TableCell>{(index + 1).toLocaleString(locale)}</TableCell>
                        <TableCell>{label?.name || '-'}</TableCell>
                        <TableCell>{item.emailAddress}</TableCell>
                        <TableCell style={{ unicodeBidi: "plaintext" }}>{formatDateTime(item.createdAt, locale)}</TableCell>
                        <TableCell style={{ unicodeBidi: "plaintext" }}>{formatDateTime(item.updatedAt, locale)}</TableCell>
                        <TableCell>
                          {item.isPrimary
                            ? <Star className="h-4 w-4 text-yellow-500 mx-auto fill-yellow-500" />
                            : <StarOff className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditEmail(index)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeEmail(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
            <DialogContent className="max-w-lg border-white! dark:border-white!">
              <DialogHeader>
                <DialogTitle>{emailEditingIndex !== null ? t('editEmail', { defaultValue: 'Edit Email' }) : t('addEmail', { defaultValue: 'Add Email' })}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('common:type', { defaultValue: 'Type' })}</Label>
                  <Select value={String(emailForm.labelId)} onValueChange={(v) => setEmailForm({ ...emailForm, labelId: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {emailLabelOptions.map((l) => (
                        <SelectItem key={l.emailLabelId} value={String(l.emailLabelId)}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('emailAddress', { defaultValue: 'Email Address' })} <span className="text-destructive">*</span></Label>
                  <Input
                    type="email"
                    value={emailForm.emailAddress}
                    onChange={(e) => setEmailForm({ ...emailForm, emailAddress: e.target.value })}
                    placeholder={t('emailAddress', { defaultValue: 'Enter email address' })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={emailForm.isPrimary}
                    onCheckedChange={(checked) => setEmailForm({ ...emailForm, isPrimary: checked as boolean })}
                  />
                  <Label className="text-sm">{t('common:primary', { defaultValue: 'Primary' })}</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEmailDialogOpen(false)}>
                  {t('common:cancel', { defaultValue: 'Cancel' })}
                </Button>
                <Button type="button" onClick={handleSaveEmail}>
                  {t('common:save', { defaultValue: 'Save' })}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
      </div>

      {/* Section 5 — Phones — teal badge */}
      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-teal-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-teal-500!">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">5</span>
            {t('phonesTitle', { defaultValue: 'Phone Numbers' })}
            <Badge variant="outline">{phones.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!isReadOnly && (
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={handleOpenPhoneDialog}>
                  <Plus className="h-4 w-4 ml-1" />
                  {t('common:add', { defaultValue: 'Add' })}
                </Button>
              </div>
            )}

            {phones.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('noPhones', { defaultValue: 'No phone numbers registered' })}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('common:type', { defaultValue: 'Type' })}</TableHead>
                    <TableHead>{t('phoneNumber', { defaultValue: 'Phone Number' })}</TableHead>
                    <TableHead>{t('common:createdAt', { defaultValue: 'Created At' })}</TableHead>
                    <TableHead>{t('common:updatedAt', { defaultValue: 'Last Modified' })}</TableHead>
                    <TableHead className="w-16 text-center">{t('common:primary', { defaultValue: 'Primary' })}</TableHead>
                    <TableHead className="w-20">{t('common:actions', { defaultValue: 'Actions' })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {phones.map((item, index) => {
                    const label = phoneLabelOptions.find((l) => l.phoneLabelId === item.labelId);
                    return (
                      <TableRow key={item.id || index}>
                        <TableCell>{(index + 1).toLocaleString(locale)}</TableCell>
                        <TableCell>{label?.name || '-'}</TableCell>
                        <TableCell>{localizeDigits(item.phoneNumber, locale)}</TableCell>
                        <TableCell style={{ unicodeBidi: "plaintext" }}>{formatDateTime(item.createdAt, locale)}</TableCell>
                        <TableCell style={{ unicodeBidi: "plaintext" }}>{formatDateTime(item.updatedAt, locale)}</TableCell>
                        <TableCell>
                          {item.isPrimary
                            ? <Star className="h-4 w-4 text-yellow-500 mx-auto fill-yellow-500" />
                            : <StarOff className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditPhone(index)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removePhone(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
            <DialogContent className="max-w-lg border-white! dark:border-white!">
              <DialogHeader>
                <DialogTitle>{phoneEditingIndex !== null ? t('editPhone', { defaultValue: 'Edit Phone Number' }) : t('addPhone', { defaultValue: 'Add Phone Number' })}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('common:type', { defaultValue: 'Type' })}</Label>
                  <Select value={String(phoneForm.labelId)} onValueChange={(v) => setPhoneForm({ ...phoneForm, labelId: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {phoneLabelOptions.map((l) => (
                        <SelectItem key={l.phoneLabelId} value={String(l.phoneLabelId)}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('phoneNumber', { defaultValue: 'Phone Number' })} <span className="text-destructive">*</span></Label>
                  <Input
                    type="tel"
                   
                    value={phoneForm.phoneNumber}
                    onChange={(e) => setPhoneForm({ ...phoneForm, phoneNumber: e.target.value })}
                    placeholder={t('phoneNumber', { defaultValue: 'Enter mobile number' })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={phoneForm.isPrimary}
                    onCheckedChange={(checked) => setPhoneForm({ ...phoneForm, isPrimary: checked as boolean })}
                  />
                  <Label className="text-sm">{t('common:primary', { defaultValue: 'Primary' })}</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPhoneDialogOpen(false)}>
                  {t('common:cancel', { defaultValue: 'Cancel' })}
                </Button>
                <Button type="button" onClick={handleSavePhone}>
                  {t('common:save', { defaultValue: 'Save' })}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
      </div>

      {/* Section 6 — Addresses — indigo badge */}
      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-indigo-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-indigo-500!">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">6</span>
            {t('person-address:sectionTitle', { defaultValue: 'Addresses' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AddressesGrid
            personId={personId}
            labelOptions={addressLabelOptions.map((l) => ({ id: l.addressLabelId, name: l.name }))}
            isReadOnly={isReadOnly}
          />
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
