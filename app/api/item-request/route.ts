import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { addItemRequest, listMyItemRequests } from '@/services/item-request-api';

// GET: list the caller's own item requests.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const requests = await listMyItemRequests(session.accessToken);
    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error listing item requests:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}

// POST: create a new item request (plain JSON `{ description }`).
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    if (!description) {
      return NextResponse.json(
        { message: 'description is required' },
        { status: 400 },
      );
    }

    const created = await addItemRequest(session.accessToken, { description });
    return NextResponse.json(created);
  } catch (error) {
    console.error('Error creating item request:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}
