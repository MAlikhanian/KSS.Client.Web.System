'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { RolesContent } from './content';
import { PageNavbar } from '@/app/security/page-navbar';

export default function RolesPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <RolesContent />
      </Container>
    </Fragment>
  );
}
