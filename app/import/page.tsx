'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { ImportPersonContent } from './content';

export default function ImportPersonPage() {
  return (
    <Fragment>
      <Container>
        <ImportPersonContent />
      </Container>
    </Fragment>
  );
}
