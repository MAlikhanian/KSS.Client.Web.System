'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { ItemRequestsContent } from './content';

export default function ItemRequestsPage() {
  return (
    <Fragment>
      <Container>
        <ItemRequestsContent />
      </Container>
    </Fragment>
  );
}
