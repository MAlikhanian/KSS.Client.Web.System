'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { RolePermissionsContent } from './content';
import { PageNavbar } from '@/app/security/page-navbar';

export default function RolePermissionsPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <RolePermissionsContent />
      </Container>
    </Fragment>
  );
}
