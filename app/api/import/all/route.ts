import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { listAllImportUploads } from '@/services/import-api';

// GET: list ALL import uploads (SuperAdmin only — backend enforces the role).
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const uploads = await listAllImportUploads(session.accessToken);
    return NextResponse.json(uploads);
  } catch (error) {
    console.error('Error listing all import uploads:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}
