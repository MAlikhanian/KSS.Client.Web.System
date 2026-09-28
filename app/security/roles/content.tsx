'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { useTranslation } from '@/hooks/useTranslation';
import { RolesSection } from './components/roles-section';
import { Sidebar } from './components/sidebar';

export function RolesContent() {
  const { t } = useTranslation('system-security-roles');

  return (
    <div
      className={
        'space-y-5 lg:space-y-7.5 ' +
        '[&_div.rounded-xl.bg-card]:bg-blue-50/25! ' +
        '[&_div.rounded-xl.bg-card]:border-blue-100! ' +
        'dark:[&_div.rounded-xl.bg-card]:bg-blue-950/25! ' +
        'dark:[&_div.rounded-xl.bg-card]:border-blue-900! ' +
        '[&_div.rounded-xl.bg-card]:shadow-lg ' +
        '[&_div.rounded-xl.bg-card]:shadow-black/5'
      }
    >
      <Card>
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text={t('pageTitle')} />
              <ToolbarDescription>{t('pageDescription')}</ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 lg:gap-7.5">
        <div className="col-span-3">
          <div className="grid gap-5 lg:gap-7.5">
            <RolesSection />
          </div>
        </div>
        <div className="col-span-1">
          <div className="grid gap-5 lg:gap-7.5">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
