'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePickerComponent } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { toEnglishDigits } from '@/app/components/person/components/format-utils';
import { LocationSelect } from '@/components/common/location-select';
import type { PersonFormData, ReferenceData } from './person-form';

interface PersonalInformationSectionProps {
  formData: PersonFormData;
  onInputChange: (field: keyof PersonFormData, value: string | boolean | number) => void;
  referenceData?: ReferenceData;
  /** Disable the NationalId field — set to true once the person row exists. */
  nationalIdLocked?: boolean;
}

const FEMALE_SEX_ID = 2;

export function PersonalInformationSection({ formData, onInputChange, referenceData, nationalIdLocked }: PersonalInformationSectionProps) {
  const { t } = useTranslation('person-form');
const isFemale = formData.sexId === FEMALE_SEX_ID;  const handleSexChange = (value: number) => {    onInputChange('sexId', value);    if (value === FEMALE_SEX_ID) {      onInputChange('militaryServiceStatusId', 0);      onInputChange('militaryServiceLocationId', 0);    }  };

  // Filter translations for FA (languageId=12 in KSS_Common_Prod.dbo.Language)
  const PERSIAN_LANGUAGE_ID = 12;
  const sexOptions = referenceData?.sexTranslations?.filter((t) => t.languageId === PERSIAN_LANGUAGE_ID) || [];
  const militaryOptions = referenceData?.militaryServiceStatusTranslations?.filter((t) => t.languageId === PERSIAN_LANGUAGE_ID) || [];
  const militaryLocationOptions = referenceData?.militaryServiceLocationTranslations?.filter((t) => t.languageId === PERSIAN_LANGUAGE_ID) || [];
  const insuranceOptions = referenceData?.insuranceTypeTranslations?.filter((t) => t.languageId === PERSIAN_LANGUAGE_ID) || [];
  const activeMaritalStatusIds = new Set(
    referenceData?.maritalStatuses?.filter((m) => m.isActive).map((m) => m.id) || [],
  );
  const maritalStatusOptions = referenceData?.maritalStatusTranslations?.filter(
    (t) => t.languageId === PERSIAN_LANGUAGE_ID && (activeMaritalStatusIds.size === 0 || activeMaritalStatusIds.has(t.maritalStatusId)),
  ) || [];
  const birthCertSeriesLetterOptions = referenceData?.birthCertificateSeriesLetterTranslations?.filter((t) => t.languageId === PERSIAN_LANGUAGE_ID) || [];
  const religionOptions = referenceData?.religionTranslations?.filter((t) => t.languageId === PERSIAN_LANGUAGE_ID) || [];

  return (
    <div className="space-y-6">
      {/* Section 2: Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">2</span>
            {t('personalInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. کد ملی */}
            <div className="space-y-2">
              <Label htmlFor="nationalId" className="flex items-baseline gap-4 flex-wrap">
                <span>{t('nationalCode')} <span className="text-destructive">*</span></span>
                {nationalIdLocked && (
                  <span className="text-xs italic text-muted-foreground font-normal">
                    {t('nationalCodeFrozen')}
                  </span>
                )}
              </Label>
              <Input
                id="nationalId"
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={formData.nationalId}
                onChange={(e) =>
                  onInputChange('nationalId', toEnglishDigits(e.target.value).replace(/[^0-9]/g, '').slice(0, 10))
                }
                placeholder={t('nationalCode')}
                disabled={!!nationalIdLocked}
              />
            </div>

            {/* 2. شماره شناسنامه */}
            <div className="space-y-2">
              <Label htmlFor="birthCertificateNumber">{t('birthCertificateNumber')}</Label>
              <Input
                id="birthCertificateNumber"
                type="text"
                value={formData.birthCertificateNumber}
                onChange={(e) => onInputChange('birthCertificateNumber', e.target.value)}
                placeholder={t('birthCertificateNumber')}
              />
            </div>

            {/* 3. شماره پاسپورت */}
            <div className="space-y-2">
              <Label htmlFor="passportNumber">{t('passport', { defaultValue: 'Passport Number' })}</Label>
              <Input
                id="passportNumber"
                type="text"
                value={formData.passportNumber}
                onChange={(e) => onInputChange('passportNumber', e.target.value)}
                placeholder={t('passport', { defaultValue: 'Enter passport number' })}
              />
            </div>

            {/* سری شناسنامه (حروف) */}
            <div className="space-y-2">
              <Label htmlFor="birthCertificateSeriesLetterId">{t('birthCertificateSeriesLetter', { defaultValue: 'Certificate Series Letter' })}</Label>
              <Select
                value={formData.birthCertificateSeriesLetterId ? String(formData.birthCertificateSeriesLetterId) : ''}
                onValueChange={(value) => onInputChange('birthCertificateSeriesLetterId', Number(value))}
              >
                <SelectTrigger id="birthCertificateSeriesLetterId">
                  <SelectValue placeholder={t('common:select', { defaultValue: 'Select' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0" className="text-muted-foreground">{t('common:select', { defaultValue: 'Select' })}</SelectItem>
                  {birthCertSeriesLetterOptions.map((item) => (
                    <SelectItem key={item.birthCertificateSeriesLetterId} value={String(item.birthCertificateSeriesLetterId)}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthCertificateSeriesNumber">{t('birthCertificateSeriesNumber')}</Label>
              <Input
                id="birthCertificateSeriesNumber"
                type="text"
                maxLength={2}
                value={formData.birthCertificateSeriesNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                  onInputChange('birthCertificateSeriesNumber', val);
                }}
                placeholder={t('birthCertificateSeriesNumber')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthCertificateSerial">{t('birthCertificateSerial')}</Label>
              <Input
                id="birthCertificateSerial"
                type="text"
                maxLength={6}
                value={formData.birthCertificateSerial}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  onInputChange('birthCertificateSerial', val);
                }}
                placeholder={t('birthCertificateSerial')}
              />
            </div>

            {/* تاریخ تولد */}
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">{t('birthDate')} <span className="text-destructive">*</span></Label>
              <DatePickerComponent
                value={formData.dateOfBirth}
                onChange={(value) => onInputChange('dateOfBirth', value)}
                placeholder={t('birthDate')}
                forcePersian={true}
              />
            </div>

            {/* 5. جنسیت */}
            <div className="space-y-2">
              <Label htmlFor="sexId">{t('sex')} <span className="text-destructive">*</span></Label>
              <Select
                value={formData.sexId ? String(formData.sexId) : ''}
                onValueChange={(value) => handleSexChange(Number(value))}
              >
                <SelectTrigger id="sexId">
                  <SelectValue placeholder={t('common:select', { defaultValue: 'Select' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0" className="text-muted-foreground">{t('common:select', { defaultValue: 'Select' })}</SelectItem>
                  {sexOptions.map((s) => (
                    <SelectItem key={s.sexId} value={String(s.sexId)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 6. وضعیت تاهل */}
            <div className="space-y-2">
              <Label htmlFor="maritalStatusId">{t('maritalStatus', { defaultValue: 'Marital Status' })}</Label>
              <Select
                value={formData.maritalStatusId ? String(formData.maritalStatusId) : ''}
                onValueChange={(value) => onInputChange('maritalStatusId', Number(value))}
              >
                <SelectTrigger id="maritalStatusId">
                  <SelectValue placeholder={t('common:select', { defaultValue: 'Select' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0" className="text-muted-foreground">{t('common:select', { defaultValue: 'Select' })}</SelectItem>
                  {maritalStatusOptions.map((m) => (
                    <SelectItem key={m.maritalStatusId} value={String(m.maritalStatusId)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Birth Location */}
            <LocationSelect
              type="country"
              value={String(formData.birthCountryId)}
              onValueChange={(value) => onInputChange('birthCountryId', Number(value))}
              label={t('birthCountry', { defaultValue: 'Country of Birth' })}
            />
            <LocationSelect
              type="province"
              value={String(formData.birthRegionId)}
              onValueChange={(value) => onInputChange('birthRegionId', Number(value))}
              countryId={String(formData.birthCountryId)}
              label={t('birthRegion', { defaultValue: 'Birth Province' })}
            />
            <LocationSelect
              type="city"
              value={String(formData.birthCityId)}
              onValueChange={(value) => onInputChange('birthCityId', Number(value))}
              provinceId={String(formData.birthRegionId)}
              label={t('birthCity', { defaultValue: 'Birthplace City' })}
            />

            {/* Birth Certificate Issue Location */}
            <LocationSelect
              type="country"
              value={String(formData.birthCertificateIssueCountryId)}
              onValueChange={(value) => onInputChange('birthCertificateIssueCountryId', Number(value))}
              label={t('certIssueCountry', { defaultValue: 'Certificate Issue Country' })}
            />
            <LocationSelect
              type="province"
              value={String(formData.birthCertificateIssueRegionId)}
              onValueChange={(value) => onInputChange('birthCertificateIssueRegionId', Number(value))}
              countryId={String(formData.birthCertificateIssueCountryId)}
              label={t('certIssueRegion', { defaultValue: 'Certificate Issue Province' })}
            />
            <LocationSelect
              type="city"
              value={String(formData.birthCertificateIssueCityId)}
              onValueChange={(value) => onInputChange('birthCertificateIssueCityId', Number(value))}
              provinceId={String(formData.birthCertificateIssueRegionId)}
              label={t('certIssueCity', { defaultValue: 'Birth Certificate Registration City' })}
            />

            {/* دین */}
            <div className="space-y-2">
              <Label htmlFor="religionId">{t('religion', { defaultValue: 'Religion' })}</Label>
              <Select
                value={formData.religionId ? String(formData.religionId) : ''}
                onValueChange={(value) => onInputChange('religionId', Number(value))}
              >
                <SelectTrigger id="religionId">
                  <SelectValue placeholder={t('common:select', { defaultValue: 'Select' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0" className="text-muted-foreground">{t('common:select', { defaultValue: 'Select' })}</SelectItem>
                  {religionOptions.map((r) => (
                    <SelectItem key={r.religionId} value={String(r.religionId)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* نظام وظیفه */}
            <div className="space-y-2">
              <Label htmlFor="militaryServiceStatusId">{t('militaryStatus')}</Label>
              <Select
                value={formData.militaryServiceStatusId ? String(formData.militaryServiceStatusId) : ''}
                onValueChange={(value) => onInputChange('militaryServiceStatusId', Number(value))}
              >
                <SelectTrigger id="militaryServiceStatusId" disabled={isFemale}>
                  <SelectValue placeholder={t('common:select', { defaultValue: 'Select' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0" className="text-muted-foreground">{t('common:select', { defaultValue: 'Select' })}</SelectItem>
                  {militaryOptions.map((m) => (
                    <SelectItem key={m.militaryServiceStatusId} value={String(m.militaryServiceStatusId)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* محل خدمت */}
            <div className="space-y-2">
              <Label htmlFor="militaryServiceLocationId">{t('militaryLocation', { defaultValue: 'Military Service Location' })}</Label>
              <Select
                value={formData.militaryServiceLocationId ? String(formData.militaryServiceLocationId) : ''}
                onValueChange={(value) => onInputChange('militaryServiceLocationId', Number(value))}
              >
                <SelectTrigger id="militaryServiceLocationId" disabled={isFemale}>
                  <SelectValue placeholder={t('common:select', { defaultValue: 'Select' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0" className="text-muted-foreground">{t('common:select', { defaultValue: 'Select' })}</SelectItem>
                  {militaryLocationOptions.map((m) => (
                    <SelectItem key={m.militaryServiceLocationId} value={String(m.militaryServiceLocationId)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* نوع بیمه */}
            <div className="space-y-2">
              <Label htmlFor="insuranceTypeId">{t('insuranceType')}</Label>
              <Select
                value={formData.insuranceTypeId ? String(formData.insuranceTypeId) : ''}
                onValueChange={(value) => onInputChange('insuranceTypeId', Number(value))}
              >
                <SelectTrigger id="insuranceTypeId">
                  <SelectValue placeholder={t('common:select', { defaultValue: 'Select' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0" className="text-muted-foreground">{t('common:select', { defaultValue: 'Select' })}</SelectItem>
                  {insuranceOptions.map((i) => (
                    <SelectItem key={i.insuranceTypeId} value={String(i.insuranceTypeId)}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* شماره بیمه */}
            <div className="space-y-2">
              <Label htmlFor="insuranceNumber">{t('insuranceNumber')}</Label>
              <Input
                id="insuranceNumber"
                type="text"
                value={formData.insuranceNumber}
                onChange={(e) => onInputChange('insuranceNumber', e.target.value)}
                placeholder={t('insuranceNumber')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
