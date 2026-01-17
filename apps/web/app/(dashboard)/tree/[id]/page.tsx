import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { apiWithAuth } from '@/lib/api';
import type { FamilyTree } from '@familytree/types/tree.types';
import type { FamilyMemberWithRelations } from '@familytree/types/member.types';
import { FamilyTreeD3 } from '@/components/tree/FamilyTreeD3';
import { TreeHeader } from '@/components/tree/TreeHeader';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';

interface TreePageProps {
  params: Promise<{ id: string }>;
}

async function getTree(id: string, token: string): Promise<FamilyTree | null> {
  const response = await apiWithAuth<FamilyTree>(`/trees/${id}`, token);
  if (!response.success) {
    return null;
  }
  return response.data;
}

async function getMembers(treeId: string, token: string): Promise<FamilyMemberWithRelations[]> {
  const response = await apiWithAuth<FamilyMemberWithRelations[]>(`/members/tree/${treeId}`, token);
  if (!response.success) {
    return [];
  }
  return response.data;
}

async function TreeContent({ treeId, accessToken }: { treeId: string; accessToken: string }) {
  const [tree, members] = await Promise.all([
    getTree(treeId, accessToken),
    getMembers(treeId, accessToken),
  ]);

  if (!tree) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <TreeHeader tree={tree} accessToken={accessToken} />
      <FamilyTreeD3 tree={tree} initialMembers={members} accessToken={accessToken} />
    </div>
  );
}

function TreeLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default async function TreePage({ params }: TreePageProps) {
  const session = await auth();
  const resolvedParams = await params;

  if (!session?.accessToken) {
    notFound();
  }

  return (
    <Suspense fallback={<TreeLoading />}>
      <TreeContent treeId={resolvedParams.id} accessToken={session.accessToken} />
    </Suspense>
  );
}
