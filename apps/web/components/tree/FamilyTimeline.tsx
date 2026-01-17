'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import type { FamilyMemberWithRelations } from '@familytree/types/member.types';
import type { FamilyTree } from '@familytree/types/tree.types';
import { useTreeStore } from '@/stores/treeStore';
import { AddMemberDialog } from './AddMemberDialog';
import { MemberDetailDialog } from './MemberDetailDialog';
import { Button } from '@/components/ui/button';
import { UserPlus, Users, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

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

// Avatar size
const AVATAR_SIZE = 56;
const YEAR_WIDTH = 80;
const ROW_HEIGHT = 100;

export function FamilyTimeline({ tree, initialMembers, accessToken }: FamilyTimelineProps) {
  const { members, setMembers, setCurrentTree, selectedMember, setSelectedMember } = useTreeStore();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentTree(tree);
    setMembers(initialMembers);
  }, [tree, initialMembers, setCurrentTree, setMembers]);

  // Calculate year range
  const years = members.map(m => m.birthYear);
  const minYear = years.length > 0 ? Math.min(...years) : new Date().getFullYear();
  const maxYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear();
  const yearRange = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  // Group members by year
  const membersByYear = new Map<number, FamilyMemberWithRelations[]>();
  for (const member of members) {
    const existing = membersByYear.get(member.birthYear) || [];
    existing.push(member);
    membersByYear.set(member.birthYear, existing);
  }

  // Calculate max members in any year (for row height)
  const maxMembersInYear = Math.max(1, ...Array.from(membersByYear.values()).map(m => m.length));

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

  const timelineWidth = yearRange.length * YEAR_WIDTH * zoom;
  const timelineHeight = maxMembersInYear * ROW_HEIGHT + 100;

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
              {minYear} – {maxYear} ({maxYear - minYear + 1} years)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Zoom controls */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border rounded-xl p-1.5 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold w-16 text-center text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => setZoom(z => Math.min(2, z + 0.25))}
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => setZoom(1)}
              title="Reset zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <Button onClick={() => setAddDialogOpen(true)} size="lg" className="shadow-md hover:shadow-lg transition-shadow">
            <UserPlus className="mr-2 h-5 w-5" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Timeline container */}
      <div
        ref={containerRef}
        className="relative rounded-2xl border shadow-lg overflow-auto bg-white dark:bg-slate-900"
        style={{ height: '600px' }}
      >
        <div
          className="relative"
          style={{
            width: timelineWidth + 100,
            minHeight: timelineHeight,
          }}
        >
          {/* Year labels at top */}
          <div className="sticky top-0 z-20 flex bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 border-b">
            <div className="w-[50px] shrink-0" /> {/* Spacer */}
            {yearRange.map(year => (
              <div
                key={year}
                className="flex items-center justify-center border-r border-slate-200 dark:border-slate-700"
                style={{ width: YEAR_WIDTH * zoom, height: 50 }}
              >
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {year}
                </span>
              </div>
            ))}
          </div>

          {/* Timeline line */}
          <div
            className="absolute left-[50px] right-0 h-1 bg-gradient-to-r from-slate-300 via-primary/30 to-slate-300 dark:from-slate-700 dark:via-primary/50 dark:to-slate-700"
            style={{ top: 75 }}
          />

          {/* Year markers */}
          {yearRange.map(year => (
            <div
              key={`marker-${year}`}
              className="absolute w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-600 border-2 border-white dark:border-slate-800"
              style={{
                left: 50 + (year - minYear) * YEAR_WIDTH * zoom + (YEAR_WIDTH * zoom) / 2 - 6,
                top: 73,
              }}
            />
          ))}

          {/* Members */}
          <div className="relative pt-[100px] pb-8">
            {yearRange.map(year => {
              const yearMembers = membersByYear.get(year) || [];

              return yearMembers.map((member, idx) => {
                const colors = getGenderColors(member.gender);
                const xPos = 50 + (year - minYear) * YEAR_WIDTH * zoom + (YEAR_WIDTH * zoom) / 2;
                const yPos = idx * ROW_HEIGHT;

                return (
                  <div
                    key={member.id}
                    className="absolute transform -translate-x-1/2 cursor-pointer transition-all duration-200 hover:scale-110 hover:z-10"
                    style={{
                      left: xPos,
                      top: yPos,
                    }}
                    onClick={() => setSelectedMember(member)}
                  >
                    {/* Connection line to timeline */}
                    {idx === 0 && (
                      <div
                        className="absolute left-1/2 w-0.5 bg-slate-300 dark:bg-slate-600"
                        style={{
                          top: -yPos - 25,
                          height: yPos + 25,
                          transform: 'translateX(-50%)',
                        }}
                      />
                    )}

                    {/* Avatar */}
                    <div
                      className="rounded-full overflow-hidden shadow-lg ring-4 ring-white dark:ring-slate-800"
                      style={{
                        width: AVATAR_SIZE,
                        height: AVATAR_SIZE,
                        backgroundColor: colors.bg,
                        border: `3px solid ${colors.border}`,
                      }}
                    >
                      {member.photoUrl ? (
                        <Image
                          src={member.photoUrl}
                          alt={`${member.firstName} ${member.lastName}`}
                          width={AVATAR_SIZE}
                          height={AVATAR_SIZE}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span
                            className="text-lg font-medium"
                            style={{ color: colors.text, fontFamily: 'Inter, system-ui, sans-serif' }}
                          >
                            {member.firstName[0]}{member.lastName[0]}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Name label */}
                    <div className="mt-2 text-center">
                      <p
                        className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap"
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        {member.firstName}
                      </p>
                    </div>

                    {/* Deceased indicator */}
                    {member.deathYear && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-500 flex items-center justify-center">
                        <span className="text-white text-xs">✝</span>
                      </div>
                    )}

                    {/* Spouse indicator */}
                    {member.spouseId && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-pink-100 border border-pink-300 flex items-center justify-center">
                        <span className="text-pink-500 text-xs">♥</span>
                      </div>
                    )}
                  </div>
                );
              });
            })}
          </div>
        </div>
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
