'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { FamilyMemberWithRelations } from '@familytree/types/member.types';
import type { FamilyTree } from '@familytree/types/tree.types';
import { useTreeStore } from '@/stores/treeStore';
import { AddMemberDialog } from './AddMemberDialog';
import { MemberDetailDialog } from './MemberDetailDialog';
import { Button } from '@/components/ui/button';
import { UserPlus, Users } from 'lucide-react';

// Dynamic import to avoid SSR issues
const Chrono = dynamic(() => import('react-chrono').then(mod => mod.Chrono), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[500px]">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
    </div>
  ),
});

interface FamilyTimelineProps {
  tree: FamilyTree;
  initialMembers: FamilyMemberWithRelations[];
  accessToken: string;
}

// Color palette for genders
function getGenderColors(gender?: string | null) {
  if (gender === 'male') {
    return { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' };
  }
  if (gender === 'female') {
    return { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' };
  }
  return { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6' };
}

export function FamilyTimeline({ tree, initialMembers, accessToken }: FamilyTimelineProps) {
  const { members, setMembers, setCurrentTree, selectedMember, setSelectedMember } = useTreeStore();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [mode, setMode] = useState<'HORIZONTAL' | 'VERTICAL' | 'VERTICAL_ALTERNATING'>('VERTICAL_ALTERNATING');

  useEffect(() => {
    setCurrentTree(tree);
    setMembers(initialMembers);
  }, [tree, initialMembers, setCurrentTree, setMembers]);

  // Sort members by birth year
  const sortedMembers = [...members].sort((a, b) => a.birthYear - b.birthYear);

  // Convert members to chrono items
  const items = sortedMembers.map(member => {
    const lifespan = member.deathYear
      ? `${member.birthYear} - ${member.deathYear}`
      : `Born ${member.birthYear}`;

    return {
      title: member.birthYear.toString(),
      cardTitle: `${member.firstName} ${member.lastName}`,
      cardSubtitle: lifespan,
      cardDetailedText: member.occupation || member.relationship || '',
    };
  });

  // Custom content for each card
  const customContent = sortedMembers.map(member => {
    const colors = getGenderColors(member.gender);

    return (
      <div
        key={member.id}
        className="flex flex-col items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
        onClick={() => setSelectedMember(member)}
      >
        {/* Avatar */}
        <div
          className="rounded-full overflow-hidden shadow-lg mb-3"
          style={{
            width: 80,
            height: 80,
            backgroundColor: colors.bg,
            border: `3px solid ${colors.border}`,
          }}
        >
          {member.photoUrl ? (
            <Image
              src={member.photoUrl}
              alt={`${member.firstName} ${member.lastName}`}
              width={80}
              height={80}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span
                className="text-2xl font-medium"
                style={{ color: colors.text, fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                {member.firstName[0]}{member.lastName[0]}
              </span>
            </div>
          )}
        </div>

        {/* Name */}
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          {member.firstName} {member.lastName}
        </h3>

        {/* Lifespan */}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {member.deathYear ? `${member.birthYear} - ${member.deathYear}` : `Born ${member.birthYear}`}
          {member.deathYear && <span className="ml-1">✝</span>}
        </p>

        {/* Occupation/Relationship */}
        {(member.occupation || member.relationship) && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 capitalize">
            {member.occupation || member.relationship}
          </p>
        )}

        {/* Spouse indicator */}
        {member.spouseId && (
          <div className="flex items-center gap-1 mt-2 text-pink-500">
            <span>♥</span>
            <span className="text-xs">Has spouse</span>
          </div>
        )}

        {/* Click hint */}
        <p className="text-xs text-primary mt-3">Click for details</p>
      </div>
    );
  });

  if (members.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #cbd5e1 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div className="relative text-center py-20 px-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-8 shadow-lg">
            <Users className="h-12 w-12 text-primary/70" />
          </div>
          <h3 className="text-3xl font-bold mb-4 text-foreground">Start Your Family Timeline</h3>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto text-lg">
            Begin documenting your family history by adding your first family member.
          </p>
          <Button size="lg" onClick={() => setAddDialogOpen(true)} className="shadow-xl hover:shadow-2xl transition-all duration-300 text-lg px-8 py-6">
            <UserPlus className="mr-3 h-6 w-6" />
            Add First Member
          </Button>
        </div>

        <AddMemberDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          treeId={tree.id}
          accessToken={accessToken}
          existingMembers={members}
        />
      </div>
    );
  }

  // Calculate year range
  const years = members.map(m => m.birthYear);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-inner">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
            <p className="text-sm text-muted-foreground">
              {minYear} – {maxYear}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Mode selector */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border rounded-xl p-1.5 shadow-sm">
            <Button
              variant={mode === 'HORIZONTAL' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setMode('HORIZONTAL')}
            >
              Horizontal
            </Button>
            <Button
              variant={mode === 'VERTICAL_ALTERNATING' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setMode('VERTICAL_ALTERNATING')}
            >
              Alternating
            </Button>
            <Button
              variant={mode === 'VERTICAL' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setMode('VERTICAL')}
            >
              Vertical
            </Button>
          </div>

          <Button onClick={() => setAddDialogOpen(true)} size="lg" className="shadow-md hover:shadow-lg transition-shadow">
            <UserPlus className="mr-2 h-5 w-5" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border shadow-lg overflow-hidden bg-white dark:bg-slate-900" style={{ minHeight: '600px' }}>
        <Chrono
          items={items}
          mode={mode}
          scrollable={{ scrollbar: true }}
          cardHeight={220}
          cardWidth={300}
          contentDetailsHeight={100}
          fontSizes={{
            title: '1rem',
            cardTitle: '1.1rem',
            cardSubtitle: '0.9rem',
            cardText: '0.85rem',
          }}
          theme={{
            primary: '#3b82f6',
            secondary: '#f1f5f9',
            cardBgColor: '#ffffff',
            titleColor: '#3b82f6',
            titleColorActive: '#1d4ed8',
          }}
          useReadMore={false}
          activeItemIndex={0}
        >
          {customContent}
        </Chrono>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/80 border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Legend</span>
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-100 border-2 border-blue-500" />
            <span className="text-sm text-muted-foreground">Male</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-pink-100 border-2 border-pink-500" />
            <span className="text-sm text-muted-foreground">Female</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-purple-100 border-2 border-purple-500" />
            <span className="text-sm text-muted-foreground">Other</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-pink-500 text-sm">♥</span>
            <span className="text-sm text-muted-foreground">Has Spouse</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm">✝</span>
            <span className="text-sm text-muted-foreground">Deceased</span>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        treeId={tree.id}
        accessToken={accessToken}
        existingMembers={members}
      />

      <MemberDetailDialog
        member={selectedMember}
        open={!!selectedMember}
        onOpenChange={(open) => !open && setSelectedMember(null)}
        accessToken={accessToken}
        existingMembers={members}
        treeId={tree.id}
      />
    </div>
  );
}
