import { NextResponse } from 'next/server';
import { testWebDAVConnection } from '@/lib/webdav';

export async function GET() {
  try {
    const photosDir = process.env.PHOTOS_DIR || '/Photos';
    const result = await testWebDAVConnection(photosDir);
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `Error testing connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }, { status: 500 });
  }
}
