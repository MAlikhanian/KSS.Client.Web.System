'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PermissionsContent } from './content';
import { PageNavbar } from '@/app/security/page-navbar';

export default function PermissionsPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <PermissionsContent />
      </Container>
    </Fragment>
  );
}
