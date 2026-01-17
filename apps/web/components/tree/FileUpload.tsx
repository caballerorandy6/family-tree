'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { FilePond, registerPlugin } from 'react-filepond';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
import 'filepond/dist/filepond.min.css';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';
import type { FileMetadata } from '@familytree/types/file.types';
import { useTreeStore } from '@/stores/treeStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Upload from 'lucide-react/dist/esm/icons/upload';
import type { FilePondFile, FilePondErrorDescription } from 'filepond';

// Register FilePond plugins
registerPlugin(FilePondPluginImagePreview, FilePondPluginFileValidateType, FilePondPluginFileValidateSize);

interface FileUploadProps {
  memberId: string;
  accessToken: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export function FileUpload({ memberId, accessToken }: FileUploadProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FilePondFile[]>([]);
  const { selectedMember, setSelectedMember } = useTreeStore();
  const pondRef = useRef<FilePond | null>(null);

  const handleProcessFile = (
    _error: FilePondErrorDescription | null,
    file: FilePondFile
  ) => {
    if (_error) {
      toast.error('Failed to upload file');
      return;
    }

    try {
      // Parse the server response
      const response = JSON.parse(file.serverId as string) as { success: boolean; data: FileMetadata };

      if (response.success && selectedMember && selectedMember.id === memberId) {
        setSelectedMember({
          ...selectedMember,
          files: [...selectedMember.files, response.data],
        });
        toast.success('File uploaded successfully');
      }
    } catch {
      // File uploaded but couldn't parse response
      toast.success('File uploaded');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFiles([]);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Upload File
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <FilePond
            ref={pondRef}
            files={files.map((f) => f.file)}
            onupdatefiles={setFiles}
            allowMultiple={false}
            name="file"
            maxFileSize="10MB"
            acceptedFileTypes={ALLOWED_TYPES}
            labelIdle='Drag & drop your file or <span class="filepond--label-action">Browse</span>'
            labelMaxFileSizeExceeded="File is too large"
            labelMaxFileSize="Maximum file size is 10MB"
            labelFileTypeNotAllowed="Invalid file type"
            fileValidateTypeLabelExpectedTypes="Accepts images, PDF, and Word documents"
            server={{
              process: {
                url: `${API_URL}/files`,
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
                ondata: (formData) => {
                  formData.append('familyMemberId', memberId);
                  return formData;
                },
              },
            }}
            onprocessfile={handleProcessFile}
            credits={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
