'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RiCheckboxCircleFill, RiErrorWarningFill, RiInformationFill } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';
import { NameSection } from './name-section';
import { PersonalInformationSection } from './personal-information-section';
import { ContactInformationSection } from './contact-information-section';
import { EmploymentInformationSection } from './employment-information-section';
import { EducationSection } from './education-section';
import { ProfessionalTrainingSection } from './professional-training-section';
import { StatusSection } from './status-section';
import { DocumentSection } from './document-section';
import { RelationshipSection } from './relationship-section';
import { NationalitySection } from './nationality-section';
import { type PersonSearchResult } from '@/components/common/person-search';
import { PersonSelectionCard } from '@/app/components/person/components/person-selection-card';
import { usePersonContext } from '@/app/components/person/contexts/person-context';
import type { PersonTranslationEntry } from './person-name-grid';
import { translateApiError } from '@/app/components/person/components/format-utils';

/** Full person detail from API — used for form population */
interface PersonDetail {
  id: string;
  nationalId: string;
  sexId: number;
  preferredLanguageId: number;
  dateOfBirth: string;
  birthCountryId: number;
  birthRegionId: number;
  birthCityId: number;
  birthCertificateNumber?: string | null;
  birthCertificateSeriesNumber?: string | null;
  birthCertificateSeriesLetterId?: number | null;
  birthCertificateSerial?: string | null;
  birthCertificateIssueCountryId: number;
  birthCertificateIssueRegionId: number;
  birthCertificateIssueCityId: number;
  maritalStatusId: number;
  religionId: number;
  passportNumber?: string | null;
  militaryServiceStatusId: number;
  militaryServiceLocationId?: number | null;
  insuranceTypeId: number;
  insuranceNumber?: string | null;
  translations: Array<{
    languageId: number;
    firstName: string;
    lastName: string;
    fatherName?: string | null;
    createdAt?: string;
    updatedAt?: string;
  }>;
}

// ─── Language IDs (from KSS_Common_Prod.dbo.Language) ───
const PERSIAN_LANGUAGE_ID = 12;

// ─── Types ───

export interface PersonFormData {
  id?: string;
  // Person core
  nationalId: string;
  sexId: number;
  preferredLanguageId: number;
  dateOfBirth: string;
  birthCountryId: number;
  birthRegionId: number;
  birthCityId: number;
  // Birth certificate
  birthCertificateNumber: string;
  birthCertificateSeriesNumber: string;
  birthCertificateSeriesLetterId: number;
  birthCertificateSerial: string;
  birthCertificateIssueCountryId: number;
  birthCertificateIssueRegionId: number;
  birthCertificateIssueCityId: number;
  // Personal details
  maritalStatusId: number;
  religionId: number;
  passportNumber: string;
  militaryServiceStatusId: number;
  militaryServiceLocationId: number;
  insuranceTypeId: number;
  insuranceNumber: string;
}

export interface ReferenceData {
  sexTranslations: Array<{ sexId: number; languageId: number; name: string }>;
  emailLabelTranslations: Array<{ emailLabelId: number; languageId: number; name: string }>;
  phoneLabelTranslations: Array<{ phoneLabelId: number; languageId: number; name: string }>;
  addressLabelTranslations: Array<{ addressLabelId: number; languageId: number; name: string }>;
  militaryServiceStatusTranslations: Array<{ militaryServiceStatusId: number; languageId: number; name: string }>;
  insuranceTypeTranslations: Array<{ insuranceTypeId: number; languageId: number; name: string }>;
  relationshipTypeTranslations: Array<{ relationshipTypeId: number; languageId: number; name: string }>;
  maritalStatusTranslations: Array<{ maritalStatusId: number; languageId: number; name: string }>;
  maritalStatuses: Array<{ id: number; code: string; isActive: boolean }>;
  birthCertificateSeriesLetterTranslations: Array<{ birthCertificateSeriesLetterId: number; languageId: number; name: string }>;
  religionTranslations: Array<{ religionId: number; languageId: number; name: string }>;
  militaryServiceLocationTranslations: Array<{ militaryServiceLocationId: number; languageId: number; name: string }>;
  contractTypeTranslations: Array<{ contractTypeId: number; languageId: number; name: string }>;
  employmentActivityFieldTranslations: Array<{ employmentActivityFieldId: number; languageId: number; name: string }>;
  employmentActivityUnitTranslations: Array<{ employmentActivityUnitId: number; languageId: number; name: string }>;
  employmentPositionTranslations: Array<{ employmentPositionId: number; languageId: number; name: string }>;
  employmentActivityUnits: Array<{ id: number; employmentActivityFieldId: number }>;
  employmentPositions: Array<{ id: number; employmentActivityUnitId: number }>;
  documentTypeTranslations: Array<{ documentTypeId: number; languageId: number; name: string }>;
  educationLevelTranslations: Array<{ educationLevelId: number; languageId: number; name: string }>;
  fieldOfStudyTranslations: Array<{ fieldOfStudyId: number; languageId: number; name: string }>;
  professionalTrainingTypeTranslations: Array<{ professionalTrainingTypeId: number; languageId: number; name: string }>;
  professionalTrainingCertificateIssuerTranslations: Array<{ professionalTrainingCertificateIssuerId: number; languageId: number; name: string }>;
}

interface PersonFormProps {
  personId?: string;
  onDataUpdate?: () => void;
  onPersonChange?: (personId: string | undefined) => void;
  /** Driven by the page-level my-levels query (information level 1 = view-only).
   *  Matches /company/information's top-down read-only flow. */
  isReadOnly?: boolean;
  /** Information level 0 + non-owner. Selection card stays visible so the
   *  caller can switch person, but all form sections are hidden. */
  hasNoAccess?: boolean;
}

const initialFormData: PersonFormData = {
  nationalId: '',
  sexId: 0,
  preferredLanguageId: PERSIAN_LANGUAGE_ID,
  dateOfBirth: '',
  birthCountryId: 0,
  birthRegionId: 0,
  birthCityId: 0,
  birthCertificateNumber: '',
  birthCertificateSeriesNumber: '',
  birthCertificateSeriesLetterId: 0,
  birthCertificateSerial: '',
  birthCertificateIssueCountryId: 0,
  birthCertificateIssueRegionId: 0,
  birthCertificateIssueCityId: 0,
  maritalStatusId: 0,
  religionId: 0,
  passportNumber: '',
  militaryServiceStatusId: 0,
  militaryServiceLocationId: 0,
  insuranceTypeId: 0,
  insuranceNumber: '',
};

export function PersonForm({ personId, onDataUpdate, onPersonChange, isReadOnly = false, hasNoAccess = false }: PersonFormProps) {
  const { t } = useTranslation('person-form');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<PersonFormData>(initialFormData);
  const [translations, setTranslations] = useState<PersonTranslationEntry[]>([]);
  const [savedPersonId, setSavedPersonId] = useState<string | undefined>(personId);
  const [, setSelectedPersonId] = useState<string | undefined>(personId);
  // Selection lives in the shared PersonProvider so picks made here propagate
  // live to /person/access and /person/security (and vice-versa).
  const { selectedPerson, setSelectedPerson } = usePersonContext();

  // Fetch reference data
  const { data: referenceData } = useQuery<ReferenceData>({
    queryKey: ['person-reference-data'],
    queryFn: async () => {
      const response = await fetch('/api/person/reference');
      if (!response.ok) throw new Error('Failed to load reference data');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Read-only state is driven by the page (content.tsx queries /my-levels and
  // passes `isReadOnly` down as a prop) — matches /company/information.

  // Populate form from full person detail
  const populateFromPerson = useCallback((person: PersonDetail) => {
    setFormData({
      id: person.id,
      nationalId: person.nationalId || '',
      sexId: person.sexId || 0,
      preferredLanguageId: person.preferredLanguageId || PERSIAN_LANGUAGE_ID,
      dateOfBirth: person.dateOfBirth ? person.dateOfBirth.split('T')[0] : '',
      birthCountryId: person.birthCountryId || 0,
      birthRegionId: person.birthRegionId || 0,
      birthCityId: person.birthCityId || 0,
      birthCertificateNumber: person.birthCertificateNumber || '',
      birthCertificateSeriesNumber: person.birthCertificateSeriesNumber || '',
      birthCertificateSeriesLetterId: person.birthCertificateSeriesLetterId || 0,
      birthCertificateSerial: person.birthCertificateSerial || '',
      birthCertificateIssueCountryId: person.birthCertificateIssueCountryId || 0,
      birthCertificateIssueRegionId: person.birthCertificateIssueRegionId || 0,
      birthCertificateIssueCityId: person.birthCertificateIssueCityId || 0,
      maritalStatusId: person.maritalStatusId || 0,
      religionId: person.religionId || 0,
      passportNumber: person.passportNumber || '',
      militaryServiceStatusId: person.militaryServiceStatusId || 0,
      militaryServiceLocationId: person.militaryServiceLocationId || 0,
      insuranceTypeId: person.insuranceTypeId || 0,
      insuranceNumber: person.insuranceNumber || '',
    });

    if (person.translations && Array.isArray(person.translations)) {
      setTranslations(
        person.translations.map((tr) => ({
          languageId: tr.languageId,
          firstName: tr.firstName || '',
          lastName: tr.lastName || '',
          fatherName: tr.fatherName || undefined,
          createdAt: tr.createdAt,
          updatedAt: tr.updatedAt,
        })),
      );
    }

    setSavedPersonId(person.id);
    setSelectedPersonId(person.id);
    onPersonChange?.(person.id);
  }, [onPersonChange]);

  // Load person data when editing via prop — single-row Find call.
  useEffect(() => {
    if (personId) {
      fetch(`/api/person/${personId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((person: PersonDetail | null) => {
          if (person) populateFromPerson(person);
        })
        .catch((err) => console.error('Error loading person data:', err));
    }
  }, [personId, populateFromPerson]);

  // React to the context's `selectedPerson` — covers (a) initial hydration
  // from localStorage and (b) picks made on sibling pages (/access /security).
  // Skips when the explicit `personId` prop is set (handled by the dedicated
  // effect above) or when the form is already loaded for this person.
  useEffect(() => {
    if (personId) return; // explicit prop wins
    if (!selectedPerson?.id) return;
    if (savedPersonId === selectedPerson.id) return; // already loaded
    fetch(`/api/person/${selectedPerson.id}`)
      .then(async (res) => {
        // 404 = caller has no row-level access (or person no longer exists).
        // Clear the stale selection from the shared context — its setter
        // wipes localStorage too. Matches the company-information 404 guard.
        if (!res.ok) {
          setSelectedPerson(null);
          return null;
        }
        return (await res.json()) as PersonDetail;
      })
      .then((full) => {
        if (full) populateFromPerson(full);
      })
      .catch(() => { /* ignore — fresh form is fine */ });
  }, [personId, selectedPerson?.id, savedPersonId, setSelectedPerson, populateFromPerson]);

  // Handle person search selection
  const handlePersonSelect = useCallback(async (person: PersonSearchResult | null) => {
    // Context setter writes localStorage atomically so /access and /security
    // pick up the change live.
    setSelectedPerson(person);
    if (!person) {
      setFormData(initialFormData);
      setTranslations([]);
      setSavedPersonId(undefined);
      setSelectedPersonId(undefined);
      onPersonChange?.(undefined);
      return;
    }
    // Load full person detail from API
    try {
      const response = await fetch(`/api/person/${person.id}`);
      if (response.ok) {
        const fullPerson: PersonDetail = await response.json();
        populateFromPerson(fullPerson);
        return;
      }
    } catch { /* fallback below */ }
    // Fallback: load from list
    try {
      const response = await fetch(`/api/person?query=&limit=1000`);
      if (response.ok) {
        const result = await response.json();
        const fullPerson = result.data?.find((p: PersonDetail) => p.id === person.id);
        if (fullPerson) populateFromPerson(fullPerson);
      }
    } catch { /* ignore */ }
  }, [populateFromPerson, onPersonChange, setSelectedPerson]);

  const handleInputChange = useCallback((field: keyof PersonFormData, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Mutation for updating an already-selected person. Creation now lives on the
  // dedicated /person/create page — this form is edit-only.
  const mutation = useMutation({
    mutationFn: async ({ data, currentTranslations }: { data: PersonFormData; currentTranslations: PersonTranslationEntry[] }) => {
      // 1) Update person fields
      const response = await fetch(`/api/person/${savedPersonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: savedPersonId,
          sexId: data.sexId,
          preferredLanguageId: data.preferredLanguageId,
          nationalId: data.nationalId,
          dateOfBirth: data.dateOfBirth || undefined,
          birthCountryId: data.birthCountryId,
          birthRegionId: data.birthRegionId,
          birthCityId: data.birthCityId,
          birthCertificateNumber: data.birthCertificateNumber || undefined,
          birthCertificateSeriesNumber: data.birthCertificateSeriesNumber || undefined,
          birthCertificateSeriesLetterId: data.birthCertificateSeriesLetterId || undefined,
          birthCertificateSerial: data.birthCertificateSerial || undefined,
          birthCertificateIssueCountryId: data.birthCertificateIssueCountryId,
          birthCertificateIssueRegionId: data.birthCertificateIssueRegionId,
          birthCertificateIssueCityId: data.birthCertificateIssueCityId,
          maritalStatusId: data.maritalStatusId,
          religionId: data.religionId || null,
          passportNumber: data.passportNumber || null,
          militaryServiceStatusId: data.militaryServiceStatusId || null,
          militaryServiceLocationId: data.militaryServiceLocationId || null,
          insuranceTypeId: data.insuranceTypeId || null,
          insuranceNumber: data.insuranceNumber || null,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to update person');
      }

      // 2) Upsert translations (all languages in one call, like company)
      const trResponse = await fetch('/api/person/translation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId: savedPersonId,
          translations: currentTranslations,
        }),
      });
      if (!trResponse.ok) {
        const err = await trResponse.json();
        throw new Error(err.message || 'Failed to update translations');
      }

      return { id: savedPersonId };
    },
    onSuccess: (result) => {
      const message = t('personUpdated');

      toast.custom(
        () => (
          <Alert variant="mono" icon="success">
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>{message}</AlertTitle>
          </Alert>
        ),
        { position: 'top-center' },
      );

      if (result?.id) {
        setSavedPersonId(result.id);
        onPersonChange?.(result.id);
        // Sync the shared context so /access and /security see the new person
        // immediately. Construct a minimal PersonSearchResult from form state.
        setSelectedPerson({
          id: result.id,
          nationalId: formData.nationalId,
          translations: translations.map((tr) => ({
            languageId: tr.languageId,
            firstName: tr.firstName,
            lastName: tr.lastName,
          })),
        });
      }

      queryClient.invalidateQueries({ queryKey: ['persons'] });
      if (onDataUpdate) onDataUpdate();
    },
    onError: (error: Error) => {
      const friendlyMessage = translateApiError(error.message, t);
      toast.custom(
        () => (
          <Alert variant="mono" icon="destructive">
            <AlertIcon>
              <RiErrorWarningFill />
            </AlertIcon>
            <AlertTitle>{friendlyMessage}</AlertTitle>
          </Alert>
        ),
        { position: 'top-center' },
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate: at least one translation with firstName + lastName
    const hasValidTranslation = translations.some(
      (tr) => tr.firstName.trim() !== '' && tr.lastName.trim() !== '',
    );

    if (!hasValidTranslation) {
      toast.custom(
        () => (
          <Alert variant="mono" icon="destructive">
            <AlertIcon>
              <RiErrorWarningFill />
            </AlertIcon>
            <AlertTitle>
              {t('translationRequired', { defaultValue: 'At least one name translation is required' })}
            </AlertTitle>
          </Alert>
        ),
        { position: 'top-center' },
      );
      return;
    }

    // Validate required fields in section 2
    // Only national code, birth date and gender remain mandatory. The birth
    // certificate, birth-location and marital-status fields are now optional
    // (DB columns are nullable; the backend stores NULL for an unset value).
    const requiredFields: Array<{ key: keyof PersonFormData; label: string }> = [
      { key: 'nationalId', label: t('nationalCode', { defaultValue: 'National Code' }) },
      { key: 'dateOfBirth', label: t('birthDate', { defaultValue: 'Birth Date' }) },
      { key: 'sexId', label: t('sex', { defaultValue: 'Gender' }) },
    ];

    for (const field of requiredFields) {
      const value = formData[field.key];
      if (!value || value === 0 || value === '') {
        toast.custom(
          () => (
            <Alert variant="mono" icon="destructive">
              <AlertIcon>
                <RiErrorWarningFill />
              </AlertIcon>
              <AlertTitle>
                {t('fieldRequired', { defaultValue: '{{field}} is required', field: field.label })}
              </AlertTitle>
            </Alert>
          ),
          { position: 'top-center' },
        );
        return;
      }
    }

    mutation.mutate({ data: formData, currentTranslations: translations });
  };

  const isSubmitting = mutation.status === 'pending';

  return (
    <div className="space-y-6">
      {/* Person Selection Card — black border (light) / white (dark), matches company. */}
      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
        <PersonSelectionCard
          value={selectedPerson}
          onValueChange={handlePersonSelect}
          isEditMode={!!savedPersonId}
        />
      </div>

      {/* No person selected yet — this form is edit-only, so point the user to
          the dedicated Create Person page instead of offering creation here. */}
      {!hasNoAccess && !savedPersonId && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
          <Card>
            <CardContent className="py-5">
              <div className="flex items-start gap-2">
                <RiInformationFill className="text-blue-600 dark:text-blue-400 size-5 shrink-0 mt-0.5" />
                <span className="text-sm text-card-foreground">
                  {t('form.messages.selectOrCreateHint', {
                    defaultValue: 'Select a person above to edit. To add a new person, use the Create Person page.',
                  })}
                  {' '}
                  <Link href="/create" className="text-blue-600 dark:text-blue-400 underline">
                    {t('form.actions.create', { defaultValue: 'Create Person' })} →
                  </Link>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* All edit-capable controls live inside this fieldset. Disabling the
          fieldset disables every nested <Input>, <Select>, <Textarea>, and
          <Button> in one shot — no per-section prop drilling required.
          The form wraps every section so the Operations card at the END can
          host a single submit button (matches /company/information).
          Rendered only once a person is selected (edit-only form); hidden
          entirely when the caller has no information access — page shows the
          red "no access" banner above instead. */}
      {!hasNoAccess && savedPersonId && (
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <fieldset disabled={isReadOnly} className="space-y-6 contents">
          {/* Section 1 — blue badge */}
          <div className="[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!">
            <NameSection
              translations={translations}
              onTranslationsChange={setTranslations}
              lockEnglishIfPresent={!!savedPersonId}
              isReadOnly={isReadOnly}
              personId={savedPersonId}
            />
          </div>

          {/* Section 2 — blue badge */}
          <div className="[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!">
            <PersonalInformationSection
              formData={formData}
              onInputChange={handleInputChange}
              referenceData={referenceData}
              nationalIdLocked={!!savedPersonId}
            />
          </div>

          {/* Phase 2: Sub-entity sections */}
          {savedPersonId && (
            <>
              {/* Section 3 — emerald badge */}
              <div className="[&_div.rounded-xl.bg-card.bg-card]:border-emerald-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-emerald-500!">
                <NationalitySection personId={savedPersonId} isReadOnly={isReadOnly} />
              </div>

              {/* Sections 4, 5, 6 — colored borders applied inside ContactInformationSection. */}
              <ContactInformationSection
                personId={savedPersonId}
                referenceData={referenceData}
                isReadOnly={isReadOnly}
              />

              {/* Section 7 — orange badge */}
              <div className="[&_div.rounded-xl.bg-card.bg-card]:border-orange-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-orange-500!">
                <EmploymentInformationSection
                  personId={savedPersonId}
                  referenceData={referenceData}
                  isReadOnly={isReadOnly}
                />
              </div>

              {/* Section 8 — cyan badge */}
              <div className="[&_div.rounded-xl.bg-card.bg-card]:border-cyan-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-cyan-500!">
                <EducationSection
                  personId={savedPersonId}
                  referenceData={referenceData}
                  isReadOnly={isReadOnly}
                />
              </div>

              {/* Section 9 — violet badge: Professional Training */}
              <div className="[&_div.rounded-xl.bg-card.bg-card]:border-violet-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-violet-500!">
                <ProfessionalTrainingSection
                  personId={savedPersonId}
                  referenceData={referenceData}
                  isReadOnly={isReadOnly}
                />
              </div>

              {/* Section 10 — pink badge */}
              <div className="[&_div.rounded-xl.bg-card.bg-card]:border-pink-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-pink-500!">
                <RelationshipSection
                  personId={savedPersonId}
                  referenceData={referenceData}
                  isReadOnly={isReadOnly}
                />
              </div>

              {/* Section 11 — cyan badge */}
              <div className="[&_div.rounded-xl.bg-card.bg-card]:border-cyan-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-cyan-500!">
                <DocumentSection personId={savedPersonId} referenceData={referenceData} isReadOnly={isReadOnly} />
              </div>

              {/* Section 12 — red badge */}
              <div className="[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!">
                <StatusSection personId={savedPersonId} isReadOnly={isReadOnly} />
              </div>
            </>
          )}

          {/* Operations card — LAST (matches /company/information). Submit triggers
              handleSubmit on the outer form; all sub-sections auto-save themselves. */}
          {!isReadOnly && (
            <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
              <Card>
                <CardHeader>
                  <CardTitle>{t('form.sections.operations', { defaultValue: 'Operations' })}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex items-start gap-2">
                    <RiInformationFill className="text-blue-600 dark:text-blue-400 size-5 shrink-0 mt-0.5" />
                    <span className="text-sm text-card-foreground">
                      {t('form.messages.autoSubmitInfo', {
                        defaultValue: 'All operations are saved automatically, except {{section}}',
                        section: t('form.sections.nameAndPersonalInfo', { defaultValue: 'Name and Personal Information' }),
                      })}
                    </span>
                  </div>
                  <div className="flex justify-end space-x-4 space-x-reverse">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting
                        ? t('form.actions.processing', { defaultValue: 'Processing...' })
                        : t('form.actions.update', { defaultValue: 'Update Person' })}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </fieldset>
      </form>
      )}
    </div>
  );
}
