'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { updateMemberSchema, type UpdateMemberInput } from '@familytree/validations/member.schema';
import type { FamilyMemberWithRelations, FamilyMember } from '@familytree/types/member.types';
import { apiWithAuth } from '@/lib/api';
import { useTreeStore } from '@/stores/treeStore';
import {
  runAllValidations,
  getValidParentOptions,
  getMemberDisplayInfo,
  areSpouses,
  getSpousesOf,
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
import { Loader2, AlertTriangle, AlertCircle } from 'lucide-react';

const RELATIONSHIP_OPTIONS = [
  // Great-great-grandparents (tatarabuelos)
  'great-great-grandfather', 'great-great-grandmother',
  // Great-grandparents (bisabuelos)
  'great-grandfather', 'great-grandmother',
  // Grandparents (abuelos)
  'grandfather', 'grandmother',
  // Parents (padres)
  'father', 'mother',
  // Siblings (hermanos)
  'brother', 'sister', 'half-brother', 'half-sister',
  // Spouse (cónyuge)
  'spouse',
  // Children (hijos)
  'son', 'daughter', 'stepson', 'stepdaughter',
  // Grandchildren (nietos)
  'grandson', 'granddaughter',
  // Great-grandchildren (bisnietos)
  'great-grandson', 'great-granddaughter',
  // Great-great-grandchildren (tataranietos)
  'great-great-grandson', 'great-great-granddaughter',
  // Extended family
  'uncle', 'aunt', 'nephew', 'niece', 'cousin',
  // Other
  'other',
] as const;

const GENDER_OPTIONS = ['male', 'female', 'other'] as const;

// Relationships that are half-siblings
const HALF_SIBLING_RELATIONSHIPS = ['half-brother', 'half-sister'] as const;

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
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(member.photoUrl ?? undefined);
  const [selectedSpouseId, setSelectedSpouseId] = useState<string | undefined>(member.spouseId ?? undefined);
  const { updateMember, setSelectedMember } = useTreeStore();

  // Sync photoUrl and spouseId when member changes
  useEffect(() => {
    setPhotoUrl(member.photoUrl ?? undefined);
    setSelectedSpouseId(member.spouseId ?? undefined);
  }, [member.photoUrl, member.spouseId]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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
      relationship: member.relationship as typeof RELATIONSHIP_OPTIONS[number],
      gender: member.gender as typeof GENDER_OPTIONS[number] | undefined,
      generation: member.generation,
      parentId: member.parentId ?? undefined,
      secondParentId: member.secondParentId ?? undefined,
    },
  });

  const relationship = watch('relationship');
  const gender = watch('gender');
  const parentId = watch('parentId');
  const secondParentId = watch('secondParentId');
  const generation = watch('generation');

  // Check if this is a half-sibling
  const isHalfSibling = HALF_SIBLING_RELATIONSHIPS.includes(
    relationship as typeof HALF_SIBLING_RELATIONSHIPS[number]
  );

  // Get valid parent options (filtered to prevent circular relationships)
  const validParentOptions = getValidParentOptions(member.id, existingMembers);

  // Get valid second parent options (exclude first parent and spouses for half-siblings)
  const validSecondParentOptions = (() => {
    if (!parentId) return validParentOptions;

    let options = validParentOptions.filter(m => m.id !== parentId);

    // For half-siblings, exclude existing spouses of first parent
    // (if they have children together, this person would be a full sibling, not half)
    if (isHalfSibling) {
      const existingSpouseIds = getSpousesOf(parentId, existingMembers).map(s => s.id);
      options = options.filter(m => !existingSpouseIds.includes(m.id));
    }

    return options;
  })();

  const birthYear = watch('birthYear');

  // Get potential spouses (exclude self, parents, children)
  const potentialSpouses = existingMembers.filter(m => {
    if (m.id === member.id) return false; // Exclude self
    if (m.id === parentId || m.id === secondParentId) return false; // Exclude parents
    if (m.parentId === member.id || m.secondParentId === member.id) return false; // Exclude children
    return true;
  });

  // Run validations when parents or birth year change
  useEffect(() => {
    const { errors, warnings } = runAllValidations(
      member.id,
      parentId ?? undefined,
      secondParentId ?? undefined,
      generation ?? member.generation,
      existingMembers,
      isHalfSibling,
      birthYear
    );
    setValidationErrors(errors);
    setValidationWarnings(warnings);
  }, [member.id, parentId, secondParentId, generation, existingMembers, isHalfSibling, member.generation, birthYear]);

  // Clear second parent if first parent is cleared
  useEffect(() => {
    if (!parentId && secondParentId) {
      setValue('secondParentId', undefined);
    }
  }, [parentId, secondParentId, setValue]);

  const onSubmit = async (data: UpdateMemberInput) => {
    // Check for validation errors before submitting
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }

    setIsLoading(true);

    try {
      const oldSpouseId = member.spouseId;
      const newSpouseId = selectedSpouseId;

      // Update the member with the new data including spouse
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
      // 1. If old spouse exists and is different from new spouse, remove this member as their spouse
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

      // 2. If new spouse exists, set this member as their spouse
      if (newSpouseId) {
        const newSpouse = existingMembers.find(m => m.id === newSpouseId);
        if (newSpouse && newSpouse.spouseId !== member.id) {
          // First clear the new spouse's old spouse if exists
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

          // Now set this member as their spouse
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
          <DialogDescription>Update the information for {member.firstName} {member.lastName}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          <PhotoUpload
            treeId={treeId}
            accessToken={accessToken}
            value={photoUrl}
            onChange={setPhotoUrl}
            disabled={isLoading}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Birth Year</Label>
              <DatePicker
                value={watch('birthYear')}
                onChange={(year) => setValue('birthYear', year ?? 0)}
                placeholder="Select birth year"
                disabled={isLoading}
              />
              {errors.birthYear ? <p className="text-sm text-destructive">{errors.birthYear.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label>Death Year (optional)</Label>
              <DatePicker
                value={watch('deathYear') ?? undefined}
                onChange={(year) => setValue('deathYear', year)}
                placeholder="Select death year"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Select
                value={relationship}
                onValueChange={(value) => setValue('relationship', value as typeof RELATIONSHIP_OPTIONS[number])}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_OPTIONS.map((rel) => (
                    <SelectItem key={rel} value={rel} className="capitalize">
                      {rel.replace(/-/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                  {GENDER_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g} className="capitalize">
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Spouse Selector */}
          <div className="space-y-2">
            <Label>Spouse / Partner</Label>
            <Select
              value={selectedSpouseId ?? '__none__'}
              onValueChange={(value) => setSelectedSpouseId(value === '__none__' ? undefined : value)}
              disabled={isLoading}
            >
              <SelectTrigger>
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

          {validParentOptions.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Parent</Label>
                  <Select
                    value={parentId ?? '__none__'}
                    onValueChange={(value) => setValue('parentId', value === '__none__' ? undefined : value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {validParentOptions.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {getMemberDisplayInfo(m, existingMembers)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Second Parent</Label>
                  <Select
                    value={secondParentId ?? '__none__'}
                    onValueChange={(value) => setValue('secondParentId', value === '__none__' ? undefined : value)}
                    disabled={isLoading || !parentId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={parentId ? 'Select parent' : 'Select first parent first'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {validSecondParentOptions.map((m) => {
                        const isExistingSpouse = parentId ? areSpouses(parentId, m.id, existingMembers) : false;
                        const firstParent = parentId ? existingMembers.find(p => p.id === parentId) : null;
                        const isSameGen = firstParent ? firstParent.generation === m.generation : true;
                        return (
                          <SelectItem key={m.id} value={m.id}>
                            {getMemberDisplayInfo(m, existingMembers)}
                            {isExistingSpouse ? ' ✓' : ''}
                            {!isSameGen ? ' ⚠️ diff gen' : ''}
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

          <div className="space-y-2">
            <Label htmlFor="generation">Generation</Label>
            <Input
              id="generation"
              type="number"
              {...register('generation', { valueAsNumber: true })}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Lower = older generation. Adjust if needed.
            </p>
          </div>

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

          <DialogFooter>
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
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
