'use client';

import { localizeDigits, formatDateTime, translateApiError } from '@/app/components/person/components/format-utils';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Pencil, Upload, FileText, Eye, Download } from 'lucide-react';
import { RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { toast } from 'sonner';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { apiClientFetch } from '@/lib/api-client';
import type { ReferenceData } from './person-form';

const PERSIAN_LANGUAGE_ID = 12;
const ENGLISH_LANGUAGE_ID = 10;

interface ProfessionalTrainingSectionProps {
  personId: string;
  referenceData?: ReferenceData;
  isReadOnly?: boolean;
}

interface ProfessionalTrainingDocumentItem {
  id: string;
  professionalTrainingId: string;
  professionalTrainingDocumentTypeId: number;
  storageInstanceId: number;
  fileName: string;
  fileSize: number;
  contentType: string;
  createdAt?: string;
  professionalTrainingDocumentType?: {
    id: number;
    code: string;
    translations?: Array<{ languageId: number; name: string }>;
  };
}

interface ProfessionalTrainingDocumentTypeOption {
  id: number;
  code: string;
  name: string;
}

interface PendingDoc {
  file: File;
  professionalTrainingDocumentTypeId: number;
  typeName: string;
}

interface ProfessionalTrainingItem {
  id?: string;
  personId: string;
  title: string;
  professionalTrainingTypeId: number;
  professionalTrainingCertificateIssuerId: number;
  issueDate: string;
  expiryDate: string;
  createdAt?: string;
  updatedAt?: string;
  professionalTrainingDocuments?: ProfessionalTrainingDocumentItem[];
}

export function ProfessionalTrainingSection({ personId, referenceData, isReadOnly = false }: ProfessionalTrainingSectionProps) {
  const { t, i18n } = useTranslation('person-professional-training');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';
  const [trainings, setTrainings] = useState<ProfessionalTrainingItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formTypeId, setFormTypeId] = useState<number>(0);
  const [formIssuerId, setFormIssuerId] = useState<number>(0);
  const [formIssueDate, setFormIssueDate] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');

  // Document upload within dialog (works in both insert and edit modes)
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTypeId, setDocTypeId] = useState<number>(0);
  const [docUploading, setDocUploading] = useState(false);
  const [editingDocs, setEditingDocs] = useState<ProfessionalTrainingDocumentItem[]>([]);
  // Pending docs are queued during insert mode and uploaded after the
  // ProfessionalTraining row is created. Edit mode uploads them immediately.
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [documentTypes, setDocumentTypes] = useState<ProfessionalTrainingDocumentTypeOption[]>([]);

  const langId = i18n.language === 'fa' ? PERSIAN_LANGUAGE_ID : ENGLISH_LANGUAGE_ID;
  const typeOptions = (referenceData?.professionalTrainingTypeTranslations?.filter((tt) => tt.languageId === langId) || [])
    .map((tt) => ({ id: tt.professionalTrainingTypeId, name: tt.name }));
  const issuerOptions = (referenceData?.professionalTrainingCertificateIssuerTranslations?.filter((it) => it.languageId === langId) || [])
    .map((it) => ({ id: it.professionalTrainingCertificateIssuerId, name: it.name }));

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

  // Load existing trainings via per-section endpoint (includes ProfessionalTrainingDocuments + DocumentType).
  const loadTrainings = useCallback(async () => {
    try {
      const response = await fetch(`/api/person/professional-training?personId=${personId}`);
      if (!response.ok) return;
      const raw: ProfessionalTrainingItem[] = await response.json();

      if (Array.isArray(raw)) {
        const items: ProfessionalTrainingItem[] = raw.map((e) => ({
          id: e.id,
          personId: e.personId || personId,
          title: e.title || '',
          professionalTrainingTypeId: e.professionalTrainingTypeId || 0,
          professionalTrainingCertificateIssuerId: e.professionalTrainingCertificateIssuerId || 0,
          issueDate: e.issueDate ? (e.issueDate as string).split('T')[0] : '',
          expiryDate: e.expiryDate ? (e.expiryDate as string).split('T')[0] : '',
          createdAt: e.createdAt as string,
          updatedAt: e.updatedAt as string,
          professionalTrainingDocuments: e.professionalTrainingDocuments || [],
        }));
        // Sort by issueDate
        items.sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime());
        setTrainings(items);
      }
    } catch (error) {
      console.error('Error loading professional training data:', error);
    }
  }, [personId]);

  useEffect(() => { loadTrainings(); }, [loadTrainings]);

  // Load ProfessionalTrainingDocumentType lookup once per language
  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClientFetch(`/api/common/professional-training-document-types?languageId=${langId}`);
        if (res.ok) {
          const data: ProfessionalTrainingDocumentTypeOption[] = await res.json();
          setDocumentTypes(data);
        }
      } catch {
        // Silently fail
      }
    };
    load();
  }, [langId]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormTitle('');
    setFormTypeId(0);
    setFormIssuerId(0);
    setFormIssueDate('');
    setFormExpiryDate('');
    setDocFile(null);
    setDocTypeId(0);
    setPendingDocs([]);
    setEditingDocs([]);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: ProfessionalTrainingItem) => {
    setEditingId(item.id || null);
    setFormTitle(item.title || '');
    setFormTypeId(item.professionalTrainingTypeId);
    setFormIssuerId(item.professionalTrainingCertificateIssuerId);
    setFormIssueDate(item.issueDate ? item.issueDate.split('T')[0] : '');
    setFormExpiryDate(item.expiryDate ? item.expiryDate.split('T')[0] : '');
    setDocFile(null);
    setDocTypeId(0);
    setPendingDocs([]);
    setEditingDocs(item.professionalTrainingDocuments || []);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formTitle || !formTypeId || !formIssuerId || !formIssueDate) {
      showToast(t('common:requiredFields', { defaultValue: 'Please fill all required fields' }), 'error');
      return;
    }

    try {
      const trainingData = {
        personId,
        title: formTitle,
        professionalTrainingTypeId: formTypeId,
        professionalTrainingCertificateIssuerId: formIssuerId,
        issueDate: formIssueDate,
        expiryDate: formExpiryDate || null,
      };

      let createdTrainingId: string | null = editingId;
      if (editingId) {
        const response = await fetch('/api/person/professional-training', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...trainingData }),
        });
        if (!response.ok) throw new Error('Failed to update professional training');
        showToast(t('updated', { defaultValue: 'Record updated' }), 'success');
      } else {
        const response = await fetch('/api/person/professional-training', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: '00000000-0000-0000-0000-000000000000', ...trainingData }),
        });
        if (!response.ok) throw new Error('Failed to add professional training');
        const created = await response.json();
        createdTrainingId = created?.id || null;
        showToast(t('added', { defaultValue: 'Record added' }), 'success');
      }

      // Upload any pending docs queued during insert mode.
      if (createdTrainingId && pendingDocs.length > 0) {
        for (const pd of pendingDocs) {
          try {
            const fd = new FormData();
            fd.append('professionalTrainingId', createdTrainingId);
            fd.append('professionalTrainingDocumentTypeId', String(pd.professionalTrainingDocumentTypeId));
            fd.append('file', pd.file);
            const dr = await fetch('/api/person/professional-training/document', { method: 'POST', body: fd });
            if (!dr.ok) throw new Error('Failed to upload pending document');
          } catch {
            showToast(t('documentUploadFailed', { defaultValue: 'A document failed to upload; you can retry from edit mode.' }), 'error');
          }
        }
        setPendingDocs([]);
      }

      await loadTrainings();
      setDialogOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? translateApiError(error.message, t) : t('common:error', { defaultValue: 'An error occurred' }), 'error');
    }
  };

  const handleRemove = async (index: number) => {
    const training = trainings[index];
    if (training.id) {
      try {
        await fetch('/api/person/professional-training', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: training.id }),
        });
        await loadTrainings();
        showToast(t('deleted', { defaultValue: 'Record deleted' }), 'error');
      } catch {
        showToast(t('deleteFailed', { defaultValue: 'Failed to delete record' }), 'error');
      }
    }
  };

  // Document upload — works in both modes.
  //   Edit mode  → POST immediately, append result to editingDocs.
  //   Insert mode → queue locally; handleSubmit drains the queue after the
  //                 ProfessionalTraining row is created.
  const handleDocUpload = async () => {
    if (!docFile || !docTypeId) return;
    const typeOpt = documentTypes.find((dt) => dt.id === docTypeId);
    const typeName = typeOpt?.name ?? '';

    if (!editingId) {
      // Queue for post-save upload.
      setPendingDocs((prev) => [...prev, { file: docFile, professionalTrainingDocumentTypeId: docTypeId, typeName }]);
      setDocFile(null);
      setDocTypeId(0);
      showToast(t('documentQueued', { defaultValue: 'Document queued; will upload after save' }), 'success');
      return;
    }

    setDocUploading(true);
    try {
      const formData = new FormData();
      formData.append('professionalTrainingId', editingId);
      formData.append('professionalTrainingDocumentTypeId', String(docTypeId));
      formData.append('file', docFile);

      const response = await fetch('/api/person/professional-training/document', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to upload document');
      const result = await response.json();
      setEditingDocs((prev) => [...prev, result]);
      setDocFile(null);
      setDocTypeId(0);
      showToast(t('documentAdded', { defaultValue: 'Document uploaded' }), 'success');
    } catch (error) {
      showToast(error instanceof Error ? translateApiError(error.message, t) : t('common:error', { defaultValue: 'An error occurred' }), 'error');
    } finally {
      setDocUploading(false);
    }
  };

  // Remove a pending (not-yet-uploaded) doc from the queue.
  const handlePendingRemove = (index: number) => {
    setPendingDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const docTypeName = useCallback((doc: ProfessionalTrainingDocumentItem) => {
    const tr =
      doc.professionalTrainingDocumentType?.translations?.find((x) => x.languageId === langId) ||
      doc.professionalTrainingDocumentType?.translations?.[0];
    return tr?.name || doc.professionalTrainingDocumentType?.code || '';
  }, [langId]);

  const handleDocView = async (doc: ProfessionalTrainingDocumentItem) => {
    try {
      const res = await fetch(`/api/person/professional-training/document/${doc.id}/file?personId=${personId}`);
      if (!res.ok) throw new Error('view failed');
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), '_blank');
    } catch {
      showToast(t('downloadFailed', { defaultValue: 'Failed to open file' }), 'error');
    }
  };

  const handleDocDownload = async (doc: ProfessionalTrainingDocumentItem) => {
    try {
      const res = await fetch(`/api/person/professional-training/document/${doc.id}/file?personId=${personId}`);
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = doc.fileName; a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast(t('downloadFailed', { defaultValue: 'Failed to download file' }), 'error');
    }
  };

  const handleDocRemove = async (docId: string) => {
    try {
      await fetch('/api/person/professional-training/document', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: docId }),
      });
      setEditingDocs((prev) => prev.filter((d) => d.id !== docId));
      showToast(t('documentDeleted', { defaultValue: 'Document deleted' }), 'error');
    } catch {
      showToast(t('common:error', { defaultValue: 'An error occurred' }), 'error');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return localizeDigits(`${bytes} B`, locale);
    if (bytes < 1024 * 1024) return localizeDigits(`${(bytes / 1024).toFixed(1)} KB`, locale);
    return localizeDigits(`${(bytes / (1024 * 1024)).toFixed(1)} MB`, locale);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">9</span>
          {t('sectionTitle', { defaultValue: 'Professional Training' })}
          <Badge variant="outline">{trainings.length}</Badge>
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
              >
                <Plus className="h-4 w-4 ml-1" />
                {t('common:add', { defaultValue: 'Add' })}
              </Button>
            </div>
          )}

          {trainings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('noItems', { defaultValue: 'No records registered' })}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t('title', { defaultValue: 'Title' })}</TableHead>
                  <TableHead>{t('type', { defaultValue: 'Type' })}</TableHead>
                  <TableHead>{t('issuer', { defaultValue: 'Certificate Issuer' })}</TableHead>
                  <TableHead>{t('issueDate', { defaultValue: 'Issue Date' })}</TableHead>
                  <TableHead>{t('expiryDate', { defaultValue: 'Expiry Date' })}</TableHead>
                  <TableHead>{t('common:createdAt', { defaultValue: 'Created At' })}</TableHead>
                  <TableHead>{t('documents', { defaultValue: 'Documents' })}</TableHead>
                  <TableHead className="w-24">{t('common:actions', { defaultValue: 'Actions' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainings.map((item, index) => {
                  const type = typeOptions.find((tt) => tt.id === item.professionalTrainingTypeId);
                  const issuer = issuerOptions.find((it) => it.id === item.professionalTrainingCertificateIssuerId);
                  return (
                    <TableRow key={item.id || index}>
                      <TableCell>{(index + 1).toLocaleString(locale)}</TableCell>
                      <TableCell>{item.title || '-'}</TableCell>
                      <TableCell>{type?.name || '-'}</TableCell>
                      <TableCell>{issuer?.name || '-'}</TableCell>
                      <TableCell>{formatDate(item.issueDate)}</TableCell>
                      <TableCell>{formatDate(item.expiryDate)}</TableCell>
                      <TableCell style={{ unicodeBidi: "plaintext" }}>{formatDateTime(item.createdAt, locale)}</TableCell>
                      <TableCell>
                        {item.professionalTrainingDocuments && item.professionalTrainingDocuments.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {item.professionalTrainingDocuments.map((doc) => (
                              <div key={doc.id} className="flex items-center gap-1">
                                <span className="truncate max-w-[160px] text-xs">{doc.fileName}</span>
                                <Button asChild variant="ghost" size="icon" className="h-6 w-6" title={t('common:view', { defaultValue: 'View' })}>
                                  <a href={`/api/person/professional-training/document/${doc.id}/file?personId=${personId}`} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-3 w-3" />
                                  </a>
                                </Button>
                                <Button asChild variant="ghost" size="icon" className="h-6 w-6" title={t('common:download', { defaultValue: 'Download' })}>
                                  <a href={`/api/person/professional-training/document/${doc.id}/file?personId=${personId}`} download={doc.fileName}>
                                    <Download className="h-3 w-3" />
                                  </a>
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenEdit(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemove(index)}
                          >
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg border-white! dark:border-white!">
            <DialogHeader>
              <DialogTitle>
                {editingId
                  ? t('editDialog', { defaultValue: 'Edit Professional Training' })
                  : t('addDialog', { defaultValue: 'Add Professional Training' })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label>{t('title', { defaultValue: 'Title' })} <span className="text-destructive">*</span></Label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={t('titlePlaceholder', { defaultValue: 'Enter title' })}
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label>{t('type', { defaultValue: 'Type' })} <span className="text-destructive">*</span></Label>
                <Select value={formTypeId ? String(formTypeId) : ''} onValueChange={(v) => setFormTypeId(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectType', { defaultValue: 'Select type' })} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0" className="text-muted-foreground">{t('common:select', { defaultValue: 'Select' })}</SelectItem>
                    {typeOptions.map((tt) => (
                      <SelectItem key={tt.id} value={String(tt.id)}>{tt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Certificate Issuer */}
              <div className="space-y-2">
                <Label>{t('issuer', { defaultValue: 'Certificate Issuer' })} <span className="text-destructive">*</span></Label>
                <Select value={formIssuerId ? String(formIssuerId) : ''} onValueChange={(v) => setFormIssuerId(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectIssuer', { defaultValue: 'Select certificate issuer' })} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0" className="text-muted-foreground">{t('common:select', { defaultValue: 'Select' })}</SelectItem>
                    {issuerOptions.map((it) => (
                      <SelectItem key={it.id} value={String(it.id)}>{it.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Issue Date */}
              <div className="space-y-2">
                <Label>{t('issueDate', { defaultValue: 'Issue Date' })} <span className="text-destructive">*</span></Label>
                <DatePickerComponent
                  value={formIssueDate}
                  onChange={(value) => setFormIssueDate(value)}
                  placeholder={t('common:selectDate', { defaultValue: 'Select Date' })}
                  forcePersian={true}
                />
              </div>

              {/* Expiry Date */}
              <div className="space-y-2">
                <Label>{t('expiryDate', { defaultValue: 'Expiry Date' })}</Label>
                <DatePickerComponent
                  value={formExpiryDate}
                  onChange={(value) => setFormExpiryDate(value)}
                  placeholder={t('common:selectDate', { defaultValue: 'Select Date' })}
                  forcePersian={true}
                  minDate={formIssueDate ? new Date(formIssueDate) : undefined}
                />
              </div>

              {/* Professional Training Documents — visible in both insert and edit mode.
                  In insert mode, uploads queue locally and persist after Save. */}
              <div className="space-y-3 border-t pt-3">
                <Label className="text-sm font-semibold">{t('documents', { defaultValue: 'Documents' })}</Label>

                {editingDocs.length === 0 && pendingDocs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t('noDocuments', { defaultValue: 'No documents attached' })}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {editingDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-2 text-sm border rounded px-2 py-1">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{doc.fileName}</span>
                        <span className="text-xs text-muted-foreground">{docTypeName(doc)}</span>
                        <span className="text-xs text-muted-foreground">{formatFileSize(doc.fileSize)}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDocView(doc)} title={t('common:view', { defaultValue: 'View' })}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDocDownload(doc)} title={t('common:download', { defaultValue: 'Download' })}>
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleDocRemove(doc.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {pendingDocs.map((pd, idx) => (
                      <div key={`pending-${idx}`} className="flex items-center gap-2 text-sm border rounded px-2 py-1 border-dashed">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{pd.file.name}</span>
                        <span className="text-xs text-muted-foreground">{pd.typeName}</span>
                        <span className="text-xs text-amber-600">
                          {t('pendingUpload', { defaultValue: 'Will upload after save' })}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handlePendingRemove(idx)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {!isReadOnly && (
                  <div className="space-y-2">
                    <Select value={docTypeId ? String(docTypeId) : ''} onValueChange={(v) => setDocTypeId(Number(v))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectDocumentType', { defaultValue: 'Select document type' })} />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map((dt) => (
                          <SelectItem key={dt.id} value={String(dt.id)}>{dt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        className="flex-1"
                        onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!docFile || !docTypeId || docUploading}
                        onClick={handleDocUpload}
                      >
                        <Upload className="h-4 w-4 ml-1" />
                        {t('addDocument', { defaultValue: 'Add Document' })}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
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
