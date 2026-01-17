import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

interface UploadResult {
  fileKey: string;
  fileUrl: string;
}

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: string = 'files'
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    // Determine resource type based on mime type
    const resourceType = mimeType.startsWith('image/') ? 'image' : 'raw';

    // Get file extension
    const extension = originalName.split('.').pop() ?? '';

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `Family Timeline/${folder}`,
        resource_type: resourceType,
        format: resourceType === 'image' ? undefined : extension,
        transformation: resourceType === 'image' ? [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ] : undefined,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result) {
          reject(new Error('Upload failed - no result returned'));
          return;
        }
        resolve({
          fileKey: result.public_id,
          fileUrl: result.secure_url,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

export async function deleteFile(fileKey: string): Promise<void> {
  // Determine if it's an image or raw file
  // Documents (pdf, doc, docx) are raw files, everything else in profiles/members is image
  const isImage = fileKey.includes('/profiles/') ||
    (fileKey.includes('/members/') && !fileKey.match(/\.(pdf|doc|docx)$/i));

  const resourceType = isImage ? 'image' : 'raw';

  await cloudinary.uploader.destroy(fileKey, {
    resource_type: resourceType,
  });
}

export async function getSignedDownloadUrl(fileKey: string): Promise<string> {
  // Determine resource type based on the folder path
  // Images are in /profiles/ or /members/, documents are raw files
  const isImage = fileKey.includes('/profiles/') ||
    (fileKey.includes('/members/') && !fileKey.match(/\.(pdf|doc|docx)$/i));

  const resourceType = isImage ? 'image' : 'raw';

  // For public files, just return the secure URL
  const url = cloudinary.url(fileKey, {
    secure: true,
    resource_type: resourceType,
  });

  return url;
}

// For profile photos, return the direct URL (public)
export function getPublicUrl(fileKey: string): string {
  return cloudinary.url(fileKey, {
    secure: true,
  });
}
