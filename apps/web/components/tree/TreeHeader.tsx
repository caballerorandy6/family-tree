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
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{tree.name}</h1>
            {tree.isPublic ? (
              <Globe className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Lock className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          {tree.description ? (
            <p className="text-muted-foreground">{tree.description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
