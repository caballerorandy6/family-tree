'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import type { FileMetadata, SignedUrlResponse } from '@familytree/types/file.types';
import { apiWithAuth } from '@/lib/api';
import { useTreeStore } from '@/stores/treeStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import FileIcon from 'lucide-react/dist/esm/icons/file';
import FileImage from 'lucide-react/dist/esm/icons/file-image';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Download from 'lucide-react/dist/esm/icons/download';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import X from 'lucide-react/dist/esm/icons/x';

interface FileListProps {
  memberId: string;
  accessToken: string;
  files: FileMetadata[];
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) {
    return FileImage;
  }
  if (fileType === 'application/pdf' || fileType.includes('word')) {
    return FileText;
  }
  return FileIcon;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Add fl_attachment to Cloudinary URL for forced download
function getDownloadUrl(url: string): string {
  // Cloudinary URL format: .../upload/... or .../upload/v123/...
  // We need to insert fl_attachment after /upload/
  return url.replace('/upload/', '/upload/fl_attachment/');
}

export function FileList({ memberId, accessToken, files }: FileListProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { selectedMember, setSelectedMember } = useTreeStore();

  const handlePreview = async (file: FileMetadata) => {
    setLoadingStates((prev) => ({ ...prev, [`preview-${file.id}`]: true }));

    try {
      const response = await apiWithAuth<SignedUrlResponse>(`/files/${file.id}/download`, accessToken);

      if (!response.success) {
        toast.error(response.error.message);
        return;
      }

      setPreviewUrl(response.data.url);
      setPreviewFile(file);
    } catch {
      toast.error('Failed to load file preview');
    } finally {
      setLoadingStates((prev) => ({ ...prev, [`preview-${file.id}`]: false }));
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    setLoadingStates((prev) => ({ ...prev, [fileId]: true }));

    try {
      const response = await apiWithAuth<SignedUrlResponse>(`/files/${fileId}/download`, accessToken);

      if (!response.success) {
        toast.error(response.error.message);
        return;
      }

      // Add fl_attachment to force download
      const downloadUrl = getDownloadUrl(response.data.url);

      // Create a link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Download started');
    } catch {
      toast.error('Failed to download file');
    } finally {
      setLoadingStates((prev) => ({ ...prev, [fileId]: false }));
    }
  };

  const handleDelete = async (fileId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this file?');
    if (!confirmed) return;

    setLoadingStates((prev) => ({ ...prev, [`delete-${fileId}`]: true }));

    try {
      const response = await apiWithAuth<{ message: string }>(`/files/${fileId}`, accessToken, {
        method: 'DELETE',
      });

      if (!response.success) {
        toast.error(response.error.message);
        return;
      }

      // Update selected member to remove deleted file
      if (selectedMember && selectedMember.id === memberId) {
        setSelectedMember({
          ...selectedMember,
          files: selectedMember.files.filter((f) => f.id !== fileId),
        });
      }

      toast.success('File deleted successfully');
    } catch {
      toast.error('Failed to delete file');
    } finally {
      setLoadingStates((prev) => ({ ...prev, [`delete-${fileId}`]: false }));
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  const renderPreviewContent = () => {
    if (!previewFile || !previewUrl) return null;

    const isImage = previewFile.fileType.startsWith('image/');
    const isPdf = previewFile.fileType === 'application/pdf';

    if (isImage) {
      return (
        <div className="relative w-full h-[70vh] bg-black/5 rounded-lg overflow-hidden">
          <Image
            src={previewUrl}
            alt={previewFile.originalName}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 80vw"
          />
        </div>
      );
    }

    if (isPdf) {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-[70vh] rounded-lg border"
          title={previewFile.originalName}
        />
      );
    }

    // For other files (Word docs, etc.), show a message
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">{previewFile.originalName}</p>
        <p className="text-muted-foreground mb-6">
          This file type cannot be previewed in the browser.
        </p>
        <Button onClick={() => handleDownload(previewFile.id, previewFile.originalName)}>
          <Download className="mr-2 h-4 w-4" />
          Download File
        </Button>
      </div>
    );
  };

  if (files.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No files uploaded yet.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {files.map((file) => {
          const Icon = getFileIcon(file.fileType);
          const isPreviewing = loadingStates[`preview-${file.id}`];
          const isDownloading = loadingStates[file.id];
          const isDeleting = loadingStates[`delete-${file.id}`];

          return (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <Icon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.originalName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.fileSize)}
                  {file.category ? ` • ${file.category}` : ''}
                </p>
              </div>
              <div className="flex gap-1">
                {/* Preview button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handlePreview(file)}
                  disabled={isPreviewing}
                  title="Preview"
                  className="cursor-pointer"
                >
                  {isPreviewing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>

                {/* Download button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(file.id, file.originalName)}
                  disabled={isDownloading}
                  title="Download"
                  className="cursor-pointer"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>

                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(file.id)}
                  disabled={isDeleting}
                  title="Delete"
                  className="cursor-pointer text-destructive hover:text-destructive"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span className="truncate">{previewFile?.originalName}</span>
            </DialogTitle>
          </DialogHeader>
          {renderPreviewContent()}
          {previewFile && previewUrl && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={closePreview}>
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
              <Button onClick={() => handleDownload(previewFile.id, previewFile.originalName)}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
