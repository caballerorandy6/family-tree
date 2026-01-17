'use client';

import type { FamilyMemberWithRelations } from '@familytree/types/member.types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface MemberCardProps {
  member: FamilyMemberWithRelations;
  onClick: () => void;
}

export function MemberCard({ member, onClick }: MemberCardProps) {
  const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
  const lifespan = member.deathYear
    ? `${member.birthYear} - ${member.deathYear}`
    : `${member.birthYear} - Present`;

  return (
    <Card
      className={cn(
        'w-48 cursor-pointer transition-all hover:shadow-md hover:-translate-y-1',
        member.gender === 'male' && 'border-l-4 border-l-blue-500',
        member.gender === 'female' && 'border-l-4 border-l-pink-500',
        member.gender === 'other' && 'border-l-4 border-l-purple-500'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 text-center">
        <Avatar className="h-16 w-16 mx-auto mb-3">
          <AvatarImage src={member.photoUrl ?? undefined} alt={`${member.firstName} ${member.lastName}`} />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <h4 className="font-semibold truncate">
          {member.firstName} {member.lastName}
        </h4>
        <p className="text-xs text-muted-foreground capitalize">{member.relationship}</p>
        <p className="text-xs text-muted-foreground">{lifespan}</p>
        {member.occupation ? (
          <p className="text-xs text-muted-foreground truncate mt-1">{member.occupation}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
