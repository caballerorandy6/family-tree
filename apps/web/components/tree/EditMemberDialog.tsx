'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { updateMemberSchema, type UpdateMemberInput } from '@familytree/validations/member.schema';
import type { FamilyMemberWithRelations, FamilyMember } from '@familytree/types/member.types';
import { apiWithAuth } from '@/lib/api';
import { useTreeStore } from '@/stores/treeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PhotoUpload } from '@/components/tree/PhotoUpload';
import { Loader2 } from 'lucide-react';

const GENDER_OPTIONS = ['male', 'female', 'other'] as const;

interface EditMemberDialogProps {
  member: FamilyMemberWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string;
  existingMembers: FamilyMemberWithRelations[];
  treeId: string;
}

export function EditMemberDialog({
  member,
  open,
  onOpenChange,
  accessToken,
  existingMembers,
  treeId,
}: EditMemberDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(member.photoUrl ?? undefined);
  const [selectedSpouseId, setSelectedSpouseId] = useState<string | undefined>(member.spouseId ?? undefined);
  const [selectedChildrenIds, setSelectedChildrenIds] = useState<string[]>([]);
  const [selectedSiblingIds, setSelectedSiblingIds] = useState<string[]>([]);
  const { updateMember, setSelectedMember } = useTreeStore();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateMemberInput>({
    resolver: zodResolver(updateMemberSchema),
    defaultValues: {
      firstName: member.firstName,
      lastName: member.lastName,
      birthYear: member.birthYear,
      deathYear: member.deathYear ?? undefined,
      birthPlace: member.birthPlace ?? undefined,
      deathPlace: member.deathPlace ?? undefined,
      occupation: member.occupation ?? undefined,
      biography: member.biography ?? undefined,
      gender: member.gender as typeof GENDER_OPTIONS[number] | undefined,
      generation: member.generation,
      parentId: member.parentId ?? undefined,
      secondParentId: member.secondParentId ?? undefined,
    },
  });

  const gender = watch('gender');
  const parentId = watch('parentId');
  const secondParentId = watch('secondParentId');

  // Sync state when member changes or dialog opens
  useEffect(() => {
    if (open) {
      setPhotoUrl(member.photoUrl ?? undefined);
      setSelectedSpouseId(member.spouseId ?? undefined);

      // Get current children (members who have this member as parent)
      const currentChildren = existingMembers.filter(
        m => m.parentId === member.id || m.secondParentId === member.id
      ).map(m => m.id);
      setSelectedChildrenIds(currentChildren);

      // Get current siblings (members who share at least one parent - check both slots)
      const currentSiblings = existingMembers.filter(m => {
        if (m.id === member.id) return false;
        // Check if they share parentId (father) - could be in either slot of the other member
        const sharesParent1 = member.parentId && (m.parentId === member.parentId || m.secondParentId === member.parentId);
        // Check if they share secondParentId (mother) - could be in either slot of the other member
        const sharesParent2 = member.secondParentId && (m.parentId === member.secondParentId || m.secondParentId === member.secondParentId);
        return sharesParent1 || sharesParent2;
      }).map(m => m.id);
      setSelectedSiblingIds(currentSiblings);

      // Reset form with member data
      reset({
        firstName: member.firstName,
        lastName: member.lastName,
        birthYear: member.birthYear,
        deathYear: member.deathYear ?? undefined,
        birthPlace: member.birthPlace ?? undefined,
        deathPlace: member.deathPlace ?? undefined,
        occupation: member.occupation ?? undefined,
        biography: member.biography ?? undefined,
        gender: member.gender as typeof GENDER_OPTIONS[number] | undefined,
        generation: member.generation,
        parentId: member.parentId ?? undefined,
        secondParentId: member.secondParentId ?? undefined,
      });
    }
  }, [open, member, existingMembers, reset]);

  // Get males and females from existing members (excluding self)
  const maleMembers = existingMembers.filter(m => m.gender === 'male' && m.id !== member.id);
  const femaleMembers = existingMembers.filter(m => m.gender === 'female' && m.id !== member.id);

  // Filter potential fathers (males not selected as children, not self)
  const potentialFathers = maleMembers.filter(m => !selectedChildrenIds.includes(m.id));

  // Filter potential mothers (females not selected as children, not self)
  const potentialMothers = femaleMembers.filter(m => !selectedChildrenIds.includes(m.id));

  // Filter potential spouses (exclude self, parents, children)
  const potentialSpouses = existingMembers.filter(m => {
    if (m.id === member.id) return false;
    if (m.id === parentId || m.id === secondParentId) return false;
    if (selectedChildrenIds.includes(m.id)) return false;
    return true;
  });

  // Filter potential children (exclude self, parents, spouse, and those with 2 parents already unless one is this member)
  const potentialChildren = existingMembers.filter(m => {
    if (m.id === member.id) return false;
    if (m.id === parentId || m.id === secondParentId) return false;
    if (m.id === selectedSpouseId) return false;

    // Check if member already has 2 parents (and neither is this member)
    const hasThisAsParent = m.parentId === member.id || m.secondParentId === member.id;
    const hasFullParents = m.parentId && m.secondParentId;
    if (hasFullParents && !hasThisAsParent) return false;

    return true;
  });

  // Filter potential siblings (exclude self, parents, spouse, children, same generation)
  const potentialSiblings = existingMembers.filter(m => {
    if (m.id === member.id) return false;
    if (m.id === parentId || m.id === secondParentId) return false;
    if (m.id === selectedSpouseId) return false;
    if (selectedChildrenIds.includes(m.id)) return false;
    return true;
  });

  // Calculate generation based on parents or children
  useEffect(() => {
    if (parentId) {
      const parent = existingMembers.find(m => m.id === parentId);
      if (parent) {
        setValue('generation', (parent.generation ?? 0) + 1);
      }
    } else if (selectedChildrenIds.length > 0) {
      const firstChild = existingMembers.find(m => m.id === selectedChildrenIds[0]);
      if (firstChild) {
        setValue('generation', (firstChild.generation ?? 0) - 1);
      }
    } else if (selectedSpouseId) {
      const spouse = existingMembers.find(m => m.id === selectedSpouseId);
      if (spouse) {
        setValue('generation', spouse.generation ?? 0);
      }
    }
  }, [parentId, selectedChildrenIds, selectedSpouseId, existingMembers, setValue]);

  const toggleChildSelection = (childId: string) => {
    setSelectedChildrenIds(prev =>
      prev.includes(childId)
        ? prev.filter(id => id !== childId)
        : [...prev, childId]
    );
  };

  const toggleSiblingSelection = (siblingId: string) => {
    setSelectedSiblingIds(prev =>
      prev.includes(siblingId)
        ? prev.filter(id => id !== siblingId)
        : [...prev, siblingId]
    );
  };

  const onSubmit = async (data: UpdateMemberInput) => {
    setIsLoading(true);

    try {
      const oldSpouseId = member.spouseId;
      const newSpouseId = selectedSpouseId;

      // Get current children before update
      const oldChildrenIds = existingMembers
        .filter(m => m.parentId === member.id || m.secondParentId === member.id)
        .map(m => m.id);

      // Update the member
      const response = await apiWithAuth<FamilyMember>(`/members/${member.id}`, accessToken, {
        method: 'PUT',
        body: {
          ...data,
          photoUrl: photoUrl ?? null,
          spouseId: newSpouseId ?? null,
        },
      });

      if (!response.success) {
        toast.error(response.error.message);
        return;
      }

      const updatedMember = {
        ...member,
        ...response.data,
      };
      updateMember(member.id, updatedMember);

      // Handle bidirectional spouse relationship
      if (oldSpouseId && oldSpouseId !== newSpouseId) {
        const oldSpouse = existingMembers.find(m => m.id === oldSpouseId);
        if (oldSpouse && oldSpouse.spouseId === member.id) {
          const clearResponse = await apiWithAuth<FamilyMember>(
            `/members/${oldSpouseId}`,
            accessToken,
            { method: 'PUT', body: { spouseId: null } }
          );
          if (clearResponse.success) {
            updateMember(oldSpouseId, { ...oldSpouse, ...clearResponse.data, spouseId: null });
          }
        }
      }

      if (newSpouseId) {
        const newSpouse = existingMembers.find(m => m.id === newSpouseId);
        if (newSpouse && newSpouse.spouseId !== member.id) {
          if (newSpouse.spouseId) {
            const theirOldSpouse = existingMembers.find(m => m.id === newSpouse.spouseId);
            if (theirOldSpouse && theirOldSpouse.spouseId === newSpouseId) {
              const clearTheirResponse = await apiWithAuth<FamilyMember>(
                `/members/${newSpouse.spouseId}`,
                accessToken,
                { method: 'PUT', body: { spouseId: null } }
              );
              if (clearTheirResponse.success) {
                updateMember(newSpouse.spouseId, { ...theirOldSpouse, ...clearTheirResponse.data, spouseId: null });
              }
            }
          }
          const updateResponse = await apiWithAuth<FamilyMember>(
            `/members/${newSpouseId}`,
            accessToken,
            { method: 'PUT', body: { spouseId: member.id } }
          );
          if (updateResponse.success) {
            updateMember(newSpouseId, { ...newSpouse, ...updateResponse.data, spouseId: member.id });
          }
        }
      }

      // Handle children updates
      // Remove this member as parent from children that were deselected
      const removedChildren = oldChildrenIds.filter(id => !selectedChildrenIds.includes(id));
      for (const childId of removedChildren) {
        const child = existingMembers.find(m => m.id === childId);
        if (!child) continue;

        const updateData: { parentId?: string | null; secondParentId?: string | null } = {};
        if (child.parentId === member.id) {
          updateData.parentId = null;
        }
        if (child.secondParentId === member.id) {
          updateData.secondParentId = null;
        }

        if (Object.keys(updateData).length > 0) {
          const updateResponse = await apiWithAuth<FamilyMember>(
            `/members/${childId}`,
            accessToken,
            { method: 'PUT', body: updateData }
          );
          if (updateResponse.success) {
            updateMember(childId, { ...child, ...updateResponse.data });
          }
        }
      }

      // Add this member as parent to newly selected children
      const addedChildren = selectedChildrenIds.filter(id => !oldChildrenIds.includes(id));
      for (const childId of addedChildren) {
        const child = existingMembers.find(m => m.id === childId);
        if (!child) continue;

        const updateData: { parentId?: string; secondParentId?: string } = {};
        if (!child.parentId) {
          updateData.parentId = member.id;
        } else if (!child.secondParentId) {
          updateData.secondParentId = member.id;
        } else {
          continue; // Child already has two parents
        }

        const updateResponse = await apiWithAuth<FamilyMember>(
          `/members/${childId}`,
          accessToken,
          { method: 'PUT', body: updateData }
        );
        if (updateResponse.success) {
          updateMember(childId, { ...child, ...updateResponse.data });
        }
      }

      // Handle siblings updates - siblings share the same parents
      const finalParentId = data.parentId;
      const finalSecondParentId = data.secondParentId;

      // Get current siblings before update (check both slots)
      const oldSiblingIds = existingMembers
        .filter(m => {
          if (m.id === member.id) return false;
          const sharesParent1 = member.parentId && (m.parentId === member.parentId || m.secondParentId === member.parentId);
          const sharesParent2 = member.secondParentId && (m.parentId === member.secondParentId || m.secondParentId === member.secondParentId);
          return sharesParent1 || sharesParent2;
        })
        .map(m => m.id);

      // For newly added siblings, assign same parents
      const addedSiblings = selectedSiblingIds.filter(id => !oldSiblingIds.includes(id));
      for (const siblingId of addedSiblings) {
        const sibling = existingMembers.find(m => m.id === siblingId);
        if (!sibling) continue;

        const siblingUpdateData: { parentId?: string | null; secondParentId?: string | null } = {};

        // Assign this member's parents to the sibling
        if (finalParentId && sibling.parentId !== finalParentId) {
          siblingUpdateData.parentId = finalParentId;
        }
        if (finalSecondParentId && sibling.secondParentId !== finalSecondParentId) {
          siblingUpdateData.secondParentId = finalSecondParentId;
        }

        if (Object.keys(siblingUpdateData).length > 0) {
          const updateResponse = await apiWithAuth<FamilyMember>(
            `/members/${siblingId}`,
            accessToken,
            { method: 'PUT', body: siblingUpdateData }
          );
          if (updateResponse.success) {
            updateMember(siblingId, { ...sibling, ...updateResponse.data });
          }
        }
      }

      setSelectedMember(updatedMember);
      toast.success('Family member updated successfully');
      onOpenChange(false);
    } catch {
      toast.error('Failed to update family member');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Family Member</DialogTitle>
          <DialogDescription>
            Update the information for {member.firstName} {member.lastName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" {...register('firstName')} disabled={isLoading} />
              {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" {...register('lastName')} disabled={isLoading} />
              {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
            </div>
          </div>

          {/* Photo upload */}
          <PhotoUpload
            treeId={treeId}
            accessToken={accessToken}
            value={photoUrl}
            onChange={setPhotoUrl}
            disabled={isLoading}
          />

          {/* Gender */}
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={gender ?? '__none__'}
              onValueChange={(value) => setValue('gender', value === '__none__' ? undefined : value as typeof GENDER_OPTIONS[number])}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not specified</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Birth/Death years */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Birth Year *</Label>
              <DatePicker
                value={watch('birthYear')}
                onChange={(year) => setValue('birthYear', year ?? 0)}
                placeholder="Select year"
                disabled={isLoading}
              />
              {errors.birthYear && <p className="text-sm text-destructive">{errors.birthYear.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Death Year</Label>
              <DatePicker
                value={watch('deathYear') ?? undefined}
                onChange={(year) => setValue('deathYear', year)}
                placeholder="(optional)"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Family Relationships Section */}
          <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
            <h4 className="font-medium text-sm text-foreground">
              Family Relationships
            </h4>

            {/* Parents - Father (male) and Mother (female) */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Parents
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {/* Father */}
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Father
                  </Label>
                  <Select
                    value={parentId ?? '__none__'}
                    onValueChange={(value) => setValue('parentId', value === '__none__' ? undefined : value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select father" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {potentialFathers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.firstName} {m.lastName} ({m.birthYear})
                        </SelectItem>
                      ))}
                      {potentialFathers.length === 0 && (
                        <SelectItem value="__empty__" disabled>
                          No male members available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Mother */}
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                    Mother
                  </Label>
                  <Select
                    value={secondParentId ?? '__none__'}
                    onValueChange={(value) => setValue('secondParentId', value === '__none__' ? undefined : value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select mother" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {potentialMothers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.firstName} {m.lastName} ({m.birthYear})
                        </SelectItem>
                      ))}
                      {potentialMothers.length === 0 && (
                        <SelectItem value="__empty__" disabled>
                          No female members available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Spouse */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Spouse / Partner
              </Label>
              <Select
                value={selectedSpouseId ?? '__none__'}
                onValueChange={(value) => setSelectedSpouseId(value === '__none__' ? undefined : value)}
                disabled={isLoading}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select spouse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {potentialSpouses.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${m.gender === 'male' ? 'bg-blue-500' : m.gender === 'female' ? 'bg-pink-500' : 'bg-purple-500'}`}></span>
                        {m.firstName} {m.lastName} ({m.birthYear})
                        {m.spouseId && m.spouseId !== member.id && ' - Has spouse'}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Children */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Children
              </Label>
              {potentialChildren.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-white dark:bg-slate-800 rounded border">
                  {potentialChildren.map((m) => {
                    const isSelected = selectedChildrenIds.includes(m.id);
                    const hasThisAsParent = m.parentId === member.id || m.secondParentId === member.id;
                    const parentCount = (m.parentId ? 1 : 0) + (m.secondParentId ? 1 : 0);
                    const canAddParent = parentCount < 2 || hasThisAsParent;

                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => canAddParent && toggleChildSelection(m.id)}
                        disabled={!canAddParent && !isSelected}
                        className={`
                          flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-colors cursor-pointer
                          ${isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : canAddParent
                              ? 'bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border-slate-200 dark:border-slate-600'
                              : 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800'
                          }
                        `}
                      >
                        <span className={`w-2 h-2 rounded-full ${m.gender === 'male' ? 'bg-blue-500' : m.gender === 'female' ? 'bg-pink-500' : 'bg-purple-500'}`}></span>
                        {m.firstName} {m.lastName}
                        {!hasThisAsParent && parentCount === 1 && ' (1 parent)'}
                        {!hasThisAsParent && parentCount === 2 && ' (full)'}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic p-2">No available members to add as children</p>
              )}
              {selectedChildrenIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedChildrenIds.length} child{selectedChildrenIds.length !== 1 ? 'ren' : ''} selected
                </p>
              )}
            </div>

            {/* Siblings */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Siblings (share same parents)
              </Label>
              {potentialSiblings.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-white dark:bg-slate-800 rounded border">
                  {potentialSiblings.map((m) => {
                    const isSelected = selectedSiblingIds.includes(m.id);
                    // Check both slots for shared parents
                    const sharesParent1 = parentId && (m.parentId === parentId || m.secondParentId === parentId);
                    const sharesParent2 = secondParentId && (m.parentId === secondParentId || m.secondParentId === secondParentId);
                    const isCurrentSibling = sharesParent1 || sharesParent2;

                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleSiblingSelection(m.id)}
                        className={`
                          flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-colors cursor-pointer
                          ${isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border-slate-200 dark:border-slate-600'
                          }
                        `}
                      >
                        <span className={`w-2 h-2 rounded-full ${m.gender === 'male' ? 'bg-blue-500' : m.gender === 'female' ? 'bg-pink-500' : 'bg-purple-500'}`}></span>
                        {m.firstName} {m.lastName}
                        {isCurrentSibling && !isSelected && ' ✓'}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic p-2">No available members to add as siblings</p>
              )}
              {selectedSiblingIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedSiblingIds.length} sibling{selectedSiblingIds.length !== 1 ? 's' : ''} selected
                </p>
              )}
              {(parentId || secondParentId) && selectedSiblingIds.length > 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Siblings will share the same parents when saved
                </p>
              )}
            </div>
          </div>

          {/* Optional fields */}
          <details className="group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Additional information (optional)
            </summary>
            <div className="mt-3 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthPlace">Birth Place</Label>
                  <Input id="birthPlace" {...register('birthPlace')} disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input id="occupation" {...register('occupation')} disabled={isLoading} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="biography">Biography</Label>
                <Textarea id="biography" {...register('biography')} disabled={isLoading} />
              </div>
            </div>
          </details>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
