'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import type { FamilyMemberWithRelations } from '@familytree/types/member.types';
import { apiWithAuth } from '@/lib/api';
import { useTreeStore } from '@/stores/treeStore';
import {
  getParentsOf,
  getChildrenOf,
  getSiblingsOf,
  getSpousesOf,
} from '@/lib/familyValidations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileUpload } from './FileUpload';
import { FileList } from './FileList';
import { EditMemberDialog } from './EditMemberDialog';
import { Pencil, Trash2, Loader2, MapPin, Briefcase, Calendar, Users, Heart, User } from 'lucide-react';

interface MemberDetailDialogProps {
  member: FamilyMemberWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string;
  existingMembers: FamilyMemberWithRelations[];
  treeId: string;
}

interface RelationshipSectionProps {
  title: string;
  icon: React.ReactNode;
  members: FamilyMemberWithRelations[];
  onSelectMember: (member: FamilyMemberWithRelations) => void;
  emptyMessage?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline';
}

function RelationshipSection({
  title,
  icon,
  members,
  onSelectMember,
  emptyMessage,
  badgeVariant = 'secondary',
}: RelationshipSectionProps) {
  if (members.length === 0 && !emptyMessage) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        <span>{title}</span>
        {members.length > 0 && (
          <Badge variant="outline" className="ml-auto">
            {members.length}
          </Badge>
        )}
      </div>
      {members.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelectMember(m)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm"
            >
              {m.photoUrl ? (
                <Image
                  src={m.photoUrl}
                  alt={`${m.firstName} ${m.lastName}`}
                  width={20}
                  height={20}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                  {m.firstName[0]}
                </div>
              )}
              <span>{m.firstName} {m.lastName}</span>
              <Badge variant={badgeVariant} className="text-xs">
                {m.birthYear}
              </Badge>
            </button>
          ))}
        </div>
      ) : emptyMessage ? (
        <p className="text-xs text-muted-foreground italic">{emptyMessage}</p>
      ) : null}
    </div>
  );
}

export function MemberDetailDialog({
  member,
  open,
  onOpenChange,
  accessToken,
  existingMembers,
  treeId,
}: MemberDetailDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { removeMember, setSelectedMember } = useTreeStore();

  // Calculate all relationships
  const relationships = useMemo(() => {
    if (!member) return null;

    const parents = getParentsOf(member, existingMembers);
    const spouses = getSpousesOf(member.id, existingMembers);
    const { fullSiblings, halfSiblings } = getSiblingsOf(member.id, existingMembers);
    const children = getChildrenOf(member.id, existingMembers);

    // Get grandparents (parents of parents)
    const grandparents: FamilyMemberWithRelations[] = [];
    for (const parent of parents) {
      grandparents.push(...getParentsOf(parent, existingMembers));
    }

    // Get grandchildren (children of children)
    const grandchildren: FamilyMemberWithRelations[] = [];
    for (const child of children) {
      grandchildren.push(...getChildrenOf(child.id, existingMembers));
    }

    // Get great-grandparents
    const greatGrandparents: FamilyMemberWithRelations[] = [];
    for (const gp of grandparents) {
      greatGrandparents.push(...getParentsOf(gp, existingMembers));
    }

    // Get great-grandchildren
    const greatGrandchildren: FamilyMemberWithRelations[] = [];
    for (const gc of grandchildren) {
      greatGrandchildren.push(...getChildrenOf(gc.id, existingMembers));
    }

    // Get uncles/aunts (siblings of parents)
    const unclesAunts: FamilyMemberWithRelations[] = [];
    for (const parent of parents) {
      const { fullSiblings: parentSiblings, halfSiblings: parentHalfSiblings } = getSiblingsOf(parent.id, existingMembers);
      unclesAunts.push(...parentSiblings, ...parentHalfSiblings);
    }

    // Get nephews/nieces (children of siblings)
    const nephewsNieces: FamilyMemberWithRelations[] = [];
    for (const sibling of [...fullSiblings, ...halfSiblings]) {
      nephewsNieces.push(...getChildrenOf(sibling.id, existingMembers));
    }

    // Get cousins (children of uncles/aunts)
    const cousins: FamilyMemberWithRelations[] = [];
    for (const ua of unclesAunts) {
      cousins.push(...getChildrenOf(ua.id, existingMembers));
    }

    return {
      greatGrandparents: [...new Map(greatGrandparents.map(m => [m.id, m])).values()],
      grandparents: [...new Map(grandparents.map(m => [m.id, m])).values()],
      parents,
      unclesAunts: [...new Map(unclesAunts.map(m => [m.id, m])).values()],
      spouses,
      fullSiblings,
      halfSiblings,
      cousins: [...new Map(cousins.map(m => [m.id, m])).values()],
      children,
      nephewsNieces: [...new Map(nephewsNieces.map(m => [m.id, m])).values()],
      grandchildren: [...new Map(grandchildren.map(m => [m.id, m])).values()],
      greatGrandchildren: [...new Map(greatGrandchildren.map(m => [m.id, m])).values()],
    };
  }, [member, existingMembers]);

  if (!member || !relationships) return null;

  const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
  const lifespan = member.deathYear
    ? `${member.birthYear} - ${member.deathYear}`
    : `Born ${member.birthYear}`;

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${member.firstName} ${member.lastName}? This will also delete all associated files.`
    );
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const response = await apiWithAuth<{ message: string }>(`/members/${member.id}`, accessToken, {
        method: 'DELETE',
      });

      if (!response.success) {
        toast.error(response.error.message);
        return;
      }

      removeMember(member.id);
      toast.success('Family member deleted successfully');
      onOpenChange(false);
    } catch {
      toast.error('Failed to delete family member');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectMember = (selectedMember: FamilyMemberWithRelations) => {
    setSelectedMember(selectedMember);
  };

  const hasAnyRelationship = Object.values(relationships).some(arr => arr.length > 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Member Details</DialogTitle>
          </DialogHeader>

          {/* Header with photo and basic info */}
          <div className="flex items-start gap-4 mb-4">
            <div className="relative h-24 w-24 rounded-full overflow-hidden bg-muted flex-shrink-0">
              {member.photoUrl ? (
                <Image
                  src={member.photoUrl}
                  alt={`${member.firstName} ${member.lastName}`}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-muted-foreground">
                  {initials}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold truncate">
                {member.firstName} {member.lastName}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="capitalize">
                  {member.relationship?.replace(/-/g, ' ') ?? 'Other'}
                </Badge>
                {member.gender && (
                  <Badge variant="outline" className="capitalize">
                    {member.gender}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="icon" onClick={() => setEditDialogOpen(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Lifespan:</span>
                <span className="font-medium">{lifespan}</span>
              </div>
              {member.birthPlace && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Birthplace:</span>
                  <span className="font-medium">{member.birthPlace}</span>
                </div>
              )}
              {member.deathPlace && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Death place:</span>
                  <span className="font-medium">{member.deathPlace}</span>
                </div>
              )}
              {member.occupation && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Occupation:</span>
                  <span className="font-medium">{member.occupation}</span>
                </div>
              )}
            </div>
            {member.biography && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{member.biography}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Family Relationships - Hierarchical from top to bottom */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Family Relationships
            </h3>

            {hasAnyRelationship ? (
              <div className="space-y-4">
                {/* Ancestors (top) */}
                <RelationshipSection
                  title="Great-Grandparents"
                  icon={<Users className="h-4 w-4" />}
                  members={relationships.greatGrandparents}
                  onSelectMember={handleSelectMember}
                />
                <RelationshipSection
                  title="Grandparents"
                  icon={<Users className="h-4 w-4" />}
                  members={relationships.grandparents}
                  onSelectMember={handleSelectMember}
                />
                <RelationshipSection
                  title="Parents"
                  icon={<Users className="h-4 w-4" />}
                  members={relationships.parents}
                  onSelectMember={handleSelectMember}
                />
                <RelationshipSection
                  title="Uncles & Aunts"
                  icon={<Users className="h-4 w-4" />}
                  members={relationships.unclesAunts}
                  onSelectMember={handleSelectMember}
                />

                {/* Same generation */}
                <RelationshipSection
                  title="Spouse / Partner"
                  icon={<Heart className="h-4 w-4" />}
                  members={relationships.spouses}
                  onSelectMember={handleSelectMember}
                  badgeVariant="default"
                />
                <RelationshipSection
                  title="Full Siblings"
                  icon={<Users className="h-4 w-4" />}
                  members={relationships.fullSiblings}
                  onSelectMember={handleSelectMember}
                />
                <RelationshipSection
                  title="Half-Siblings"
                  icon={<Users className="h-4 w-4" />}
                  members={relationships.halfSiblings}
                  onSelectMember={handleSelectMember}
                />
                <RelationshipSection
                  title="Cousins"
                  icon={<Users className="h-4 w-4" />}
                  members={relationships.cousins}
                  onSelectMember={handleSelectMember}
                />

                {/* Descendants (bottom) */}
                <RelationshipSection
                  title="Children"
                  icon={<Users className="h-4 w-4" />}
                  members={relationships.children}
                  onSelectMember={handleSelectMember}
                />
                <RelationshipSection
                  title="Nephews & Nieces"
                  icon={<Users className="h-4 w-4" />}
                  members={relationships.nephewsNieces}
                  onSelectMember={handleSelectMember}
                />
                <RelationshipSection
                  title="Grandchildren"
                  icon={<Users className="h-4 w-4" />}
                  members={relationships.grandchildren}
                  onSelectMember={handleSelectMember}
                />
                <RelationshipSection
                  title="Great-Grandchildren"
                  icon={<Users className="h-4 w-4" />}
                  members={relationships.greatGrandchildren}
                  onSelectMember={handleSelectMember}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No family relationships found. Add family members to see connections.
              </p>
            )}
          </div>

          <Separator />

          {/* Files & Documents */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Files & Documents</h3>
              <FileUpload memberId={member.id} accessToken={accessToken} />
            </div>
            <FileList memberId={member.id} accessToken={accessToken} files={member.files} />
          </div>
        </DialogContent>
      </Dialog>

      <EditMemberDialog
        member={member}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        accessToken={accessToken}
        existingMembers={existingMembers}
        treeId={treeId}
      />
    </>
  );
}
