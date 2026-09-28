// Shared, read-only company-information block used by the company-view,
// brokerage and investment-fund pages. Single source of truth for the company
// section components (a brokerage / fund id IS a Company.Id).
export { CompanyInfoView } from './company-info-view';
export { CompanyInformationSection } from './company-information-section';
export { RegistrationLegalSection } from './registration-legal-section';
export { NameHistoryGrid } from './name-history-grid';
export { EmailsGrid } from './emails-grid';
export { PhonesGrid } from './phones-grid';
export { AddressesGrid } from './addresses-grid';
export { WebsitesGrid } from './websites-grid';
export {
  StakeholdersGrid,
  type StakeholderItem,
  type StakeholderUpsertPayload,
} from './stakeholders-grid';
export { DocumentsSection } from './documents-section';
