// api/upload.js
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the file from the request
    const { file, fileName, employeeId, documentType } = req.body;

    if (!file || !employeeId || !documentType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error('Token not found in server environment');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Convert base64 back to buffer
    const buffer = Buffer.from(file, 'base64');
    
    const timestamp = Date.now();
    const blobPath = `compliance/${employeeId}/${documentType}/${timestamp}_${fileName}`;

    console.log('Uploading File');
    console.log('Path:', blobPath);
    console.log('Size:', buffer.length, 'bytes');

    const blob = await put(blobPath, buffer, {
      access: 'public',
      token: token,
      
    });

    console.log('Upload successful:', blob.url);

    res.status(200).json({
      success: true,
      url: blob.url,
      path: blobPath,
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}