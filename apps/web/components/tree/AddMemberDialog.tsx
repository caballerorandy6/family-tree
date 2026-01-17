'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createMemberSchema, type CreateMemberInput } from '@familytree/validations/member.schema';
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

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treeId: string;
  accessToken: string;
  existingMembers: FamilyMemberWithRelations[];
}

export function AddMemberDialog({
  open,
  onOpenChange,
  treeId,
  accessToken,
  existingMembers,
}: AddMemberDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [selectedSpouseId, setSelectedSpouseId] = useState<string | undefined>(undefined);
  const [selectedChildrenIds, setSelectedChildrenIds] = useState<string[]>([]);
  const [selectedSiblingIds, setSelectedSiblingIds] = useState<string[]>([]);
  const { addMember, updateMember } = useTreeStore();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateMemberInput>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      familyTreeId: treeId,
      generation: 0,
    },
  });

  const gender = watch('gender');
  const parentId = watch('parentId');
  const secondParentId = watch('secondParentId');
  const birthYear = watch('birthYear');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        familyTreeId: treeId,
        generation: 0,
        firstName: '',
        lastName: '',
        birthYear: undefined,
        deathYear: undefined,
        birthPlace: '',
        occupation: '',
        biography: '',
        gender: undefined,
        parentId: undefined,
        secondParentId: undefined,
      });
      setPhotoUrl(undefined);
      setSelectedSpouseId(undefined);
      setSelectedChildrenIds([]);
      setSelectedSiblingIds([]);
    }
  }, [open, reset, treeId]);

  // Get males and females from existing members
  const maleMembers = existingMembers.filter(m => m.gender === 'male');
  const femaleMembers = existingMembers.filter(m => m.gender === 'female');

  // Calculate generation based on parents
  useEffect(() => {
    if (parentId) {
      const parent = existingMembers.find(m => m.id === parentId);
      if (parent) {
        setValue('generation', (parent.generation ?? 0) + 1);
      }
    } else if (selectedChildrenIds.length > 0) {
      // If adding children, this person is one generation above
      const firstChild = existingMembers.find(m => m.id === selectedChildrenIds[0]);
      if (firstChild) {
        setValue('generation', (firstChild.generation ?? 0) - 1);
      }
    } else if (selectedSpouseId) {
      // Same generation as spouse
      const spouse = existingMembers.find(m => m.id === selectedSpouseId);
      if (spouse) {
        setValue('generation', spouse.generation ?? 0);
      }
    } else if (existingMembers.length === 0) {
      setValue('generation', 0);
    }
  }, [parentId, selectedChildrenIds, selectedSpouseId, existingMembers, setValue]);

  // Filter potential fathers (males not selected as children)
  const potentialFathers = maleMembers.filter(m => !selectedChildrenIds.includes(m.id));

  // Filter potential mothers (females not selected as children)
  const potentialMothers = femaleMembers.filter(m => !selectedChildrenIds.includes(m.id));

  // Filter potential spouses based on gender of new member
  const potentialSpouses = (() => {
    if (!gender) return existingMembers.filter(m => m.id !== parentId && m.id !== secondParentId && !selectedChildrenIds.includes(m.id));
    // Opposite gender for spouse (traditional family model, but allow same-gender)
    return existingMembers.filter(m =>
      m.id !== parentId &&
      m.id !== secondParentId &&
      !selectedChildrenIds.includes(m.id)
    );
  })();

  // Filter potential children (members without 2 parents already, not selected as parent/spouse)
  const potentialChildren = existingMembers.filter(m => {
    if (m.id === parentId || m.id === secondParentId) return false;
    if (m.id === selectedSpouseId) return false;
    // Check if member already has 2 parents
    const hasFullParents = m.parentId && m.secondParentId;
    if (hasFullParents) return false;
    return true;
  });

  // Filter potential siblings (exclude parents, spouse, children)
  const potentialSiblings = existingMembers.filter(m => {
    if (m.id === parentId || m.id === secondParentId) return false;
    if (m.id === selectedSpouseId) return false;
    if (selectedChildrenIds.includes(m.id)) return false;
    return true;
  });

  // Reset form when dialog closes
  const resetForm = () => {
    reset({
      familyTreeId: treeId,
      generation: 0,
    });
    setPhotoUrl(undefined);
    setSelectedSpouseId(undefined);
    setSelectedChildrenIds([]);
    setSelectedSiblingIds([]);
  };

  const onSubmit = async (data: CreateMemberInput) => {
    setIsLoading(true);

    try {
      // Determine relationship label based on gender and connections
      let relationship = 'other';
      if (gender === 'male') {
        if (parentId || secondParentId) relationship = 'son';
        else if (selectedChildrenIds.length > 0) relationship = 'father';
        else if (selectedSpouseId) relationship = 'husband';
      } else if (gender === 'female') {
        if (parentId || secondParentId) relationship = 'daughter';
        else if (selectedChildrenIds.length > 0) relationship = 'mother';
        else if (selectedSpouseId) relationship = 'wife';
      }

      const memberData = {
        ...data,
        relationship,
        photoUrl: photoUrl ?? undefined,
        spouseId: selectedSpouseId,
      };

      // Create the new member
      const response = await apiWithAuth<FamilyMemberWithRelations>('/members', accessToken, {
        method: 'POST',
        body: memberData,
      });

      if (!response.success) {
        toast.error(response.error.message);
        return;
      }

      const newMember = {
        ...response.data,
        parent: null,
        secondParent: null,
        spouse: null,
        children: [],
        files: [],
      };

      addMember(newMember);

      // Update spouse's spouseId if selected
      if (selectedSpouseId) {
        const spouseMember = existingMembers.find(m => m.id === selectedSpouseId);
        if (spouseMember && !spouseMember.spouseId) {
          const updateResponse = await apiWithAuth<FamilyMember>(
            `/members/${selectedSpouseId}`,
            accessToken,
            { method: 'PUT', body: { spouseId: newMember.id } }
          );

          if (updateResponse.success) {
            updateMember(selectedSpouseId, {
              ...spouseMember,
              ...updateResponse.data,
            });
          }
        }
      }

      // Update children's parentId to point to new member
      for (const childId of selectedChildrenIds) {
        const child = existingMembers.find(m => m.id === childId);
        if (!child) continue;

        const updateData: { parentId?: string; secondParentId?: string } = {};

        // Assign based on gender: father to parentId, mother to secondParentId (or vice versa)
        if (!child.parentId) {
          updateData.parentId = newMember.id;
        } else if (!child.secondParentId) {
          updateData.secondParentId = newMember.id;
        } else {
          continue; // Child already has two parents
        }

        const updateResponse = await apiWithAuth<FamilyMember>(
          `/members/${childId}`,
          accessToken,
          { method: 'PUT', body: updateData }
        );

        if (updateResponse.success) {
          updateMember(childId, {
            ...child,
            ...updateResponse.data,
          });
        }
      }

      // Update siblings to share same parents
      const finalParentId = data.parentId;
      const finalSecondParentId = data.secondParentId;

      for (const siblingId of selectedSiblingIds) {
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

      toast.success('Family member added successfully');
      onOpenChange(false);
      resetForm();
    } catch {
      toast.error('Failed to add family member');
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Family Member</DialogTitle>
          <DialogDescription>
            Fill in the details and select family relationships.
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
            <Label>Gender *</Label>
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
                value={birthYear}
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
          {existingMembers.length > 0 && (
            <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
              <h4 className="font-medium text-sm text-foreground">
                Family Relationships
              </h4>

              {/* Parents - Father (male) and Mother (female) */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Parents (max 2: one father, one mother)
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
                          {m.spouseId && ' - Has spouse'}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Children */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Children (select existing members - no limit)
                </Label>
                {potentialChildren.length > 0 ? (
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-white dark:bg-slate-800 rounded border">
                    {potentialChildren.map((m) => {
                      const isSelected = selectedChildrenIds.includes(m.id);
                      const parentCount = (m.parentId ? 1 : 0) + (m.secondParentId ? 1 : 0);
                      const canAddParent = parentCount < 2;

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
                          {parentCount === 1 && ' (1 parent)'}
                          {parentCount === 2 && ' (full)'}
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
                      const sharesFather = parentId && m.parentId === parentId;
                      const sharesMother = secondParentId && m.secondParentId === secondParentId;
                      const isCurrentSibling = sharesFather || sharesMother;

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
          )}

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

          <input type="hidden" {...register('familyTreeId')} value={treeId} />

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
                'Add Member'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
