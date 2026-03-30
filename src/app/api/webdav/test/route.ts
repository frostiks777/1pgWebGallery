import { NextResponse } from 'next/server';
import { testWebDAVConnection } from '@/lib/webdav';

export async function GET() {
  // Diagnostic endpoint — only available in development
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const photosDir = process.env.PHOTOS_DIR || '/Photos';
    const result = await testWebDAVConnection(photosDir);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[WebDAV test] Error:', error);
    return NextResponse.json({ success: false, message: 'Connection test failed.' }, { status: 500 });
  }
}
