import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key } = body;

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Valid key is required' }, { status: 400 });
    }

    // Check environment variables
    const envVars = {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      hasBucketName: !!process.env.AWS_S3_BUCKET_NAME,
      hasAccountId: !!process.env.AWS_REGION
    };

    console.log('Environment variables check:', envVars);

    if (!envVars.hasAccessKey || !envVars.hasSecretKey || !envVars.hasBucketName || !envVars.hasAccountId) {
      console.error('Missing Cloudflare R2 environment variables');
      return NextResponse.json({ 
        error: 'Server not configured for file operations',
        details: 'Missing required environment variables for file storage'
      }, { status: 500 });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
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