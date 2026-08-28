'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RiInformationFill } from '@remixicon/react';
import { Alert, AlertIcon, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';
import { useData } from '@/hooks/use-data';
import { CollapsibleSection } from '@/components/common/collapsible-section';
import { CompanyInformationSection } from './company-information-section';
import { RegistrationLegalSection } from './registration-legal-section';
import { NameHistoryGrid } from './name-history-grid';
import { EmailsGrid } from './emails-grid';
import { PhonesGrid } from './phones-grid';
import { AddressesGrid } from './addresses-grid';
import { WebsitesGrid } from './websites-grid';
import { StakeholdersGrid, type StakeholderItem } from './stakeholders-grid';

interface TranslationEntry {
  languageId: number;
  name: string;
}

interface NameHistoryItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description?: string;
  translations?: TranslationEntry[];
}

interface EmailItem {
  id: string;
  labelId: number;
  labelName: string;
  emailAddress: string;
  isPrimary: boolean;
  isVerified: boolean;
}

interface PhoneItem {
  id: string;
  labelId: number;
  labelName: string;
  countryId: number;
  phoneNumber: string;
  isPrimary: boolean;
  isVerified: boolean;
}

interface AddressItem {
  id: string;
  labelId: number;
  labelName: string;
  countryId: number;
  regionId: number;
  cityId: number;
  countryName?: string;
  regionName?: string;
  cityName?: string;
  postalCode: string;
  street1: string;
  street2: string | null;
  isPrimary: boolean;
  isVerified: boolean;
}

interface WebsiteItem {
  id: string;
  labelId: number;
  labelName: string;
  url: string;
  isPrimary: boolean;
}

interface CompanyInfoFormData {
  registrationDate: string;
  registrationNumber: string;
  registrationCountry: string;
  registrationRegion: string;
  registrationCity: string;
  nationalId: string;
  economicCode: string;
}

const emptyFormData: CompanyInfoFormData = {
  registrationDate: '',
  registrationNumber: '',
  registrationCountry: '',
  registrationRegion: '',
  registrationCity: '',
  nationalId: '',
  economicCode: '',
};

// The grids never invoke their CRUD callbacks while `readOnly`, so a single
// no-op satisfies the required props.
const noop = () => {};

interface CompanyInfoViewProps {
  /**
   * The selected entity's id. A brokerage / fund id IS a Company.Id, so the same
   * component works for the brokerage, investment-fund and company-view pages.
   */
  companyId: string;
  /** The collapsible box starts collapsed (default true). */
  defaultCollapsed?: boolean;
  /** Show the "company data is read-only here, edit it under /company" notice (default true). */
  showReadOnlyNotice?: boolean;
}

/**
 * Read-only company information block — the single shared copy used by the
 * brokerage and investment-fund pages (and any member-domain page). Renders the
 * same sections as /company/view (name history, registration/legal, emails,
 * phones, addresses, stakeholders), fetched from the company endpoints keyed off
 * `companyId`, inside one collapsible box. Company data is edited under
 * /company/information — never here.
 */
export function CompanyInfoView({
  companyId,
  defaultCollapsed = true,
  showReadOnlyNotice = true,
}: CompanyInfoViewProps) {
  const { t } = useTranslation('company-information');
  // Phone + address labels from the Common service (canonical lookup).
  const { data: phoneLabels } = useData('phone-labels');
  const phoneLabelOptions = phoneLabels.map((l) => ({ id: Number(l.id), name: l.name }));
  const { data: addressLabels } = useData('address-labels');
  const addressLabelOptions = addressLabels.map((l) => ({ id: Number(l.id), name: l.name }));
  const [formData, setFormData] = useState<CompanyInfoFormData>(emptyFormData);
  const [nameHistory, setNameHistory] = useState<NameHistoryItem[]>([]);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [phones, setPhones] = useState<PhoneItem[]>([]);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [websites, setWebsites] = useState<WebsiteItem[]>([]);
  const [stakeholders, setStakeholders] = useState<StakeholderItem[]>([]);
  const [companyAudit, setCompanyAudit] = useState<{ createdAt?: string; updatedAt?: string | null }>({});

  // Load the full company data from the same endpoints the company VIEW page uses
  // so the read-only sections match /company/view exactly.
  useEffect(() => {
    const loadData = async () => {
      if (!companyId) {
        setFormData(emptyFormData);
        setNameHistory([]);
        setEmails([]);
        setPhones([]);
        setAddresses([]);
        setWebsites([]);
        setStakeholders([]);
        setCompanyAudit({});
        return;
      }

      try {
        const [companyRes, contactsRes, stakeholdersRes] = await Promise.all([
          fetch(`/api/company/${companyId}`),
          fetch(`/api/company/${companyId}/contacts`),
          fetch(`/api/company/${companyId}/stakeholders`),
        ]);

        const company = companyRes.ok ? await companyRes.json() : null;
        const contacts = contactsRes.ok ? await contactsRes.json() : null;
        const stakeholderRows = stakeholdersRes.ok ? await stakeholdersRes.json() : [];

        setFormData({
          registrationDate: company?.registrationDate
            ? new Date(company.registrationDate).toISOString().split('T')[0]
            : '',
          registrationNumber: company?.registrationNumber || '',
          registrationCountry: company?.registrationCountry || '',
          registrationRegion: company?.registrationRegion || '',
          registrationCity: company?.registrationCity || '',
          nationalId: company?.nationalId || '',
          economicCode: company?.economicCode || '',
        });

        setNameHistory(company?.nameHistory || []);
        setCompanyAudit({ createdAt: company?.createdAt, updatedAt: company?.updatedAt });
        setEmails(contacts?.emails || []);
        setPhones(contacts?.phones || []);
        setAddresses(contacts?.addresses || []);
        setWebsites(contacts?.websites || []);
        setStakeholders(stakeholderRows || []);
      } catch (error) {
        console.error('Error loading company info:', error);
      }
    };

    loadData();
  }, [companyId]);

  if (!companyId) return null;

  return (
    <>
      {showReadOnlyNotice && (
        <Alert variant="mono" icon="primary">
          <AlertIcon>
            <RiInformationFill />
          </AlertIcon>
          <AlertTitle>
            {t('readOnly.notice.title', {
              defaultValue: 'Company information is read-only on this page',
            })}
          </AlertTitle>
          <AlertDescription>
            {t('readOnly.notice.description', {
              defaultValue: 'To edit company information (name, registration, contacts and addresses), go to ',
            })}
            <Link href="/company/information" className="underline font-medium">
              {t('readOnly.notice.link', { defaultValue: 'Company → Update' })}
            </Link>
            {t('readOnly.notice.suffix', { defaultValue: '.' })}
          </AlertDescription>
        </Alert>
      )}

      <CollapsibleSection
        title={t('readOnly.companyInfoTitle', { defaultValue: 'Company Information' })}
        defaultOpen={!defaultCollapsed}
      >
        {/* Section 1 — sky border to match badge */}
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-sky-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-sky-500!">
          <CompanyInformationSection titleKey="form.sections.nameHistory">
            <NameHistoryGrid
              nameHistory={nameHistory}
              onAdd={noop}
              onEdit={noop}
              onDelete={noop}
              onDeleteTranslation={noop}
              disabled
              readOnly
            />
          </CompanyInformationSection>
        </div>

        {/* Section 2 — indigo border to match badge */}
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-indigo-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-indigo-500!">
          <RegistrationLegalSection
            formData={{
              registrationDate: formData.registrationDate,
              registrationNumber: formData.registrationNumber,
              registrationCountry: formData.registrationCountry,
              registrationRegion: formData.registrationRegion,
              registrationCity: formData.registrationCity,
              nationalId: formData.nationalId,
              economicCode: formData.economicCode,
            }}
            onInputChange={noop}
            disabled
            createdAt={companyAudit.createdAt}
            updatedAt={companyAudit.updatedAt}
          />
        </div>

        {/* Section 3 — teal border to match badge */}
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-teal-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-teal-500!">
          <EmailsGrid emails={emails} onAdd={noop} onEdit={noop} onDelete={noop} disabled readOnly />
        </div>

        {/* Section 4 — cyan border to match badge */}
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-cyan-600! dark:[&_div.rounded-xl.bg-card.bg-card]:border-cyan-600!">
          <PhonesGrid phones={phones} onAdd={noop} onEdit={noop} onDelete={noop} disabled readOnly labelOptions={phoneLabelOptions} />
        </div>

        {/* Section 5 — slate border to match badge */}
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-slate-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-slate-500!">
          <AddressesGrid addresses={addresses} onAdd={noop} onEdit={noop} onDelete={noop} disabled readOnly labelOptions={addressLabelOptions} />
        </div>

        {/* Section 6 — violet border to match badge */}
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-violet-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-violet-500!">
          <WebsitesGrid websites={websites} onAdd={noop} onEdit={noop} onDelete={noop} disabled readOnly />
        </div>

        {/* Section 7 — emerald border to match badge */}
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-emerald-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-emerald-500!">
          <StakeholdersGrid stakeholders={stakeholders} onAdd={noop} onEdit={noop} onDelete={noop} disabled readOnly />
        </div>
      </CollapsibleSection>
    </>
  );
}
