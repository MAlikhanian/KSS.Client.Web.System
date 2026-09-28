'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';

interface CompanyInformationSectionProps {
  children?: React.ReactNode;
  // Translation key for the section title. Defaults to the generic company-info
  // label; callers can override (e.g. the info page uses the name-history label).
  titleKey?: string;
}

export function CompanyInformationSection({ children, titleKey = 'form.sections.companyInfo' }: CompanyInformationSectionProps) {
  const { t } = useTranslation('company-information');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">1</span>
          {t(titleKey)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
