'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createMemberSchema, type CreateMemberInput } from '@familytree/validations/member.schema';
import type { FamilyMemberWithRelations, FamilyMember } from '@familytree/types/member.types';
import { apiWithAuth } from '@/lib/api';
import { useTreeStore } from '@/stores/treeStore';
import {
  runAllValidations,
  getValidParentOptions,
  getMemberDisplayInfo,
  getSpousesOf,
  areSpouses,
  calculateRelationship,
  type MemberType,
} from '@/lib/familyValidations';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PhotoUpload } from '@/components/tree/PhotoUpload';
import { Loader2, AlertTriangle, AlertCircle, Users, UserPlus, Heart, GitBranch } from 'lucide-react';

const GENDER_OPTIONS = ['male', 'female', 'other'] as const;

const MEMBER_TYPE_OPTIONS: { value: MemberType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'ancestor',
    label: 'Ancestor',
    description: 'Parent, grandparent, great-grandparent...',
    icon: <Users className="h-4 w-4" />
  },
  {
    value: 'descendant',
    label: 'Descendant',
    description: 'Child, grandchild, great-grandchild...',
    icon: <UserPlus className="h-4 w-4" />
  },
  {
    value: 'sibling',
    label: 'Sibling',
    description: 'Full sibling or half-sibling',
    icon: <GitBranch className="h-4 w-4" />
  },
  {
    value: 'spouse',
    label: 'Spouse/Partner',
    description: 'Husband, wife, partner',
    icon: <Heart className="h-4 w-4" />
  },
];

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
  const [memberType, setMemberType] = useState<MemberType | undefined>(undefined);
  const [relatedToId, setRelatedToId] = useState<string | undefined>(undefined);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [isHalfSibling, setIsHalfSibling] = useState(false);
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

  // Get the related member
  const relatedMember = useMemo(() => {
    if (!relatedToId) return undefined;
    return existingMembers.find(m => m.id === relatedToId);
  }, [relatedToId, existingMembers]);

  // Get valid parent options based on member type
  const validParentOptions = useMemo(() => {
    // For siblings: only show the parents of the reference sibling
    if (memberType === 'sibling' && relatedMember) {
      const siblingParents: FamilyMemberWithRelations[] = [];
      if (relatedMember.parentId) {
        const parent = existingMembers.find(m => m.id === relatedMember.parentId);
        if (parent) siblingParents.push(parent);
      }
      if (relatedMember.secondParentId) {
        const parent = existingMembers.find(m => m.id === relatedMember.secondParentId);
        if (parent) siblingParents.push(parent);
      }
      // If sibling has no parents, show spouses of reference (they could be step-siblings)
      if (siblingParents.length === 0) {
        return getValidParentOptions(undefined, existingMembers);
      }
      return siblingParents;
    }

    return getValidParentOptions(undefined, existingMembers);
  }, [existingMembers, memberType, relatedMember]);

  // Get valid second parent options (exclude first parent and spouses for half-siblings)
  const validSecondParentOptions = useMemo(() => {
    if (!parentId) return [];

    let options = validParentOptions.filter(m => m.id !== parentId);

    // For half-siblings, exclude existing spouses of first parent
    if (isHalfSibling) {
      const existingSpouseIds = getSpousesOf(parentId, existingMembers).map(s => s.id);
      options = options.filter(m => !existingSpouseIds.includes(m.id));
    }

    // Sort: same generation first, then existing spouses
    const firstParent = existingMembers.find(m => m.id === parentId);
    if (firstParent) {
      options.sort((a, b) => {
        const aGen = a.generation === firstParent.generation ? 0 : 1;
        const bGen = b.generation === firstParent.generation ? 0 : 1;
        if (aGen !== bGen) return aGen - bGen;

        const aSpouse = areSpouses(parentId, a.id, existingMembers) ? 0 : 1;
        const bSpouse = areSpouses(parentId, b.id, existingMembers) ? 0 : 1;
        return aSpouse - bSpouse;
      });
    }

    return options;
  }, [parentId, validParentOptions, isHalfSibling, existingMembers]);

  // Auto-set parents when sibling is selected (separate from generation calc to avoid loops)
  useEffect(() => {
    if (memberType !== 'sibling' || !relatedMember) return;

    // Only set once when sibling is first selected
    if (relatedMember.parentId) {
      setValue('parentId', relatedMember.parentId);
    }
    if (relatedMember.secondParentId && !isHalfSibling) {
      setValue('secondParentId', relatedMember.secondParentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberType, relatedMember?.id, isHalfSibling]);

  // Calculate generation based on member type and related member
  useEffect(() => {
    if (!memberType) {
      if (existingMembers.length === 0) {
        setValue('generation', 0);
      }
      return;
    }

    // First member in the tree
    if (!relatedMember && existingMembers.length === 0) {
      setValue('generation', 0);
      return;
    }

    // If no related member selected but there are members, don't auto-set generation
    if (!relatedMember) return;

    switch (memberType) {
      case 'ancestor':
        setValue('generation', relatedMember.generation - 1);
        break;
      case 'descendant':
        setValue('generation', relatedMember.generation + 1);
        break;
      case 'sibling':
      case 'spouse':
        setValue('generation', relatedMember.generation);
        break;
    }
  }, [memberType, relatedMember, existingMembers.length, setValue]);

  const birthYear = watch('birthYear');
  const generation = watch('generation');

  // Run validations
  useEffect(() => {
    const gen = generation ?? 0;
    const { errors, warnings } = runAllValidations(
      undefined,
      parentId,
      secondParentId,
      gen,
      existingMembers,
      isHalfSibling,
      birthYear,
      memberType,
      relatedToId
    );
    setValidationErrors(errors);
    setValidationWarnings(warnings);
  }, [parentId, secondParentId, existingMembers, isHalfSibling, birthYear, memberType, relatedToId, generation]);

  // Clear second parent if first parent is cleared
  useEffect(() => {
    if (!parentId) {
      setValue('secondParentId', undefined);
    }
  }, [parentId, setValue]);

  // Reset form when dialog closes or member type changes
  const resetForm = () => {
    reset();
    setMemberType(undefined);
    setRelatedToId(undefined);
    setValidationErrors([]);
    setValidationWarnings([]);
    setPhotoUrl(undefined);
    setIsHalfSibling(false);
  };

  const onSubmit = async (data: CreateMemberInput) => {
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }

    setIsLoading(true);

    try {
      // Calculate relationship based on member type and gender
      const calculatedRelationship = memberType
        ? calculateRelationship(memberType, gender, 1, isHalfSibling)
        : 'other';

      const memberData = {
        ...data,
        relationship: calculatedRelationship,
        photoUrl: photoUrl ?? undefined,
      };

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
        children: [],
        files: [],
      };

      addMember(newMember);

      // If adding an ancestor, update the related member's parentId
      if (memberType === 'ancestor' && relatedToId) {
        const relatedMemberData = existingMembers.find(m => m.id === relatedToId);
        if (relatedMemberData) {
          const updateData: { parentId?: string; secondParentId?: string } = {};

          if (!relatedMemberData.parentId) {
            updateData.parentId = newMember.id;
          } else if (!relatedMemberData.secondParentId) {
            updateData.secondParentId = newMember.id;
          } else {
            toast.warning(`${relatedMemberData.firstName} already has two parents.`);
            toast.success('Family member added successfully');
            onOpenChange(false);
            resetForm();
            return;
          }

          const updateResponse = await apiWithAuth<FamilyMember>(
            `/members/${relatedToId}`,
            accessToken,
            { method: 'PUT', body: updateData }
          );

          if (updateResponse.success) {
            updateMember(relatedToId, {
              ...relatedMemberData,
              ...updateResponse.data,
            });
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <div key={memberType ?? 'select'}>
          <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
            <DialogDescription>
              {!memberType
                ? 'Select what type of family member you want to add.'
                : `Adding a ${MEMBER_TYPE_OPTIONS.find(o => o.value === memberType)?.label.toLowerCase()}.`
              }
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Select member type */}
          {!memberType && (
          <div className="grid grid-cols-2 gap-3 py-4">
            {MEMBER_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMemberType(option.value)}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-muted hover:border-primary hover:bg-accent transition-colors"
              >
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  {option.icon}
                </div>
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground text-center">{option.description}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Form */}
        {memberType && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Step 2: Select related member (if needed) */}
            {existingMembers.length > 0 ? (
              <div className="space-y-2">
                <Label>
                  {memberType === 'ancestor' && 'Parent of whom?'}
                  {memberType === 'sibling' && 'Sibling of whom?'}
                  {memberType === 'spouse' && 'Partner of whom?'}
                  {memberType === 'descendant' && 'Child of whom?'}
                </Label>
                <Select
                  value={relatedToId ?? '__none__'}
                  onValueChange={(value) => {
                    const newRelatedId = value === '__none__' ? undefined : value;
                    setRelatedToId(newRelatedId);
                    // For descendants, auto-set first parent
                    if (memberType === 'descendant' && newRelatedId) {
                      setValue('parentId', newRelatedId);
                      // If the selected member has a spouse, auto-set as second parent
                      const spouses = getSpousesOf(newRelatedId, existingMembers);
                      const firstSpouse = spouses[0];
                      if (spouses.length === 1 && firstSpouse) {
                        setValue('secondParentId', firstSpouse.id);
                      } else {
                        setValue('secondParentId', undefined);
                      }
                    }
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a family member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (start tree)</SelectItem>
                    {existingMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {getMemberDisplayInfo(m, existingMembers)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {memberType === 'descendant' && relatedToId && (
                  <p className="text-xs text-muted-foreground">
                    This person will be added as a child of the selected member.
                  </p>
                )}
              </div>
            ) : null}

            {/* Half-sibling toggle */}
            {memberType === 'sibling' && relatedToId ? (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isHalfSibling"
                  checked={isHalfSibling}
                  onChange={(e) => {
                    setIsHalfSibling(e.target.checked);
                    if (e.target.checked) {
                      setValue('secondParentId', undefined);
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isHalfSibling" className="text-sm font-normal cursor-pointer">
                  Is a half-sibling (shares only one parent)
                </Label>
              </div>
            ) : null}

            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" {...register('firstName')} disabled={isLoading} />
                {errors.firstName ? <p className="text-sm text-destructive">{errors.firstName.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" {...register('lastName')} disabled={isLoading} />
                {errors.lastName ? <p className="text-sm text-destructive">{errors.lastName.message}</p> : null}
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
                <Label>Birth Year</Label>
                <DatePicker
                  value={watch('birthYear')}
                  onChange={(year) => setValue('birthYear', year ?? 0)}
                  placeholder="Select year"
                  disabled={isLoading}
                />
                {errors.birthYear ? <p className="text-sm text-destructive">{errors.birthYear.message}</p> : null}
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

            {/* Parents selection for descendants and siblings */}
            {(memberType === 'descendant' || memberType === 'sibling') && existingMembers.length > 0 ? (
              <div className="space-y-4 p-3 bg-muted/50 rounded-lg">
                <Label className="text-sm font-medium">Parents</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">First Parent</Label>
                    <Select
                      value={parentId ?? '__none__'}
                      onValueChange={(value) => {
                        setValue('parentId', value === '__none__' ? undefined : value);
                        // If selecting a different parent for descendant, update relatedToId
                        if (memberType === 'descendant' && value !== '__none__') {
                          setRelatedToId(value);
                          // Auto-set spouse if only one
                          const spouses = getSpousesOf(value, existingMembers);
                          const firstSpouse = spouses[0];
                          if (spouses.length === 1 && firstSpouse) {
                            setValue('secondParentId', firstSpouse.id);
                          } else {
                            setValue('secondParentId', undefined);
                          }
                        }
                      }}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {validParentOptions.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.firstName} {m.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      {isHalfSibling ? 'Other Parent (different)' : 'Second Parent (optional)'}
                    </Label>
                    <Select
                      value={secondParentId ?? '__none__'}
                      onValueChange={(value) => setValue('secondParentId', value === '__none__' ? undefined : value)}
                      disabled={isLoading || !parentId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={parentId ? 'Select' : 'Select first parent first'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {validSecondParentOptions.map((m) => {
                          const isExistingSpouse = parentId ? areSpouses(parentId, m.id, existingMembers) : false;
                          return (
                            <SelectItem key={m.id} value={m.id}>
                              {m.firstName} {m.lastName}
                              {isExistingSpouse ? ' ✓ spouse' : ''}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Validation Errors */}
            {validationErrors.length > 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {validationErrors.map((error, i) => (
                    <p key={i}>{error}</p>
                  ))}
                </AlertDescription>
              </Alert>
            ) : null}

            {/* Validation Warnings */}
            {validationWarnings.length > 0 && validationErrors.length === 0 ? (
              <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  {validationWarnings.map((warning, i) => (
                    <p key={i} className="text-sm">{warning}</p>
                  ))}
                </AlertDescription>
              </Alert>
            ) : null}

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

            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={() => setMemberType(undefined)} disabled={isLoading}>
                Back
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || validationErrors.length > 0}>
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
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
