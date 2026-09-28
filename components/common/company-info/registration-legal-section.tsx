'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { LocationSelect } from '@/components/common/location-select';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/lib/format-utils';

interface RegistrationLegalSectionProps {
  formData: {
    registrationDate: string;
    registrationNumber: string;
    registrationCountry: string;
    registrationRegion: string;
    registrationCity: string;
    nationalId: string;
    economicCode: string;
  };
  onInputChange: (field: 'registrationDate' | 'registrationNumber' | 'registrationCountry' | 'registrationRegion' | 'registrationCity' | 'nationalId' | 'economicCode', value: string) => void;
  disabled?: boolean;
  /** Company record audit dates — rendered as a footer when provided. */
  createdAt?: string;
  updatedAt?: string | null;
}

export function RegistrationLegalSection({ formData, onInputChange, disabled = false, createdAt, updatedAt }: RegistrationLegalSectionProps) {
  const { t, i18n } = useTranslation('company-information');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">2</span>
          {t('form.sections.registrationLegal', { defaultValue: 'Registration & Legal Information' })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="registrationDate">
            {t('form.fields.registrationDate')} <span className="text-destructive">*</span>
          </Label>
          <DatePickerComponent
            value={formData.registrationDate}
            onChange={(value) => onInputChange('registrationDate', value)}
            placeholder={t('form.placeholders.registrationDate', { defaultValue: 'Select registration date' })}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="registrationNumber">
            {t('form.fields.registrationNumber')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="registrationNumber"
            type="text"
            value={formData.registrationNumber}
            onChange={(e) => onInputChange('registrationNumber', e.target.value)}
            placeholder={t('form.placeholders.registrationNumber')}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nationalId">
            {t('form.fields.nationalId')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="nationalId"
            type="text"
            value={formData.nationalId}
            onChange={(e) => onInputChange('nationalId', e.target.value)}
            placeholder={t('form.placeholders.nationalId')}
            disabled={disabled}
          />
        </div>

        <LocationSelect
          type="country"
          value={formData.registrationCountry}
          onValueChange={(value) => {
            onInputChange('registrationCountry', value);
            // Clear region and city when country changes
            onInputChange('registrationRegion', '');
            onInputChange('registrationCity', '');
          }}
          label={t('form.fields.registrationCountry', { defaultValue: 'Registration Country' })}
          placeholder={t('form.placeholders.registrationCountry', { defaultValue: 'Select registration country' })}
          required
          disabled={disabled}
        />

        <LocationSelect
          type="province"
          value={formData.registrationRegion}
          onValueChange={(value) => {
            onInputChange('registrationRegion', value);
            // Clear city when region changes
            onInputChange('registrationCity', '');
          }}
          label={t('form.fields.registrationRegion', { defaultValue: 'Registration Province' })}
          placeholder={t('form.placeholders.registrationRegion', { defaultValue: 'Select registration province' })}
          countryId={formData.registrationCountry}
          required
          disabled={disabled}
        />

        <LocationSelect
          type="city"
          value={formData.registrationCity}
          onValueChange={(value) => onInputChange('registrationCity', value)}
          label={t('form.fields.registrationCity', { defaultValue: 'Registration City' })}
          placeholder={t('form.placeholders.registrationCity', { defaultValue: 'Select registration city' })}
          provinceId={formData.registrationRegion}
          required
          disabled={disabled}
        />

        <div className="space-y-2">
          <Label htmlFor="economicCode">
            {t('form.fields.economicCode')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="economicCode"
            type="text"
            value={formData.economicCode}
            onChange={(e) => onInputChange('economicCode', e.target.value)}
            placeholder={t('form.placeholders.economicCode')}
            disabled={disabled}
          />
        </div>

      </div>
        {createdAt && (
          <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span style={{ unicodeBidi: 'plaintext' }}>
              {t('common:createdAt', { defaultValue: 'Created At' })}: {formatDateTime(createdAt, locale)}
            </span>
            <span style={{ unicodeBidi: 'plaintext' }}>
              {t('common:updatedAt', { defaultValue: 'Last Modified' })}: {formatDateTime(updatedAt, locale)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
