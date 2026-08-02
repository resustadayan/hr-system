// src/api/upload.js
import { put } from '@vercel/blob';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const employeeId = formData.get('employeeId');
    const documentType = formData.get('documentType');
    const employeeName = formData.get('employeeName');

    if (!file || !employeeId || !documentType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 }
      );
    }

    // Create file path
    const fileName = `${employeeId}_${documentType}_${Date.now()}_${file.name}`;
    const blobPath = `compliance/${employeeId}/${documentType}/${fileName}`;

    // Upload to Vercel Blob
    const blob = await put(blobPath, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });

    return new Response(
      JSON.stringify({
        success: true,
        url: blob.url,
        path: blobPath,
        downloadUrl: blob.downloadUrl,
        fileName: file.name,
        fileSize: file.size,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { status: 500 }
    );
  }
}