'use client';

import { Navbar } from '@/partials/navbar/navbar';
import { NavbarMenu } from '@/partials/navbar/navbar-menu';
import { useSettings } from '@/providers/settings-provider';
import { Container } from '@/components/common/container';
import { useTranslatedMenu } from '@/lib/use-translated-menu';

// Sub-nav for the System > Security section. Lists the same children the
// sidebar shows under `System > Security` (Roles, Permissions, Role Permissions).
const PageNavbar = () => {
  const { settings } = useSettings();
  const { menuSidebar } = useTranslatedMenu();

  // Walk the sidebar by title rather than index so reorders don't break us.
  const systemMenu = menuSidebar?.find(
    (m) => m.title === 'سیستم' || m.title === 'System',
  );
  const securityMenu = systemMenu?.children?.find(
    (m) => m.title === 'امنیت' || m.title === 'Security',
  );
  const securityChildren = securityMenu?.children;

  if (securityChildren && settings?.layout === 'demo1') {
    return (
      <Navbar>
        <Container>
          <NavbarMenu items={securityChildren} />
        </Container>
      </Navbar>
    );
  }
  return <></>;
};

export { PageNavbar };
