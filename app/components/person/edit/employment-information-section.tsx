'use client';

import { localizeDigits, formatDateTime, translateApiError } from '@/app/components/person/components/format-utils';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { Plus, Trash2, Pencil, Loader2, FileText, Upload, Eye, Download } from 'lucide-react';
import { RiSearchLine, RiBuilding2Line, RiCloseLine, RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { toast } from 'sonner';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';
import { useQuery } from '@tanstack/react-query';
import { DatePickerComponent } from '@/components/ui/date-picker';
import type { ReferenceData } from './person-form';

interface EmploymentInformationSectionProps {
  personId: string;
  referenceData?: ReferenceData;
  isReadOnly?: boolean;
}

interface CompanyResult {
  id: string;
  name: string;
  nationalId: string | null;
  code: string;
  isActive: boolean;
}

interface EmploymentDocumentItem {
  id: string;
  employmentId: string;
  employmentDocumentTypeId: number;
  storageInstanceId: number;
  fileName: string;
  fileSize: number;
  contentType: string;
  createdAt?: string;
  employmentDocumentType?: {
    id: number;
    code: string;
    translations?: Array<{ languageId: number; name: string }>;
  };
}

interface EmploymentDocumentTypeOption {
  id: number;
  code: string;
  name: string;
}

interface PendingDoc {
  file: File;
  employmentDocumentTypeId: number;
  typeName: string;
}

interface EmploymentItem {
  id?: string;
  companyId: string;
  companyName?: string;
  companyNationalId?: string;
  employmentActivityFieldId: number;
  employmentActivityUnitId: number;
  employmentPositionId: number;
  contractTypeId: number;
  fromDate: string;
  toDate: string;
  isPrimary: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  employmentDocuments?: EmploymentDocumentItem[];
}

export function EmploymentInformationSection({ personId, referenceData, isReadOnly = false }: EmploymentInformationSectionProps) {
  const { t, i18n } = useTranslation('person-employment');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';
  const [employments, setEmployments] = useState<EmploymentItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Company search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyResult | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Form fields
  const [formActivityFieldId, setFormActivityFieldId] = useState<number>(0);
  const [formActivityUnitId, setFormActivityUnitId] = useState<number>(0);
  const [formPositionId, setFormPositionId] = useState<number>(0);
  const [formContractTypeId, setFormContractTypeId] = useState<number>(1);
  const [formFromDate, setFormFromDate] = useState('');
  const [formToDate, setFormToDate] = useState('');

  // Document upload within the dialog (mirrors the Education section).
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTypeId, setDocTypeId] = useState<number>(0);
  const [docUploading, setDocUploading] = useState(false);
  const [editingDocs, setEditingDocs] = useState<EmploymentDocumentItem[]>([]);
  // Pending docs are queued during insert mode and uploaded after the Employment
  // row is created. Edit mode uploads them immediately.
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [documentTypes, setDocumentTypes] = useState<EmploymentDocumentTypeOption[]>([]);

  const langId = i18n.language === 'fa' ? 12 : 10;
  const contractTypeOptions = referenceData?.contractTypeTranslations?.filter((ct) => ct.languageId === langId) || [];
  const activityFieldOptions = referenceData?.employmentActivityFieldTranslations?.filter((s) => s.languageId === langId) || [];
  // Cascade parent maps: unit -> field, position -> unit.
  const unitFieldMap = new Map((referenceData?.employmentActivityUnits || []).map((u) => [u.id, u.employmentActivityFieldId]));
  const positionUnitMap = new Map((referenceData?.employmentPositions || []).map((p) => [p.id, p.employmentActivityUnitId]));
  // Units shown only for the selected field; positions only for the selected unit.
  const activityUnitOptions = (referenceData?.employmentActivityUnitTranslations?.filter((u) => u.languageId === langId) || [])
    .filter((u) => formActivityFieldId !== 0 && unitFieldMap.get(u.employmentActivityUnitId) === formActivityFieldId);
  const positionOptions = (referenceData?.employmentPositionTranslations?.filter((p) => p.languageId === langId) || [])
    .filter((p) => formActivityUnitId !== 0 && positionUnitMap.get(p.employmentPositionId) === formActivityUnitId);

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

  // Company search query
  const { data: companySearchData, isFetching: isSearching } = useQuery({
    queryKey: ['company-search', searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/company/search?query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: searchQuery.length >= 2,
    staleTime: 30 * 1000,
  });

  const searchResults: CompanyResult[] = companySearchData || [];

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load existing employments via per-section endpoint (includes EmploymentDocuments + DocumentType).
  const loadEmployments = useCallback(async () => {
    try {
      const response = await fetch(`/api/person/employment?personId=${personId}`);
      if (!response.ok) return;
      const raw: EmploymentItem[] = await response.json();

      if (Array.isArray(raw)) {
        const items: EmploymentItem[] = [];
        // Fetch all companies once
        let allCompanies: CompanyResult[] = [];
        try {
          const compRes = await fetch(`/api/company/search?query=`);
          if (compRes.ok) allCompanies = await compRes.json();
        } catch { /* ignore */ }

        for (const e of raw) {
          const found = allCompanies.find((c) => c.id === e.companyId);
          items.push({
            id: e.id,
            companyId: e.companyId || '',
            companyName: found?.name || '',
            companyNationalId: found?.nationalId || '',
            employmentActivityFieldId: e.employmentActivityFieldId || 0,
              employmentActivityUnitId: e.employmentActivityUnitId || 0,
              employmentPositionId: e.employmentPositionId || 0,
            contractTypeId: e.contractTypeId || 1,
            fromDate: e.fromDate ? (e.fromDate as string).split('T')[0] : '',
            toDate: e.toDate ? (e.toDate as string).split('T')[0] : '',
            isPrimary: e.isPrimary || false,
            sortOrder: e.sortOrder || 0,
            createdAt: e.createdAt as string,
            updatedAt: e.updatedAt as string,
            employmentDocuments: e.employmentDocuments || [],
          });
        }
        // Sort by fromDate
        items.sort((a, b) => new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime());
        setEmployments(items);
      }
    } catch (error) {
      console.error('Error loading employment data:', error);
    }
  }, [personId]);

  useEffect(() => { loadEmployments(); }, [loadEmployments]);

  // Load EmploymentDocumentType lookup once per language.
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/common/employment-document-types?languageId=${langId}`);
        if (res.ok) {
          const data: EmploymentDocumentTypeOption[] = await res.json();
          setDocumentTypes(data);
        }
      } catch {
        // Silently fail — the upload dialog just shows an empty type list.
      }
    };
    load();
  }, [langId]);

  const currentEmployment = employments.length > 0 ? employments[employments.length - 1] : null;

  const handleSelectCompany = (company: CompanyResult) => {
    setSelectedCompany(company);
    setSearchQuery('');
    setSearchOpen(false);
  };

  const handleClearCompany = () => {
    setSelectedCompany(null);
    setSearchQuery('');
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setSelectedCompany(null);
    setSearchQuery('');
    // Auto-select the field when there's only one (currently a single CapitalMarket field).
    setFormActivityFieldId(activityFieldOptions.length === 1 ? activityFieldOptions[0].employmentActivityFieldId : 0);
    setFormActivityUnitId(0);
    setFormPositionId(0);
    setFormContractTypeId(contractTypeOptions[0]?.contractTypeId || 1);
    // Default start date: if previous record has toDate, use that
    if (currentEmployment?.toDate) {
      setFormFromDate(currentEmployment.toDate.split('T')[0]);
    } else {
      setFormFromDate(new Date().toISOString().split('T')[0]);
    }
    setFormToDate('');
    setDocFile(null);
    setDocTypeId(0);
    setPendingDocs([]);
    setEditingDocs([]);
    setDialogOpen(true);
  };

  const handleOpenEdit = (emp: EmploymentItem) => {
    setEditingId(emp.id || null);
    setSelectedCompany(emp.companyId ? { id: emp.companyId, name: emp.companyName || '', nationalId: emp.companyNationalId || null, code: '', isActive: true } : null);
    setSearchQuery('');
    setSearchOpen(false);
    setFormActivityFieldId(emp.employmentActivityFieldId);
    setFormActivityUnitId(emp.employmentActivityUnitId);
    setFormPositionId(emp.employmentPositionId);
    setFormContractTypeId(emp.contractTypeId);
    setFormFromDate(emp.fromDate ? emp.fromDate.split('T')[0] : '');
    setFormToDate(emp.toDate ? emp.toDate.split('T')[0] : '');
    setDocFile(null);
    setDocTypeId(0);
    setPendingDocs([]);
    setEditingDocs(emp.employmentDocuments || []);
    setDialogOpen(true);
  };

  const validateDates = (): string | null => {
    if (!formFromDate) {
      return t('startDateRequired', { defaultValue: 'Start date is required' });
    }

    if (formToDate) {
      const endDate = new Date(formToDate);
      const startDate = new Date(formFromDate);
      if (endDate <= startDate) return t('endDateAfterStart', { defaultValue: 'End date must be after start date' });
    } else {
      // Adding new: validate dates
      const startDate = new Date(formFromDate);
      if (formToDate) {
      }
      if (formToDate) {
        const endDate = new Date(formToDate);
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

    if (!formActivityFieldId || !formActivityUnitId || !formPositionId || !formContractTypeId) {
      showToast(t('requiredFields', { defaultValue: 'Activity field, unit, position and contract type are required' }), 'error');
      return;
    }

    try {
      if (editingId) {
        // Update all fields
        const existing = employments.find((e) => e.id === editingId);
        if (!existing) return;
        if (!selectedCompany) {
          showToast(t('selectCompany', { defaultValue: 'Please select a company' }), 'error');
          return;
        }

        const response = await fetch('/api/person/employment', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            personId,
            companyId: selectedCompany.id,
            employmentActivityFieldId: formActivityFieldId,
            employmentActivityUnitId: formActivityUnitId,
            employmentPositionId: formPositionId,
            contractTypeId: formContractTypeId,
            fromDate: formFromDate,
            toDate: formToDate || undefined,
            isPrimary: false,
            sortOrder: 0,
          }),
        });
        if (!response.ok) throw new Error('Failed to update employment');
        showToast(t('updated', { defaultValue: 'Work experience updated' }), 'success');
      } else {
        // Add new
        if (!selectedCompany) {
          showToast(t('selectCompany', { defaultValue: 'Please select a company' }), 'error');
          return;
        }

        // No id — the backend stamps the GUID (frontend must not generate one).
        const response = await fetch('/api/person/employment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personId,
            companyId: selectedCompany.id,
            employmentActivityFieldId: formActivityFieldId,
            employmentActivityUnitId: formActivityUnitId,
            employmentPositionId: formPositionId,
            contractTypeId: formContractTypeId,
            fromDate: formFromDate,
            toDate: formToDate || undefined,
            isPrimary: false,
            sortOrder: 0,
          }),
        });
        if (!response.ok) throw new Error('Failed to add employment');
        const created = await response.json();
        const createdEmploymentId: string | null = created?.id || null;
        showToast(t('added', { defaultValue: 'Work experience added' }), 'success');

        // Upload any docs queued during insert mode, now that the row exists.
        if (createdEmploymentId && pendingDocs.length > 0) {
          for (const pd of pendingDocs) {
            try {
              const fd = new FormData();
              fd.append('employmentId', createdEmploymentId);
              fd.append('employmentDocumentTypeId', String(pd.employmentDocumentTypeId));
              fd.append('file', pd.file);
              const dr = await fetch('/api/person/employment/document', { method: 'POST', body: fd });
              if (!dr.ok) throw new Error('Failed to upload pending document');
            } catch {
              showToast(t('documentUploadFailed', { defaultValue: 'A document failed to upload; you can retry from edit mode.' }), 'error');
            }
          }
          setPendingDocs([]);
        }
      }

      await loadEmployments();
      setDialogOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? translateApiError(error.message, t) : t('common:error', { defaultValue: 'An error occurred' }), 'error');
    }
  };

  const handleRemove = async (index: number) => {

    const employment = employments[index];
    if (employment.id) {
      try {
        await fetch('/api/person/employment', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: employment.id }),
        });
        await loadEmployments();
        showToast(t('deleted', { defaultValue: 'Work experience deleted' }), 'error');
      } catch {
        showToast(t('deleteFailed', { defaultValue: 'Failed to delete work experience' }), 'error');
      }
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  // ── Document upload — edit mode uploads immediately; insert mode queues. ──
  const handleDocUpload = async () => {
    if (!docFile || !docTypeId) return;
    const typeOpt = documentTypes.find((dt) => dt.id === docTypeId);
    const typeName = typeOpt?.name ?? '';

    if (!editingId) {
      setPendingDocs((prev) => [...prev, { file: docFile, employmentDocumentTypeId: docTypeId, typeName }]);
      setDocFile(null);
      setDocTypeId(0);
      showToast(t('documentQueued', { defaultValue: 'Document queued; will upload after save' }), 'success');
      return;
    }

    setDocUploading(true);
    try {
      const formData = new FormData();
      formData.append('employmentId', editingId);
      formData.append('employmentDocumentTypeId', String(docTypeId));
      formData.append('file', docFile);

      const response = await fetch('/api/person/employment/document', { method: 'POST', body: formData });
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

  const handlePendingRemove = (index: number) => {
    setPendingDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDocView = async (doc: EmploymentDocumentItem) => {
    try {
      const res = await fetch(`/api/person/employment/document/${doc.id}/file?personId=${personId}`);
      if (!res.ok) throw new Error('view failed');
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), '_blank');
    } catch {
      showToast(t('downloadFailed', { defaultValue: 'Failed to open file' }), 'error');
    }
  };

  const handleDocDownload = async (doc: EmploymentDocumentItem) => {
    try {
      const res = await fetch(`/api/person/employment/document/${doc.id}/file?personId=${personId}`);
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

  const handleDocRemove = async (doc: EmploymentDocumentItem) => {
    try {
      await fetch('/api/person/employment/document', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doc.id, storageInstanceId: doc.storageInstanceId }),
      });
      setEditingDocs((prev) => prev.filter((d) => d.id !== doc.id));
      showToast(t('documentDeleted', { defaultValue: 'Document deleted' }), 'error');
    } catch {
      showToast(t('common:error', { defaultValue: 'An error occurred' }), 'error');
    }
  };

  const docTypeName = useCallback((doc: EmploymentDocumentItem) => {
    const tr =
      doc.employmentDocumentType?.translations?.find((x) => x.languageId === langId) ||
      doc.employmentDocumentType?.translations?.[0];
    return tr?.name || doc.employmentDocumentType?.code || '';
  }, [langId]);

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
          <span className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">7</span>
          {t('sectionTitle', { defaultValue: 'Work Experience' })}
          <Badge variant="outline">{employments.length}</Badge>
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

          {employments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('noItems', { defaultValue: 'No work experience records' })}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t('company', { defaultValue: 'Company' })}</TableHead>
                  <TableHead>{t('nationalId', { defaultValue: 'National ID' })}</TableHead>
                  <TableHead>{t('activityField', { defaultValue: 'Business Sector' })}</TableHead>
                  <TableHead>{t('activityUnit', { defaultValue: 'Business Unit' })}</TableHead>
                  <TableHead>{t('position', { defaultValue: 'Position' })}</TableHead>
                  <TableHead>{t('contractType', { defaultValue: 'Contract Type' })}</TableHead>
                  <TableHead>{t('common:startDate', { defaultValue: 'From Date' })}</TableHead>
                  <TableHead>{t('common:endDate', { defaultValue: 'To Date' })}</TableHead>
                  <TableHead>{t('common:createdAt', { defaultValue: 'Created At' })}</TableHead>
                  <TableHead>{t('common:updatedAt', { defaultValue: 'Last Modified' })}</TableHead>
                  <TableHead>{t('documents', { defaultValue: 'Documents' })}</TableHead>
                  <TableHead className="w-24">{t('common:actions', { defaultValue: 'Actions' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employments.map((item, index) => {
                  const sector = activityFieldOptions.find((s) => s.employmentActivityFieldId === item.employmentActivityFieldId);
                  const unit = activityUnitOptions.find((u) => u.employmentActivityUnitId === item.employmentActivityUnitId);
                  const position = positionOptions.find((p) => p.employmentPositionId === item.employmentPositionId);
                  const isLast = index === employments.length - 1;
                  const isCurrent = isLast && !item.toDate;
                  return (
                    <TableRow key={item.id || index} className={isCurrent ? 'bg-muted/30' : ''}>
                      <TableCell>{(index + 1).toLocaleString(locale)}</TableCell>
                      <TableCell>{item.companyName || item.companyId}</TableCell>
                      <TableCell>{localizeDigits(item.companyNationalId, locale)}</TableCell>
                      <TableCell>{sector?.name || '-'}</TableCell>
                      <TableCell>{unit?.name || '-'}</TableCell>
                      <TableCell>{position?.name || '-'}</TableCell>
                      <TableCell>{contractTypeOptions.find((ct) => ct.contractTypeId === item.contractTypeId)?.name || '-'}</TableCell>
                      <TableCell>{formatDate(item.fromDate)}</TableCell>
                      <TableCell>
                        {item.toDate ? formatDate(item.toDate) : (
                          <Badge variant="success" className="text-xs font-sans">
                            {t('common:current', { defaultValue: 'Current' })}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell style={{ unicodeBidi: "plaintext" }}>{formatDateTime(item.createdAt, locale)}</TableCell>
                      <TableCell style={{ unicodeBidi: "plaintext" }}>{formatDateTime(item.updatedAt, locale)}</TableCell>
                      <TableCell>
                        {item.employmentDocuments && item.employmentDocuments.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {item.employmentDocuments.map((doc) => (
                              <div key={doc.id} className="flex items-center gap-1">
                                <span className="truncate max-w-[160px] text-xs">{doc.fileName}</span>
                                <Button asChild variant="ghost" size="icon" className="h-6 w-6" title={t('common:view', { defaultValue: 'View' })}>
                                  <a href={`/api/person/employment/document/${doc.id}/file?personId=${personId}`} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-3 w-3" />
                                  </a>
                                </Button>
                                <Button asChild variant="ghost" size="icon" className="h-6 w-6" title={t('common:download', { defaultValue: 'Download' })}>
                                  <a href={`/api/person/employment/document/${doc.id}/file?personId=${personId}`} download={doc.fileName}>
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
                  ? t('editDialog', { defaultValue: 'Edit Work Experience' })
                  : t('addDialog', { defaultValue: 'Add Work Experience' })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
                  {/* Company search */}
                  <div className="space-y-2">
                    <Label>{t('company', { defaultValue: 'Company' })} <span className="text-destructive">*</span></Label>
                    {selectedCompany ? (
                      <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-muted/30">
                        <RiBuilding2Line className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm">
                          {selectedCompany.name}
                          {selectedCompany.nationalId && (
                            <span className="text-muted-foreground mr-2">({selectedCompany.nationalId})</span>
                          )}
                        </span>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={handleClearCompany}>
                          <RiCloseLine className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div ref={searchRef} className="relative">
                        <div className="relative">
                          <RiSearchLine className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setSearchOpen(true);
                            }}
                            onFocus={() => searchQuery.length >= 2 && setSearchOpen(true)}
                            placeholder={t('searchCompany', { defaultValue: 'Search company name or national ID...' })}
                            className="pr-9"
                          />
                          {isSearching && <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                        </div>
                        {searchOpen && searchQuery.length >= 2 && (
                          <div className="absolute z-50 w-full mt-1 border rounded-md bg-popover shadow-md max-h-48 overflow-auto">
                            {searchResults.length === 0 && !isSearching ? (
                              <div className="p-3 text-sm text-muted-foreground text-center">
                                {t('noCompanyFound', { defaultValue: 'No company found' })}
                              </div>
                            ) : (
                              searchResults.map((company) => (
                                <button
                                  key={company.id}
                                  type="button"
                                  className="w-full text-right px-3 py-2 hover:bg-accent text-sm flex items-center gap-2"
                                  onClick={() => handleSelectCompany(company)}
                                >
                                  <RiBuilding2Line className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="flex-1">{company.name}</span>
                                  {company.nationalId && (
                                    <span className="text-xs text-muted-foreground font-mono">{company.nationalId}</span>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Business Sector */}
                  <div className="space-y-2">
                    <Label>{t('activityField', { defaultValue: 'Business Sector' })} <span className="text-destructive">*</span></Label>
                    <Select value={formActivityFieldId ? String(formActivityFieldId) : ''} onValueChange={(v) => { setFormActivityFieldId(Number(v)); setFormActivityUnitId(0); setFormPositionId(0); }}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common:select', { defaultValue: 'Select' })} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0" className="text-muted-foreground">{t('common:select', { defaultValue: 'Select' })}</SelectItem>
                        {activityFieldOptions.map((s) => (
                          <SelectItem key={s.employmentActivityFieldId} value={String(s.employmentActivityFieldId)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Business Unit */}
                  <div className="space-y-2">
                    <Label>{t('activityUnit', { defaultValue: 'Business Unit' })} <span className="text-destructive">*</span></Label>
                    <Select value={formActivityUnitId ? String(formActivityUnitId) : ''} disabled={!formActivityFieldId} onValueChange={(v) => { setFormActivityUnitId(Number(v)); setFormPositionId(0); }}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common:select', { defaultValue: 'Select' })} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0" className="text-muted-foreground">{t('common:select', { defaultValue: 'Select' })}</SelectItem>
                        {activityUnitOptions.map((u) => (
                          <SelectItem key={u.employmentActivityUnitId} value={String(u.employmentActivityUnitId)}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Job Position */}
                  <div className="space-y-2">
                    <Label>{t('position', { defaultValue: 'Position' })} <span className="text-destructive">*</span></Label>
                    <Select value={formPositionId ? String(formPositionId) : ''} disabled={!formActivityUnitId} onValueChange={(v) => setFormPositionId(Number(v))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common:select', { defaultValue: 'Select' })} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0" className="text-muted-foreground">{t('common:select', { defaultValue: 'Select' })}</SelectItem>
                        {positionOptions.map((p) => (
                          <SelectItem key={p.employmentPositionId} value={String(p.employmentPositionId)}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Contract type */}
                  <div className="space-y-2">
                    <Label>{t('contractType', { defaultValue: 'Contract Type' })} <span className="text-destructive">*</span></Label>
                    <Select value={String(formContractTypeId)} onValueChange={(v) => setFormContractTypeId(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {contractTypeOptions.map((ct) => (
                          <SelectItem key={ct.contractTypeId} value={String(ct.contractTypeId)}>{ct.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* From date */}
                  <div className="space-y-2">
                    <Label>{t('common:startDate', { defaultValue: 'Start Date' })} <span className="text-destructive">*</span></Label>
                    <DatePickerComponent
                      value={formFromDate}
                      onChange={(value) => setFormFromDate(value)}
                      placeholder={t('selectDate', { defaultValue: 'Select Date' })}
                      forcePersian={true}
                    />
                  </div>

                  {/* To date (optional) */}
                  <div className="space-y-2">
                    <Label>{t('common:endDate', { defaultValue: 'End Date' })}</Label>
                    <DatePickerComponent
                      value={formToDate}
                      onChange={(value) => setFormToDate(value)}
                      placeholder={t('selectDate', { defaultValue: 'Select Date' })}
                      forcePersian={true}
                      minDate={formFromDate ? new Date(formFromDate) : undefined}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('endDateOptional', { defaultValue: 'Leave empty if period is current' })}
                    </p>
                  </div>

                  {/* Documents — visible in both insert and edit mode.
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
                              onClick={() => handleDocRemove(doc)}
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
