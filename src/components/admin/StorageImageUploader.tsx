import React, { useRef, useState } from 'react';
import { ImagePlus, Trash2, UploadCloud } from 'lucide-react';
import {
  deleteEditorialImageByUrl,
  replaceEditorialImage,
  uploadEditorialImage,
  validateImageFile,
  type StorageFolder,
} from '../../services/storageService';

interface StorageImageUploaderProps {
  folder: StorageFolder;
  currentUrl: string;
  label: string;
  onChangeUrl: (nextUrl: string) => void;
}

export function StorageImageUploader({
  folder,
  currentUrl,
  label,
  onChangeUrl,
}: StorageImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      e.target.value = '';
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const result = currentUrl.includes('firebasestorage')
        ? await replaceEditorialImage(currentUrl, file, folder, setProgress)
        : await uploadEditorialImage(file, folder, setProgress);
      onChangeUrl(result.downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async () => {
    setError(null);
    if (currentUrl.includes('firebasestorage')) {
      try {
        await deleteEditorialImageByUrl(currentUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to delete file from Storage.');
        return;
      }
    }
    onChangeUrl('');
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-[#F3F5F8] p-3 dark:border-slate-700 dark:bg-[#071426]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {label} <span className="font-mono text-[11px] text-[#2878FF]">/{folder}</span>
        </span>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#2878FF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1f63d6] disabled:opacity-60"
          >
            {currentUrl ? <UploadCloud className="h-3.5 w-3.5" /> : <ImagePlus className="h-3.5 w-3.5" />}
            <span>{uploading ? `Uploading ${progress}%` : currentUrl ? 'Replace Image' : 'Upload Image'}</span>
          </button>
          {currentUrl && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => void handleDelete()}
              aria-label={`Remove ${label}`}
              className="inline-flex items-center gap-1 rounded-md border border-rose-300 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Remove</span>
            </button>
          )}
        </div>
      </div>

      {uploading && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full bg-[#2878FF] transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {currentUrl && (
        <div className="flex items-center gap-3 pt-1">
          <img
            src={currentUrl}
            alt={label}
            className="h-14 w-24 rounded border border-slate-200 object-cover dark:border-slate-700"
          />
          <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
            {currentUrl}
          </p>
        </div>
      )}

      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Allowed formats: JPG, PNG, WebP, AVIF, SVG · Max 5 MB
      </p>
    </div>
  );
}
