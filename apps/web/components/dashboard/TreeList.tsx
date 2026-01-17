'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { FamilyTreeWithMemberCount } from '@familytree/types/tree.types';
import { useTreeStore } from '@/stores/treeStore';
import { apiWithAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import TreeDeciduous from 'lucide-react/dist/esm/icons/tree-deciduous';
import Users from 'lucide-react/dist/esm/icons/users';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Lock from 'lucide-react/dist/esm/icons/lock';

interface TreeListProps {
  initialTrees: FamilyTreeWithMemberCount[];
  accessToken: string;
}

export function TreeList({ initialTrees, accessToken }: TreeListProps) {
  const { trees, setTrees, removeTree } = useTreeStore();

  useEffect(() => {
    setTrees(initialTrees);
  }, [initialTrees, setTrees]);

  const handleDelete = async (treeId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this family tree? This action cannot be undone.');
    if (!confirmed) return;

    const response = await apiWithAuth<{ message: string }>(`/trees/${treeId}`, accessToken, {
      method: 'DELETE',
    });

    if (!response.success) {
      toast.error(response.error.message);
      return;
    }

    removeTree(treeId);
    toast.success('Family tree deleted successfully');
  };

  if (trees.length === 0) {
    return (
      <div className="text-center py-12">
        <TreeDeciduous className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No family trees yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first family tree to start preserving your family history.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {trees.map((tree) => (
        <Card key={tree.id} className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="truncate">{tree.name}</CardTitle>
                <CardDescription className="line-clamp-2 mt-1">
                  {tree.description ?? 'No description'}
                </CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleDelete(tree.id)}
                    className="text-destructive cursor-pointer"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{tree._count.members} members</span>
              </div>
              <div className="flex items-center gap-1">
                {tree.isPublic ? (
                  <>
                    <Globe className="h-4 w-4" />
                    <span>Public</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Private</span>
                  </>
                )}
              </div>
            </div>
            <Link href={`/tree/${tree.id}`}>
              <Button className="w-full">View Tree</Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
