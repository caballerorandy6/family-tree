import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { apiWithAuth } from '@/lib/api';
import type { FamilyTreeWithMemberCount } from '@familytree/types/tree.types';
import { TreeList } from '@/components/dashboard/TreeList';
import { CreateTreeDialog } from '@/components/dashboard/CreateTreeDialog';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';

async function getTrees(token: string): Promise<FamilyTreeWithMemberCount[]> {
  const response = await apiWithAuth<FamilyTreeWithMemberCount[]>('/trees', token);
  if (!response.success) {
    return [];
  }
  return response.data;
}

async function TreesSection() {
  const session = await auth();
  if (!session?.accessToken) {
    return null;
  }

  const trees = await getTrees(session.accessToken);

  return <TreeList initialTrees={trees} accessToken={session.accessToken} />;
}

function TreesLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Family Trees</h1>
          <p className="text-muted-foreground">Create and manage your family trees</p>
        </div>
        {session?.accessToken ? <CreateTreeDialog accessToken={session.accessToken} /> : null}
      </div>

      <Suspense fallback={<TreesLoading />}>
        <TreesSection />
      </Suspense>
    </div>
  );
}
