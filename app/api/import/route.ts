import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import {
  addImportUpload,
  listMyImportUploads,
  removeImportUpload,
} from '@/services/import-api';
import { getAvailableInstance, uploadFile } from '@/services/file-orchestrator-api';

const CATEGORY = 'Import';

// GET: list the caller's own import uploads.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const uploads = await listMyImportUploads(session.accessToken);
    return NextResponse.json(uploads);
  } catch (error) {
    console.error('Error listing import uploads:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}

// POST: upload a new import file (multipart `file`).
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const token = session.accessToken;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ message: 'file is required' }, { status: 400 });
    }

    // Step 1: ask the orchestrator for an available storage instance.
    const instance = await getAvailableInstance(token, CATEGORY);

    // Step 2: create the metadata row in the Import service (returns the new id).
    const created = await addImportUpload(token, {
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type || 'application/octet-stream',
      storageInstanceId: instance.id,
    });

    // Step 3: push the bytes through the orchestrator. If this fails, roll back
    // the metadata row so no orphan record remains.
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await uploadFile(token, created.id, CATEGORY, buffer);
    } catch (uploadError) {
      try {
        await removeImportUpload(token, { id: created.id });
      } catch (rollbackError) {
        console.error('Failed to roll back import upload metadata:', rollbackError);
      }
      throw uploadError;
    }

    return NextResponse.json(created);
  } catch (error) {
    console.error('Error uploading import file:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}
