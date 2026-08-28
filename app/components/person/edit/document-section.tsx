'use client';

import { localizeDigits, formatDateTime, translateApiError } from '@/app/components/person/components/format-utils';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Pencil, Download, Eye, FileImage, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';
import type { ReferenceData } from './person-form';

interface DocumentSectionProps {
  personId: string;
  referenceData?: ReferenceData;
  isReadOnly?: boolean;
}

interface DocumentItem {
  id: number;
  personId: string;
  documentTypeId: number;
  storageInstanceId: number;
  fileName: string;
  fileSize: number;
  contentType: string;
  createdAt?: string;
  updatedAt?: string;
}

export function DocumentSection({ personId, referenceData, isReadOnly = false }: DocumentSectionProps) {
  const { t, i18n } = useTranslation('person-document');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';
  const langId = i18n.language === 'fa' ? 12 : 10;
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form state
  const [formDocTypeId, setFormDocTypeId] = useState<number>(0);
  const [formFile, setFormFile] = useState<File | null>(null);

  // Get unique document type IDs from translations
  const documentTypeIds = useMemo(() => {
    if (!referenceData?.documentTypeTranslations) return [];
    const ids = new Set<number>();
    referenceData.documentTypeTranslations.forEach((t) => ids.add(t.documentTypeId));
    return Array.from(ids).sort((a, b) => a - b);
  }, [referenceData?.documentTypeTranslations]);

  const getDocTypeName = (id: number) => {
    const tr = referenceData?.documentTypeTranslations?.find(
      (t) => t.documentTypeId === id && t.languageId === langId,
    );
    return tr?.name || '-';
  };

  const isImageType = (fileName: string) => {
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return localizeDigits(`${bytes} B`, locale);
    if (bytes < 1024 * 1024) return localizeDigits(`${(bytes / 1024).toFixed(1)} KB`, locale);
    return localizeDigits(`${(bytes / (1024 * 1024)).toFixed(1)} MB`, locale);
  };

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

  // Load documents from Person API
  const loadDocuments = useCallback(async () => {
    try {
      const response = await fetch(`/api/person/document?personId=${personId}`);
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data)) setDocuments(data);
    } catch {
      // Service not available
    }
  }, [personId]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const handleOpenAdd = () => {
    setEditingIndex(null);
    setFormDocTypeId(documentTypeIds.length > 0 ? documentTypeIds[0] : 0);
    setFormFile(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (index: number) => {
    const doc = documents[index];
    setEditingIndex(index);
    setFormDocTypeId(doc.documentTypeId);
    setFormFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingIndex === null && !formFile) {
      showToast(t('fileRequired', { defaultValue: 'Please select a file' }), 'error');
      return;
    }

    try {
      if (editingIndex !== null) {
        const existing = documents[editingIndex];
        const formData = new FormData();
        formData.append('id', String(existing.id));
        formData.append('personId', personId);
        formData.append('documentTypeId', String(formDocTypeId));
        if (formFile) formData.append('file', formFile);

        const response = await fetch('/api/person/document', {
          method: 'PUT',
          body: formData,
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to update document');
        }
        showToast(t('updated', { defaultValue: 'Document updated' }), 'success');
      } else {
        const formData = new FormData();
        formData.append('personId', personId);
        formData.append('documentTypeId', String(formDocTypeId));
        if (formFile) formData.append('file', formFile);

        const response = await fetch('/api/person/document', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to upload document');
        }
        showToast(t('added', { defaultValue: 'Document added' }), 'success');
      }

      setDialogOpen(false);
      await loadDocuments();
    } catch (error) {
      showToast(error instanceof Error ? translateApiError(error.message, t) : t('common:error', { defaultValue: 'An error occurred' }), 'error');
    }
  };

  const handleDelete = async (index: number) => {
    const doc = documents[index];
    try {
      await fetch('/api/person/document', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doc.id, personId }),
      });
      await loadDocuments();
      showToast(t('deleted', { defaultValue: 'Document deleted' }), 'error');
    } catch {
      showToast(t('deleteFailed', { defaultValue: 'Failed to delete document' }), 'error');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">11</span>
          {t('sectionTitle', { defaultValue: 'Documents & Images' })}
          <Badge variant="outline">{(documents.length).toLocaleString(locale)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!isReadOnly && (
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={handleOpenAdd}>
                <Plus className="h-4 w-4 ml-1" />
                {t('common:add', { defaultValue: 'Add' })}
              </Button>
            </div>
          )}

          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('noItems', { defaultValue: 'No documents registered' })}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t('documentType', { defaultValue: 'Document Type' })}</TableHead>
                  <TableHead>{t('fileName', { defaultValue: 'File Name' })}</TableHead>
                  <TableHead>{t('fileSize', { defaultValue: 'Size' })}</TableHead>
                  <TableHead>{t('common:createdAt', { defaultValue: 'Created At' })}</TableHead>
                  <TableHead>{t('common:updatedAt', { defaultValue: 'Last Modified' })}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc, index) => (
                  <TableRow key={doc.id}>
                    <TableCell>{(index + 1).toLocaleString(locale)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isImageType(doc.fileName)
                          ? <FileImage className="h-4 w-4 text-blue-500" />
                          : <FileText className="h-4 w-4 text-orange-500" />}
                        {getDocTypeName(doc.documentTypeId)}
                      </div>
                    </TableCell>
                    <TableCell>{doc.fileName}</TableCell>
                    <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                    <TableCell style={{ unicodeBidi: "plaintext" }}>{formatDateTime(doc.createdAt, locale)}</TableCell>
                    <TableCell style={{ unicodeBidi: "plaintext" }}>{formatDateTime(doc.updatedAt, locale)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8" title={t('common:view', { defaultValue: 'View' })}>
                          <a href={`/api/person/document/${doc.id}/file?personId=${personId}`} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8" title={t('common:download', { defaultValue: 'Download' })}>
                          <a href={`/api/person/document/${doc.id}/file?personId=${personId}`} download={doc.fileName}>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(index)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(index)}>
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
              <DialogTitle>
                {editingIndex !== null
                  ? t('editDialog', { defaultValue: 'Edit Document' })
                  : t('addDialog', { defaultValue: 'Add Document' })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Document type */}
              <div className="space-y-2">
                <Label>{t('documentType', { defaultValue: 'Document Type' })} <span className="text-destructive">*</span></Label>
                <Select value={String(formDocTypeId)} onValueChange={(v) => setFormDocTypeId(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypeIds.map((id) => (
                      <SelectItem key={id} value={String(id)}>
                        {getDocTypeName(id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* File upload */}
              <div className="space-y-2">
                <Label>
                  {t('file', { defaultValue: 'File' })}
                  {editingIndex === null && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                />
                {formFile && (
                  <p className="text-sm text-muted-foreground">
                    {formFile.name} ({formatFileSize(formFile.size)})
                  </p>
                )}
                {editingIndex !== null && !formFile && (
                  <p className="text-sm text-muted-foreground">
                    {t('keepExistingFile', { defaultValue: 'Current file will be kept' })}
                  </p>
                )}
              </div>
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
