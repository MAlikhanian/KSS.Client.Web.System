import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { listAllItemRequests } from '@/services/item-request-api';

// GET: list ALL item requests (SuperAdmin only — backend enforces the role).
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const requests = await listAllItemRequests(session.accessToken);
    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error listing all item requests:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}
