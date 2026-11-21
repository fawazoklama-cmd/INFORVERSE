import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { auth, storage } from '../lib/firebase';

export type StorageFolder = 'branding' | 'articles' | 'thumbnails' | 'categories';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/svg+xml',
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return 'Unsupported format. Allowed: JPG, PNG, WebP, AVIF, SVG.';
  }
  if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
    return 'File size must be greater than 0 and at most 5 MB.';
  }
  return null;
}

export async function uploadEditorialImage(
  file: File,
  folder: StorageFolder,
  onProgress?: (percent: number) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  if (!auth.currentUser) {
    throw new Error('Administrator authentication is required before uploading images.');
  }

  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
  const storagePath = `${folder}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      cacheControl: 'public, max-age=86400',
    });

    task.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0 && onProgress) {
          onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
        }
      },
      (error) => {
        reject(new Error(error.message || 'Firebase Storage upload failed. Check storage rules and bucket setup.'));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(task.snapshot.ref);
          resolve({ downloadUrl, storagePath });
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Failed to resolve uploaded download URL.'));
        }
      }
    );
  });
}

export async function deleteEditorialImageByUrl(url: string): Promise<void> {
  if (!url || !url.includes('firebasestorage')) return;
  if (!auth.currentUser) {
    throw new Error('Administrator authentication is required to delete Storage files.');
  }
  const storageRef = ref(storage, url);
  await deleteObject(storageRef);
}

export async function replaceEditorialImage(
  previousUrl: string,
  newFile: File,
  folder: StorageFolder,
  onProgress?: (percent: number) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  const uploaded = await uploadEditorialImage(newFile, folder, onProgress);
  if (previousUrl && previousUrl.includes('firebasestorage')) {
    try {
      await deleteEditorialImageByUrl(previousUrl);
    } catch {
      // Non-fatal if old asset was already deleted or externally hosted
    }
  }
  return uploaded;
}
