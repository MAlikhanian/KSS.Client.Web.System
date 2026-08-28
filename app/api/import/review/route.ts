import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { reviewImportUpload } from '@/services/import-api';

// PUT: approve / reject an import upload.
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, statusId, reviewNote } = body ?? {};
    if (!id || !statusId) {
      return NextResponse.json(
        { message: 'id and statusId are required' },
        { status: 400 },
      );
    }

    await reviewImportUpload(session.accessToken, { id, statusId, reviewNote });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reviewing import upload:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}
