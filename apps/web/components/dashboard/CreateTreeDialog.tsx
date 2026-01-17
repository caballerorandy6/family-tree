'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createTreeSchema, type CreateTreeInput } from '@familytree/validations/tree.schema';
import type { FamilyTreeWithMemberCount } from '@familytree/types/tree.types';
import { apiWithAuth } from '@/lib/api';
import { useTreeStore } from '@/stores/treeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';

interface CreateTreeDialogProps {
  accessToken: string;
}

export function CreateTreeDialog({ accessToken }: CreateTreeDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { addTree } = useTreeStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTreeInput>({
    resolver: zodResolver(createTreeSchema),
    defaultValues: {
      isPublic: false,
    },
  });

  const onSubmit = async (data: CreateTreeInput) => {
    setIsLoading(true);

    try {
      const response = await apiWithAuth<FamilyTreeWithMemberCount>('/trees', accessToken, {
        method: 'POST',
        body: data,
      });

      if (!response.success) {
        toast.error(response.error.message);
        return;
      }

      // Add tree with member count
      const treeWithCount: FamilyTreeWithMemberCount = {
        ...response.data,
        _count: { members: 0 },
      };

      addTree(treeWithCount);
      toast.success('Family tree created successfully');
      setOpen(false);
      reset();
    } catch {
      toast.error('Failed to create family tree');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Tree
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Family Tree</DialogTitle>
          <DialogDescription>
            Start a new family tree to document your family history.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tree Name</Label>
            <Input
              id="name"
              placeholder="e.g., Smith Family Tree"
              {...register('name')}
              disabled={isLoading}
            />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="A brief description of this family tree..."
              {...register('description')}
              disabled={isLoading}
            />
            {errors.description ? (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            ) : null}
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPublic"
              {...register('isPublic')}
              disabled={isLoading}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isPublic" className="text-sm font-normal">
              Make this tree publicly visible
            </Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Tree'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
