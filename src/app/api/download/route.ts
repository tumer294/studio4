
import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const {
  CLOUDFLARE_R2_ACCESS_KEY_ID,
  CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  CLOUDFLARE_R2_BUCKET_NAME,
  CLOUDFLARE_ACCOUNT_ID
} = process.env;

console.log('Environment variables check:', {
  hasAccessKey: !!CLOUDFLARE_R2_ACCESS_KEY_ID,
  hasSecretKey: !!CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  hasBucketName: !!CLOUDFLARE_R2_BUCKET_NAME,
  hasAccountId: !!CLOUDFLARE_ACCOUNT_ID
});

// Cloudflare R2 için S3 istemcisi
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key } = body;

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Valid key is required' }, { status: 400 });
    }

    // Cloudflare R2 environment variables kontrolü
    if (!CLOUDFLARE_R2_ACCESS_KEY_ID || !CLOUDFLARE_R2_SECRET_ACCESS_KEY || !CLOUDFLARE_R2_BUCKET_NAME || !CLOUDFLARE_ACCOUNT_ID) {
      console.error('Missing Cloudflare R2 environment variables');
      return NextResponse.json({ error: 'Server not configured for file operations' }, { status: 500 });
    }

    const command = new GetObjectCommand({
      Bucket: CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.json({ signedUrl });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate download URL',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
