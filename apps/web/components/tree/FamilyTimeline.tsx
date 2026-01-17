'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import type { FamilyMemberWithRelations } from '@familytree/types/member.types';
import type { FamilyTree } from '@familytree/types/tree.types';
import { useTreeStore } from '@/stores/treeStore';
import { AddMemberDialog } from './AddMemberDialog';
import { MemberDetailDialog } from './MemberDetailDialog';
import { Button } from '@/components/ui/button';
import { UserPlus, Users, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentTree(tree);
    setMembers(initialMembers);
  }, [tree, initialMembers, setCurrentTree, setMembers]);

  // Sort members by birth year (oldest first)
  const sortedMembers = [...members].sort((a, b) => a.birthYear - b.birthYear);

  // Get unique years
  const uniqueYears = [...new Set(sortedMembers.map(m => m.birthYear))].sort((a, b) => a - b);

  // Scroll functions
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -300 : 300,
        behavior: 'smooth',
      });
    }
  };

  // Empty state
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

  const minYear = uniqueYears[0] ?? new Date().getFullYear();
  const maxYear = uniqueYears[uniqueYears.length - 1] ?? new Date().getFullYear();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm sm:text-base text-foreground">{members.length} members</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{minYear} → {maxYear}</p>
          </div>
        </div>

        <Button onClick={() => setAddDialogOpen(true)} size="sm" className="w-full sm:w-auto">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* Timeline */}
      <div className="relative rounded-xl border bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 shadow-lg">
        {/* Navigation arrows - hidden on mobile, use swipe instead */}
        <button
          onClick={() => scroll('left')}
          className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-slate-800 shadow-lg border items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-slate-800 shadow-lg border items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        {/* Scrollable area */}
        <div
          ref={scrollRef}
          className="overflow-x-auto overflow-y-hidden px-4 sm:px-16 py-6 sm:py-10"
          style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="relative" style={{ minWidth: uniqueYears.length * 130 + 100, height: 300 }}>

            {/* Timeline line */}
            <div className="absolute left-0 right-0 top-[180px] sm:top-[200px] h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-full shadow-sm" />

            {/* Year markers and members */}
            {uniqueYears.map((year, yearIndex) => {
              const membersInYear = sortedMembers.filter(m => m.birthYear === year);
              const xPosition = yearIndex * 120 + 40;

              return (
                <div
                  key={year}
                  className="absolute flex flex-col items-center"
                  style={{ left: xPosition }}
                >
                  {/* Members for this year */}
                  <div className="flex flex-col items-center gap-3 mb-6">
                    {membersInYear.map((member, memberIndex) => {
                      const colors = getGenderColors(member.gender);
                      const offsetX = membersInYear.length > 1 ? (memberIndex - (membersInYear.length - 1) / 2) * 50 : 0;

                      return (
                        <button
                          key={member.id}
                          onClick={() => setSelectedMember(member)}
                          className="group relative focus:outline-none cursor-pointer"
                          style={{ transform: `translateX(${offsetX}px)` }}
                        >
                          {/* Avatar */}
                          <div
                            className="w-14 h-14 sm:w-20 sm:h-20 rounded-full overflow-hidden shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl cursor-pointer"
                            style={{
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
                                <span className="text-base sm:text-xl font-semibold" style={{ color: colors.text }}>
                                  {member.firstName[0]}{member.lastName[0]}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Deceased indicator */}
                          {member.deathYear && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-600 rounded-full flex items-center justify-center text-white text-xs shadow">
                              ✝
                            </div>
                          )}

                          {/* Tooltip */}
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg z-20">
                            {member.firstName} {member.lastName}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Connection line */}
                  <div className="w-0.5 h-8 bg-gradient-to-b from-slate-300 to-slate-400 dark:from-slate-500 dark:to-slate-600" />

                  {/* Year dot */}
                  <div className="w-4 h-4 rounded-full bg-white dark:bg-slate-700 border-4 border-purple-500 shadow-md -mt-2" />

                  {/* Year label */}
                  <span className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                    {year}
                  </span>
                </div>
              );
            })}
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
