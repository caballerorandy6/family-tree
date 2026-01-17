'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { FileMetadata, SignedUrlResponse } from '@familytree/types/file.types';
import { apiWithAuth } from '@/lib/api';
import { useTreeStore } from '@/stores/treeStore';
import { Button } from '@/components/ui/button';
import FileIcon from 'lucide-react/dist/esm/icons/file';
import FileImage from 'lucide-react/dist/esm/icons/file-image';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Download from 'lucide-react/dist/esm/icons/download';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';

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

export function FileList({ memberId, accessToken, files }: FileListProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const { selectedMember, setSelectedMember } = useTreeStore();

  const handleDownload = async (fileId: string, fileName: string) => {
    setLoadingStates((prev) => ({ ...prev, [fileId]: true }));

    try {
      const response = await apiWithAuth<SignedUrlResponse>(`/files/${fileId}/download`, accessToken);

      if (!response.success) {
        toast.error(response.error.message);
        return;
      }

      // Open signed URL in new tab to trigger download
      const link = document.createElement('a');
      link.href = response.data.url;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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

  if (files.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No files uploaded yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => {
        const Icon = getFileIcon(file.fileType);
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDownload(file.id, file.originalName)}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(file.id)}
                disabled={isDeleting}
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
  );
}
