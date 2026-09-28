import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { getImportUploadById } from '@/services/import-api';
import { downloadFile } from '@/services/file-orchestrator-api';

// GET: download the stored bytes for one import upload.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const token = session.accessToken;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: 'id is required' }, { status: 400 });
    }

    const doc = await getImportUploadById(token, id);
    const base64 = await downloadFile(token, id, doc.storageInstanceId);
    if (!base64) {
      return NextResponse.json({ message: 'File not found' }, { status: 404 });
    }

    const buffer = Buffer.from(base64, 'base64');
    const contentType = doc.contentType || 'application/octet-stream';
    const fileName = doc.fileName || 'download';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': 'sandbox',
      },
    });
  } catch (error) {
    console.error('Error downloading import file:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}
