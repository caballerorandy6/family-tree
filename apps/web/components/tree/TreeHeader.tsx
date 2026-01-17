'use client';

import Link from 'next/link';
import type { FamilyTree } from '@familytree/types/tree.types';
import { Button } from '@/components/ui/button';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Lock from 'lucide-react/dist/esm/icons/lock';

interface TreeHeaderProps {
  tree: FamilyTree;
  accessToken: string;
}

export function TreeHeader({ tree }: TreeHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{tree.name}</h1>
            {tree.isPublic ? (
              <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
            ) : (
              <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
            )}
          </div>
          {tree.description ? (
            <p className="text-sm text-muted-foreground line-clamp-2">{tree.description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
