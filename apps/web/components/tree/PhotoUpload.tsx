'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Camera, X, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface PhotoUploadProps {
  treeId: string;
  accessToken: string;
  value?: string;
  onChange: (photoUrl: string | undefined) => void;
  disabled?: boolean;
}

export function PhotoUpload({
  treeId,
  accessToken,
  value,
  onChange,
  disabled = false,
}: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast.error('Please select a valid image (JPEG, PNG, WebP, or GIF)');
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error('Image must be smaller than 5MB');
        return;
      }

      // Show preview immediately
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      // Upload file
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('treeId', treeId);

        const response = await fetch(`${API_URL}/files/profile-photo`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        });

        const result = await response.json() as { success: boolean; data?: { photoUrl: string }; error?: { message: string } };

        if (!response.ok || !result.success) {
          throw new Error(result.error?.message ?? 'Upload failed');
        }

        if (result.data?.photoUrl) {
          onChange(result.data.photoUrl);
          setPreviewUrl(result.data.photoUrl);
          toast.success('Photo uploaded successfully');
        }
      } catch (error) {
        // Revert preview on error
        setPreviewUrl(value);
        toast.error(error instanceof Error ? error.message : 'Failed to upload photo');
      } finally {
        setIsUploading(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [accessToken, onChange, treeId, value]
  );

  const handleRemovePhoto = useCallback(() => {
    setPreviewUrl(undefined);
    onChange(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onChange]);

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  return (
    <div className="space-y-2">
      <Label>Profile Photo (optional)</Label>
      <div className="flex items-center gap-4">
        {/* Photo preview or placeholder */}
        <div
          className={`relative h-24 w-24 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted transition-colors ${
            !disabled && !isUploading ? 'cursor-pointer hover:border-primary/50 hover:bg-muted/80' : ''
          }`}
          onClick={handleClick}
          onKeyDown={(e) => e.key === 'Enter' && handleClick()}
          role="button"
          tabIndex={disabled || isUploading ? -1 : 0}
          aria-label={previewUrl ? 'Change profile photo' : 'Upload profile photo'}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground mt-1">Uploading...</span>
            </div>
          ) : previewUrl ? (
            <Image
              src={previewUrl}
              alt="Profile photo preview"
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Camera className="h-8 w-8" />
              <span className="text-xs mt-1">Add Photo</span>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {/* Remove button */}
        {previewUrl && !isUploading ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemovePhoto}
            disabled={disabled}
            className="text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Click to upload. JPEG, PNG, WebP or GIF. Max 5MB.
      </p>
    </div>
  );
}
