'use client';

import { localizeDigits, formatDateTime, translateApiError } from '@/app/components/person/components/format-utils';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { RiSearchLine, RiCloseLine, RiUserLine, RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { toast } from 'sonner';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';
import { useQuery } from '@tanstack/react-query';
import type { ReferenceData } from './person-form';

interface RelationshipSectionProps {
  personId: string;
  referenceData?: ReferenceData;
  isReadOnly?: boolean;
}

interface RelationshipItem {
  id?: string;
  relatedPersonId: string;
  relationshipTypeId: number;
  relatedPersonName?: string;
  relatedPersonNationalId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PersonResult {
  id: string;
  nationalId: string;
  translations: Array<{
    languageId: number;
    firstName: string;
    lastName: string;
    fatherName?: string | null;
  }>;
}

const PERSIAN_LANGUAGE_ID = 12;

export function RelationshipSection({ personId, referenceData, isReadOnly = false }: RelationshipSectionProps) {
  const { t, i18n } = useTranslation('person-relationship');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';
  const [relationships, setRelationships] = useState<RelationshipItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const typeOptions = useMemo(() => referenceData?.relationshipTypeTranslations?.filter((t) => t.languageId === PERSIAN_LANGUAGE_ID) || [], [referenceData?.relationshipTypeTranslations]);

  // Dialog form state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonResult | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [relationshipTypeId, setRelationshipTypeId] = useState<number>(typeOptions[0]?.relationshipTypeId || 1);

  useEffect(() => {
    if (typeOptions.length > 0 && relationshipTypeId === 1) {
      setRelationshipTypeId(typeOptions[0].relationshipTypeId);
    }
  }, [typeOptions, relationshipTypeId]);

  const getPersonName = (person: PersonResult) => {
    const tr = person.translations?.find((t) => t.languageId === PERSIAN_LANGUAGE_ID) || person.translations?.[0];
    return tr ? `${tr.firstName} ${tr.lastName}`.trim() : person.nationalId || person.id;
  };

  // Search query
  const { data: searchData, isFetching } = useQuery({
    queryKey: ['relationship-person-search', searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/person?query=${encodeURIComponent(searchQuery)}&limit=20`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: searchQuery.length >= 2,
    staleTime: 30 * 1000,
  });

  const searchResults: PersonResult[] = searchData?.data || [];

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load existing relationships
  const loadData = useCallback(async () => {
    try {
      const response = await fetch(`/api/person/relationship?personId=${personId}`);
      if (!response.ok) return;
      const raw: Array<Record<string, unknown>> = await response.json();

      const rels: RelationshipItem[] = [];
      if (Array.isArray(raw) && raw.length > 0) {
        let allPersons: PersonResult[] = [];
        try {
          const relRes = await fetch(`/api/person?query=&limit=10000`);
          if (relRes.ok) {
            const relData = await relRes.json();
            allPersons = relData.data || [];
          }
        } catch { /* ignore */ }

        for (const r of raw) {
          const relPerson = allPersons.find((p: PersonResult) => p.id === r.relatedPersonId);
          const tr = relPerson?.translations?.find((t) => t.languageId === PERSIAN_LANGUAGE_ID) || relPerson?.translations?.[0];
          const personName = tr ? `${tr.firstName} ${tr.lastName}`.trim() : (relPerson?.nationalId || relPerson?.id || '');
          rels.push({
            id: r.id as string,
            relatedPersonId: r.relatedPersonId as string,
            relationshipTypeId: r.relationshipTypeId as number,
            relatedPersonName: personName,
            relatedPersonNationalId: relPerson?.nationalId || '',
            createdAt: r.createdAt as string,
            updatedAt: r.updatedAt as string,
          });
        }
      }
      setRelationships(rels);
    } catch (error) {
      console.error('Error loading relationships:', error);
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

  const handleOpenDialog = () => {
    setEditingIndex(null);
    setSelectedPerson(null);
    setSearchQuery('');
    setSearchOpen(false);
    setRelationshipTypeId(typeOptions[0]?.relationshipTypeId || 1);
    setDialogOpen(true);
  };

  const handleEditRelationship = (index: number) => {
    const item = relationships[index];
    setEditingIndex(index);
    setRelationshipTypeId(item.relationshipTypeId);
    setSelectedPerson(null);
    setSearchQuery('');
    setSearchOpen(false);
    setDialogOpen(true);
  };

  const handleSelectPerson = (person: PersonResult) => {
    if (person.id === personId) {
      showToast(t('cannotRelateSelf', { defaultValue: 'Cannot relate person to themselves' }), 'error');
      return;
    }
    setSelectedPerson(person);
    setSearchQuery('');
    setSearchOpen(false);
  };

  const handleClearPerson = () => {
    setSelectedPerson(null);
    setSearchQuery('');
    setSearchOpen(false);
  };

  const handleSave = async () => {
    // Edit mode: only update relationship type
    if (editingIndex !== null) {
      const existing = relationships[editingIndex];
      try {
        const response = await fetch('/api/person/relationship', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...existing, relationshipTypeId, personId }),
        });
        if (!response.ok) throw new Error('Failed to update relationship');
        setRelationships((prev) => prev.map((r, i) => i === editingIndex ? { ...r, relationshipTypeId } : r));
        setDialogOpen(false);
        showToast(t('updated', { defaultValue: 'Relationship updated' }), 'success');
        await loadData();
      } catch (error) {
        showToast(error instanceof Error ? translateApiError(error.message, t) : t('common:error', { defaultValue: 'An error occurred' }), 'error');
      }
      return;
    }

    // Add mode
    if (!selectedPerson) {
      showToast(t('selectRelatedPerson', { defaultValue: 'Please select a related person' }), 'error');
      return;
    }

    if (relationships.some((r) => r.relatedPersonId === selectedPerson.id && r.relationshipTypeId === relationshipTypeId)) {
      showToast(t('duplicate', { defaultValue: 'This relationship already exists' }), 'error');
      return;
    }

    try {
      const newId = crypto.randomUUID();
      const response = await fetch('/api/person/relationship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newId,
          personId,
          relatedPersonId: selectedPerson.id,
          relationshipTypeId,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to add relationship');
      }
      const result = await response.json();
      setRelationships((prev) => [...prev, {
        id: result.id || newId,
        relatedPersonId: selectedPerson.id,
        relationshipTypeId,
        relatedPersonName: getPersonName(selectedPerson),
        relatedPersonNationalId: selectedPerson.nationalId,
      }]);
      setDialogOpen(false);
      showToast(t('added', { defaultValue: 'Relationship added' }), 'success');
      await loadData();
    } catch (error) {
      showToast(error instanceof Error ? translateApiError(error.message, t) : t('common:error', { defaultValue: 'An error occurred' }), 'error');
    }
  };

  const handleRemove = async (index: number) => {
    const rel = relationships[index];
    if (rel.id) {
      try {
        await fetch('/api/person/relationship', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: rel.id }),
        });
      } catch {
        showToast(t('deleteFailed', { defaultValue: 'Failed to delete relationship' }), 'error');
        return;
      }
    }
    setRelationships((prev) => prev.filter((_, i) => i !== index));
    showToast(t('deleted', { defaultValue: 'Relationship deleted' }), 'error');
    await loadData();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">10</span>
          {t('sectionTitle', { defaultValue: 'Relationships' })}
          <Badge variant="outline">{relationships.length}</Badge>
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

          {relationships.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('noItems', { defaultValue: 'No relationships registered' })}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t('relationshipType', { defaultValue: 'Relationship Type' })}</TableHead>
                  <TableHead>{t('relatedPerson', { defaultValue: 'Related Person' })}</TableHead>
                  <TableHead>{t('nationalCode', { defaultValue: 'National Code' })}</TableHead>
                  <TableHead>{t('common:createdAt', { defaultValue: 'Created At' })}</TableHead>
                  <TableHead>{t('common:updatedAt', { defaultValue: 'Last Modified' })}</TableHead>
                  <TableHead className="w-20">{t('common:actions', { defaultValue: 'Actions' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relationships.map((item, index) => {
                  const type = typeOptions.find((t) => t.relationshipTypeId === item.relationshipTypeId);
                  return (
                    <TableRow key={item.id || index}>
                      <TableCell>{(index + 1).toLocaleString(locale)}</TableCell>
                      <TableCell>{type?.name || '-'}</TableCell>
                      <TableCell>{item.relatedPersonName || item.relatedPersonId}</TableCell>
                      <TableCell>{localizeDigits(item.relatedPersonNationalId, locale)}</TableCell>
                      <TableCell style={{ unicodeBidi: "plaintext" }}>{formatDateTime(item.createdAt, locale)}</TableCell>
                      <TableCell style={{ unicodeBidi: "plaintext" }}>{formatDateTime(item.updatedAt, locale)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditRelationship(index)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemove(index)}>
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
              <DialogTitle>{editingIndex !== null ? t('editDialog', { defaultValue: 'Edit Relationship' }) : t('addDialog', { defaultValue: 'Add Relationship' })}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Relationship type */}
              <div className="space-y-2">
                <Label>{t('relationshipType', { defaultValue: 'Relationship Type' })} <span className="text-destructive">*</span></Label>
                <Select value={String(relationshipTypeId)} onValueChange={(v) => setRelationshipTypeId(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((opt) => (
                      <SelectItem key={opt.relationshipTypeId} value={String(opt.relationshipTypeId)}>{opt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Person search — only in add mode */}
              {editingIndex === null && <div className="space-y-2">
                <Label>{t('relatedPerson', { defaultValue: 'Related Person' })} <span className="text-destructive">*</span></Label>
                {selectedPerson ? (
                  <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-muted/30">
                    <RiUserLine className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm">
                      {getPersonName(selectedPerson)}
                      {selectedPerson.nationalId && (
                        <span className="text-muted-foreground mr-2">({selectedPerson.nationalId})</span>
                      )}
                    </span>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={handleClearPerson}>
                      <RiCloseLine className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div ref={searchRef} className="relative">
                    <div className="relative">
                      <RiSearchLine className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                        onFocus={() => searchQuery.length >= 2 && setSearchOpen(true)}
                        placeholder={t('person-search:placeholder', { defaultValue: 'Name, family name or national code...' })}
                        className="pr-9"
                      />
                    </div>
                    {searchOpen && searchQuery.length >= 2 && (
                      <div className="absolute z-50 w-full mt-1 border rounded-md bg-popover shadow-md max-h-48 overflow-auto">
                        {isFetching ? (
                          <div className="p-3 text-sm text-muted-foreground text-center">
                            {t('common:loading', { defaultValue: 'Loading...' })}
                          </div>
                        ) : searchResults.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground text-center">
                            {t('person-search:noResults', { defaultValue: 'No results found' })}
                          </div>
                        ) : (
                          searchResults.map((person) => (
                            <button
                              key={person.id}
                              type="button"
                              className="w-full text-right px-3 py-2 hover:bg-accent text-sm flex items-center gap-2"
                              onClick={() => handleSelectPerson(person)}
                            >
                              <RiUserLine className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="flex-1">{getPersonName(person)}</span>
                              {person.nationalId && (
                                <span className="text-xs text-muted-foreground font-mono">{person.nationalId}</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>}
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
