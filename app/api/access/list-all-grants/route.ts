import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { listAccessGrantPairs } from '@/services/company-api';

// GET /api/access/list-all-grants — proxies the flat (CompanyId, GrantedToPersonId)
// pairs from KSS.Service.Company. Powers the dashboard Highlights tile.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const data = await listAccessGrantPairs(session.accessToken);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching access grant pairs:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}
