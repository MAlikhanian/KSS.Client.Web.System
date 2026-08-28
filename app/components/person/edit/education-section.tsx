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
import { Plus, Trash2, Pencil, Upload, FileText, Loader2, Eye, Download } from 'lucide-react';
import { RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { toast } from 'sonner';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { apiClientFetch } from '@/lib/api-client';
import type { ReferenceData } from './person-form';

const PERSIAN_LANGUAGE_ID = 12;
const ENGLISH_LANGUAGE_ID = 10;

interface EducationSectionProps {
  personId: string;
  referenceData?: ReferenceData;
  isReadOnly?: boolean;
}

interface EducationDocumentItem {
  id: string;
  educationId: string;
  educationDocumentTypeId: number;
  storageInstanceId: number;
  fileName: string;
  fileSize: number;
  contentType: string;
  createdAt?: string;
  educationDocumentType?: {
    id: number;
    code: string;
    translations?: Array<{ languageId: number; name: string }>;
  };
}

interface EducationDocumentTypeOption {
  id: number;
  code: string;
  name: string;
}

interface PendingDoc {
  file: File;
  educationDocumentTypeId: number;
  typeName: string;
}

interface EducationItem {
  id?: string;
  personId: string;
  educationLevelId: number;
  fieldOfStudyId: number;
  institutionId: number;
  startDate: string;
  endDate: string;
  gpa: number | null;
  isCompleted: boolean;
  createdAt?: string;
  updatedAt?: string;
  educationDocuments?: EducationDocumentItem[];
}

interface LookupItem {
  id: number;
  name: string;
}

export function EducationSection({ personId, referenceData, isReadOnly = false }: EducationSectionProps) {
  const { t, i18n } = useTranslation('person-education');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';
  const [educations, setEducations] = useState<EducationItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [formEducationLevelId, setFormEducationLevelId] = useState<number>(0);
  const [formFieldOfStudyId, setFormFieldOfStudyId] = useState<number>(0);
  const [formCountryId, setFormCountryId] = useState<number>(0);
  const [formRegionId, setFormRegionId] = useState<number>(0);
  const [formCityId, setFormCityId] = useState<number>(0);
  const [formInstitutionId, setFormInstitutionId] = useState<number>(0);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formGpa, setFormGpa] = useState('');

  // Lookup data for cascading dropdowns
  const [countries, setCountries] = useState<LookupItem[]>([]);
  const [regions, setRegions] = useState<LookupItem[]>([]);
  const [cities, setCities] = useState<LookupItem[]>([]);
  const [institutions, setInstitutions] = useState<LookupItem[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);

  // Map for displaying institution names in the table
  const [institutionMap, setInstitutionMap] = useState<Map<number, string>>(new Map());

  // Document upload within dialog (works in both insert and edit modes)
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTypeId, setDocTypeId] = useState<number>(0);
  const [docUploading, setDocUploading] = useState(false);
  const [editingDocs, setEditingDocs] = useState<EducationDocumentItem[]>([]);
  // Pending docs are queued during insert mode and uploaded after the Education
  // row is created. Edit mode uploads them immediately.
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [documentTypes, setDocumentTypes] = useState<EducationDocumentTypeOption[]>([]);

  const langId = i18n.language === 'fa' ? PERSIAN_LANGUAGE_ID : ENGLISH_LANGUAGE_ID;
  const locationLangId = langId;
  const educationLevelOptions = referenceData?.educationLevelTranslations?.filter((el) => el.languageId === langId) || [];
  const fieldOfStudyOptions = referenceData?.fieldOfStudyTranslations?.filter((fs) => fs.languageId === langId) || [];

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

  // Load existing educations via per-section endpoint (includes EducationDocuments + DocumentType).
  const loadEducations = useCallback(async () => {
    try {
      const response = await fetch(`/api/person/education?personId=${personId}`);
      if (!response.ok) return;
      const raw: EducationItem[] = await response.json();

      if (Array.isArray(raw)) {
        const items: EducationItem[] = raw.map((e) => ({
          id: e.id,
          personId: e.personId || personId,
          educationLevelId: e.educationLevelId || 0,
          fieldOfStudyId: e.fieldOfStudyId || 0,
          institutionId: e.institutionId || 0,
          startDate: e.startDate ? (e.startDate as string).split('T')[0] : '',
          endDate: e.endDate ? (e.endDate as string).split('T')[0] : '',
          gpa: e.gpa ?? null,
          isCompleted: e.isCompleted || false,
          createdAt: e.createdAt as string,
          updatedAt: e.updatedAt as string,
          educationDocuments: e.educationDocuments || [],
        }));
        // Sort by startDate
        items.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        setEducations(items);

        // Load institution names for display in the table
        const instIds = Array.from(new Set(items.map((i) => i.institutionId).filter(Boolean)));
        if (instIds.length > 0) {
          // Fetch all institutions to build the map
          try {
            const res = await apiClientFetch(`/api/common/institutions?languageId=${langId}`);
            if (res.ok) {
              const data: LookupItem[] = await res.json();
              setInstitutionMap(new Map(data.map((inst) => [inst.id, inst.name])));
            }
          } catch {
            // Silently fail
          }
        }
      }
    } catch (error) {
      console.error('Error loading education data:', error);
    }
  }, [personId, langId]);

  useEffect(() => { loadEducations(); }, [loadEducations]);

  // Load EducationDocumentType lookup once per language
  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClientFetch(`/api/common/education-document-types?languageId=${langId}`);
        if (res.ok) {
          const data: EducationDocumentTypeOption[] = await res.json();
          setDocumentTypes(data);
        }
      } catch {
        // Silently fail
      }
    };
    load();
  }, [langId]);

  // Load countries on mount
  useEffect(() => {
    const loadCountries = async () => {
      setLoadingCountries(true);
      try {
        const res = await apiClientFetch(`/api/common/countries?languageId=${locationLangId}`);
        if (res.ok) {
          const data: LookupItem[] = await res.json();
          setCountries(data);
        }
      } catch {
        // Silently fail
      } finally {
        setLoadingCountries(false);
      }
    };
    loadCountries();
  }, [locationLangId]);

  // Cascading: country → regions
  const fetchRegions = useCallback(async (countryId: number) => {
    if (!countryId) { setRegions([]); setCities([]); setInstitutions([]); return; }
    setLoadingRegions(true);
    try {
      const res = await apiClientFetch(`/api/common/regions?countryId=${countryId}&languageId=${locationLangId}`);
      if (res.ok) {
        const data: LookupItem[] = await res.json();
        setRegions(data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingRegions(false);
    }
  }, [locationLangId]);

  // Cascading: region → cities
  const fetchCities = useCallback(async (regionId: number) => {
    if (!regionId) { setCities([]); setInstitutions([]); return; }
    setLoadingCities(true);
    try {
      const res = await apiClientFetch(`/api/common/cities?regionId=${regionId}&languageId=${locationLangId}`);
      if (res.ok) {
        const data: LookupItem[] = await res.json();
        setCities(data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingCities(false);
    }
  }, [locationLangId]);

  // Load institutions filtered by location
  const fetchInstitutions = useCallback(async (countryId: number, regionId: number, cityId: number) => {
    if (!countryId) { setInstitutions([]); return; }
    setLoadingInstitutions(true);
    try {
      let url = `/api/common/institutions?languageId=${langId}&countryId=${countryId}`;
      if (regionId) url += `&regionId=${regionId}`;
      if (cityId) url += `&cityId=${cityId}`;
      const res = await apiClientFetch(url);
      if (res.ok) {
        const data: LookupItem[] = await res.json();
        setInstitutions(data);
        // Also update the map for table display
        setInstitutionMap((prev) => {
          const map = new Map(prev);
          data.forEach((inst) => map.set(inst.id, inst.name));
          return map;
        });
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingInstitutions(false);
    }
  }, [langId]);

  const handleCountryChange = (value: string) => {
    const countryId = parseInt(value);
    setFormCountryId(countryId);
    setFormRegionId(0);
    setFormCityId(0);
    setFormInstitutionId(0);
    setRegions([]);
    setCities([]);
    setInstitutions([]);
    fetchRegions(countryId);
    fetchInstitutions(countryId, 0, 0);
  };

  const handleRegionChange = (value: string) => {
    const regionId = parseInt(value);
    setFormRegionId(regionId);
    setFormCityId(0);
    setFormInstitutionId(0);
    setCities([]);
    setInstitutions([]);
    fetchCities(regionId);
    fetchInstitutions(formCountryId, regionId, 0);
  };

  const handleCityChange = (value: string) => {
    const cityId = parseInt(value);
    setFormCityId(cityId);
    setFormInstitutionId(0);
    setInstitutions([]);
    fetchInstitutions(formCountryId, formRegionId, cityId);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormEducationLevelId(0);
    setFormFieldOfStudyId(0);
    setFormCountryId(0);
    setFormRegionId(0);
    setFormCityId(0);
    setFormInstitutionId(0);
    setFormStartDate('');
    setFormEndDate('');
    setFormGpa('');
    setDocFile(null);
    setDocTypeId(0);
    setPendingDocs([]);
    setEditingDocs([]);
    setRegions([]);
    setCities([]);
    setInstitutions([]);
    setDialogOpen(true);
  };

  const handleOpenEdit = async (edu: EducationItem) => {
    setEditingId(edu.id || null);
    setFormEducationLevelId(edu.educationLevelId);
    setFormFieldOfStudyId(edu.fieldOfStudyId);
    setFormInstitutionId(edu.institutionId);
    setFormStartDate(edu.startDate ? edu.startDate.split('T')[0] : '');
    setFormEndDate(edu.endDate ? edu.endDate.split('T')[0] : '');
    setFormGpa(edu.gpa !== null && edu.gpa !== undefined ? String(edu.gpa) : '');
    setDocFile(null);
    setDocTypeId(0);
    setPendingDocs([]);
    setEditingDocs(edu.educationDocuments || []);

    // Try to look up the institution's location to pre-populate cascading dropdowns
    if (edu.institutionId) {
      try {
        const res = await apiClientFetch(`/api/common/institutions/${edu.institutionId}`);
        if (res.ok) {
          const inst = await res.json();
          const countryId = inst.countryId || 0;
          const regionId = inst.regionId || 0;
          const cityId = inst.cityId || 0;
          setFormCountryId(countryId);
          setFormRegionId(regionId);
          setFormCityId(cityId);
          if (countryId) await fetchRegions(countryId);
          if (regionId) await fetchCities(regionId);
          await fetchInstitutions(countryId, regionId, cityId);
        } else {
          setFormCountryId(0);
          setFormRegionId(0);
          setFormCityId(0);
        }
      } catch {
        setFormCountryId(0);
        setFormRegionId(0);
        setFormCityId(0);
      }
    } else {
      setFormCountryId(0);
      setFormRegionId(0);
      setFormCityId(0);
      setRegions([]);
      setCities([]);
      setInstitutions([]);
    }

    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formEducationLevelId || !formFieldOfStudyId || !formInstitutionId || !formStartDate || !formGpa) {
      showToast(t('common:requiredFields', { defaultValue: 'Please fill all required fields' }), 'error');
      return;
    }

    try {
      const educationData = {
        personId,
        educationLevelId: formEducationLevelId,
        fieldOfStudyId: formFieldOfStudyId,
        institutionId: formInstitutionId,
        startDate: formStartDate,
        endDate: formEndDate || null,
        gpa: formGpa ? parseFloat(formGpa) : null,
        isCompleted: !!formEndDate,
      };

      let createdEducationId: string | null = editingId;
      if (editingId) {
        const response = await fetch('/api/person/education', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...educationData }),
        });
        if (!response.ok) throw new Error('Failed to update education');
        showToast(t('updated', { defaultValue: 'Education record updated' }), 'success');
      } else {
        const response = await fetch('/api/person/education', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: '00000000-0000-0000-0000-000000000000', ...educationData }),
        });
        if (!response.ok) throw new Error('Failed to add education');
        const created = await response.json();
        createdEducationId = created?.id || null;
        showToast(t('added', { defaultValue: 'Education record added' }), 'success');
      }

      // Upload any pending docs queued during insert mode.
      if (createdEducationId && pendingDocs.length > 0) {
        for (const pd of pendingDocs) {
          try {
            const fd = new FormData();
            fd.append('educationId', createdEducationId);
            fd.append('educationDocumentTypeId', String(pd.educationDocumentTypeId));
            fd.append('file', pd.file);
            const dr = await fetch('/api/person/education/document', { method: 'POST', body: fd });
            if (!dr.ok) throw new Error('Failed to upload pending document');
          } catch {
            showToast(t('documentUploadFailed', { defaultValue: 'A document failed to upload; you can retry from edit mode.' }), 'error');
          }
        }
        setPendingDocs([]);
      }

      await loadEducations();
      setDialogOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? translateApiError(error.message, t) : t('common:error', { defaultValue: 'An error occurred' }), 'error');
    }
  };

  const handleRemove = async (index: number) => {
    const education = educations[index];
    if (education.id) {
      try {
        await fetch('/api/person/education', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: education.id }),
        });
        await loadEducations();
        showToast(t('deleted', { defaultValue: 'Education record deleted' }), 'error');
      } catch {
        showToast(t('deleteFailed', { defaultValue: 'Failed to delete education record' }), 'error');
      }
    }
  };

  // Document upload — works in both modes.
  //   Edit mode  → POST immediately, append result to editingDocs.
  //   Insert mode → queue locally; handleSubmit drains the queue after the
  //                 Education row is created.
  const handleDocUpload = async () => {
    if (!docFile || !docTypeId) return;
    const typeOpt = documentTypes.find((dt) => dt.id === docTypeId);
    const typeName = typeOpt?.name ?? '';

    if (!editingId) {
      // Queue for post-save upload.
      setPendingDocs((prev) => [...prev, { file: docFile, educationDocumentTypeId: docTypeId, typeName }]);
      setDocFile(null);
      setDocTypeId(0);
      showToast(t('documentQueued', { defaultValue: 'Document queued; will upload after save' }), 'success');
      return;
    }

    setDocUploading(true);
    try {
      const formData = new FormData();
      formData.append('educationId', editingId);
      formData.append('educationDocumentTypeId', String(docTypeId));
      formData.append('file', docFile);

      const response = await fetch('/api/person/education/document', {
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

  const docTypeName = useCallback((doc: EducationDocumentItem) => {
    const tr =
      doc.educationDocumentType?.translations?.find((x) => x.languageId === langId) ||
      doc.educationDocumentType?.translations?.[0];
    return tr?.name || doc.educationDocumentType?.code || '';
  }, [langId]);

  const handleDocView = async (doc: EducationDocumentItem) => {
    try {
      const res = await fetch(`/api/person/education/document/${doc.id}/file?personId=${personId}`);
      if (!res.ok) throw new Error('view failed');
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), '_blank');
    } catch {
      showToast(t('downloadFailed', { defaultValue: 'Failed to open file' }), 'error');
    }
  };

  const handleDocDownload = async (doc: EducationDocumentItem) => {
    try {
      const res = await fetch(`/api/person/education/document/${doc.id}/file?personId=${personId}`);
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
      await fetch('/api/person/education/document', {
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
          <span className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">8</span>
          {t('sectionTitle', { defaultValue: 'Education' })}
          <Badge variant="outline">{educations.length}</Badge>
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

          {educations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('noItems', { defaultValue: 'No education records registered' })}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t('educationLevel', { defaultValue: 'Education Level' })}</TableHead>
                  <TableHead>{t('fieldOfStudy', { defaultValue: 'Field of Study' })}</TableHead>
                  <TableHead>{t('institution', { defaultValue: 'Institution' })}</TableHead>
                  <TableHead>{t('startDate', { defaultValue: 'Start Date' })}</TableHead>
                  <TableHead>{t('endDate', { defaultValue: 'End Date' })}</TableHead>
                  <TableHead>{t('gpa', { defaultValue: 'GPA' })}</TableHead>
                  <TableHead>{t('isCompleted', { defaultValue: 'Completed' })}</TableHead>
                  <TableHead>{t('common:createdAt', { defaultValue: 'Created At' })}</TableHead>
                  <TableHead>{t('documents', { defaultValue: 'Documents' })}</TableHead>
                  <TableHead className="w-24">{t('common:actions', { defaultValue: 'Actions' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {educations.map((item, index) => {
                  const level = educationLevelOptions.find((el) => el.educationLevelId === item.educationLevelId);
                  const field = fieldOfStudyOptions.find((fs) => fs.fieldOfStudyId === item.fieldOfStudyId);
                  return (
                    <TableRow key={item.id || index}>
                      <TableCell>{(index + 1).toLocaleString(locale)}</TableCell>
                      <TableCell>{level?.name || '-'}</TableCell>
                      <TableCell>{field?.name || '-'}</TableCell>
                      <TableCell>{institutionMap.get(item.institutionId) || '-'}</TableCell>
                      <TableCell>{formatDate(item.startDate)}</TableCell>
                      <TableCell>{formatDate(item.endDate)}</TableCell>
                      <TableCell>{item.gpa !== null && item.gpa !== undefined ? localizeDigits(String(item.gpa), locale) : '-'}</TableCell>
                      <TableCell>
                        {item.isCompleted ? (
                          <Badge variant="success" className="text-xs font-sans">
                            {t('isCompleted', { defaultValue: 'Completed' })}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell style={{ unicodeBidi: "plaintext" }}>{formatDateTime(item.createdAt, locale)}</TableCell>
                      <TableCell>
                        {item.educationDocuments && item.educationDocuments.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {item.educationDocuments.map((doc) => (
                              <div key={doc.id} className="flex items-center gap-1">
                                <span className="truncate max-w-[160px] text-xs">{doc.fileName}</span>
                                <Button asChild variant="ghost" size="icon" className="h-6 w-6" title={t('common:view', { defaultValue: 'View' })}>
                                  <a href={`/api/person/education/document/${doc.id}/file?personId=${personId}`} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-3 w-3" />
                                  </a>
                                </Button>
                                <Button asChild variant="ghost" size="icon" className="h-6 w-6" title={t('common:download', { defaultValue: 'Download' })}>
                                  <a href={`/api/person/education/document/${doc.id}/file?personId=${personId}`} download={doc.fileName}>
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
                  ? t('editDialog', { defaultValue: 'Edit Education' })
                  : t('addDialog', { defaultValue: 'Add Education' })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Education Level */}
              <div className="space-y-2">
                <Label>{t('educationLevel', { defaultValue: 'Education Level' })} <span className="text-destructive">*</span></Label>
                <Select value={formEducationLevelId ? String(formEducationLevelId) : ''} onValueChange={(v) => setFormEducationLevelId(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common:select', { defaultValue: 'Select' })} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0" className="text-muted-foreground">{t('common:select', { defaultValue: 'Select' })}</SelectItem>
                    {educationLevelOptions.map((el) => (
                      <SelectItem key={el.educationLevelId} value={String(el.educationLevelId)}>{el.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Field of Study */}
              <div className="space-y-2">
                <Label>{t('fieldOfStudy', { defaultValue: 'Field of Study' })} <span className="text-destructive">*</span></Label>
                <Select value={formFieldOfStudyId ? String(formFieldOfStudyId) : ''} onValueChange={(v) => setFormFieldOfStudyId(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common:select', { defaultValue: 'Select' })} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0" className="text-muted-foreground">{t('common:select', { defaultValue: 'Select' })}</SelectItem>
                    {fieldOfStudyOptions.map((fs) => (
                      <SelectItem key={fs.fieldOfStudyId} value={String(fs.fieldOfStudyId)}>{fs.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label>{t('country', { defaultValue: 'Country' })} <span className="text-destructive">*</span></Label>
                {loadingCountries ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t('common:loading', { defaultValue: 'Loading...' })}
                  </div>
                ) : (
                  <Select value={formCountryId ? String(formCountryId) : ''} onValueChange={handleCountryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectCountry', { defaultValue: 'Select Country' })} />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Region */}
              <div className="space-y-2">
                <Label>{t('region', { defaultValue: 'Province' })}</Label>
                {loadingRegions ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t('common:loading', { defaultValue: 'Loading...' })}
                  </div>
                ) : (
                  <Select value={formRegionId ? String(formRegionId) : ''} onValueChange={handleRegionChange} disabled={!formCountryId}>
                    <SelectTrigger>
                      <SelectValue placeholder={formCountryId
                        ? t('selectRegion', { defaultValue: 'Select Province' })
                        : t('selectCountryFirst', { defaultValue: 'Select country first' })} />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label>{t('city', { defaultValue: 'City' })}</Label>
                {loadingCities ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t('common:loading', { defaultValue: 'Loading...' })}
                  </div>
                ) : (
                  <Select value={formCityId ? String(formCityId) : ''} onValueChange={handleCityChange} disabled={!formRegionId}>
                    <SelectTrigger>
                      <SelectValue placeholder={formRegionId
                        ? t('selectCity', { defaultValue: 'Select City' })
                        : t('selectRegionFirst', { defaultValue: 'Select province first' })} />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Institution */}
              <div className="space-y-2">
                <Label>{t('institution', { defaultValue: 'Institution' })} <span className="text-destructive">*</span></Label>
                {loadingInstitutions ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t('common:loading', { defaultValue: 'Loading...' })}
                  </div>
                ) : (
                  <Select value={formInstitutionId ? String(formInstitutionId) : ''} onValueChange={(v) => setFormInstitutionId(Number(v))} disabled={!formCountryId}>
                    <SelectTrigger>
                      <SelectValue placeholder={formCountryId
                        ? t('selectInstitution', { defaultValue: 'Select Institution' })
                        : t('selectCountryFirst', { defaultValue: 'Select country first' })} />
                    </SelectTrigger>
                    <SelectContent>
                      {institutions.map((inst) => (
                        <SelectItem key={inst.id} value={String(inst.id)}>{inst.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label>{t('startDate', { defaultValue: 'Start Date' })} <span className="text-destructive">*</span></Label>
                <DatePickerComponent
                  value={formStartDate}
                  onChange={(value) => setFormStartDate(value)}
                  placeholder={t('common:selectDate', { defaultValue: 'Select Date' })}
                  forcePersian={true}
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label>{t('endDate', { defaultValue: 'End Date' })}</Label>
                <DatePickerComponent
                  value={formEndDate}
                  onChange={(value) => setFormEndDate(value)}
                  placeholder={t('common:selectDate', { defaultValue: 'Select Date' })}
                  forcePersian={true}
                  minDate={formStartDate ? new Date(formStartDate) : undefined}
                />
              </div>

              {/* GPA */}
              <div className="space-y-2">
                <Label>{t('gpa', { defaultValue: 'GPA' })} <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="20"
                  value={formGpa}
                  onChange={(e) => setFormGpa(e.target.value)}
                  placeholder={t('gpaPlaceholder', { defaultValue: 'e.g. 17.50' })}
                />
              </div>

              {/* Education Documents — visible in both insert and edit mode.
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
