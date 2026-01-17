'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { FamilyMemberWithRelations } from '@familytree/types/member.types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface FamilyMemberNodeData extends Record<string, unknown> {
  member: FamilyMemberWithRelations;
  onSelect: (member: FamilyMemberWithRelations) => void;
}

interface FamilyMemberNodeProps {
  data: FamilyMemberNodeData;
}

function FamilyMemberNodeComponent({ data }: FamilyMemberNodeProps) {
  const { member, onSelect } = data;
  const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
  const lifespan = member.deathYear
    ? `${member.birthYear} - ${member.deathYear}`
    : `b. ${member.birthYear}`;

  return (
    <>
      {/* Top handle for receiving parent connections */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        isConnectable={false}
        style={{ background: '#6366f1', width: 10, height: 10, top: -5, border: '2px solid white' }}
      />

      {/* Left handle for receiving spouse connection */}
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        isConnectable={false}
        style={{ background: '#ec4899', width: 8, height: 8, left: -4, border: '2px solid white' }}
      />

      {/* Right handle for sending spouse connection */}
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        isConnectable={false}
        style={{ background: '#ec4899', width: 8, height: 8, right: -4, border: '2px solid white' }}
      />

      <div
        onClick={() => onSelect(member)}
        className={cn(
          'px-4 py-3 rounded-lg border-2 bg-card shadow-md cursor-pointer transition-all hover:shadow-lg hover:scale-105 min-w-[160px]',
          member.gender === 'male' && 'border-blue-400 bg-blue-50 dark:bg-blue-950/30',
          member.gender === 'female' && 'border-pink-400 bg-pink-50 dark:bg-pink-950/30',
          member.gender === 'other' && 'border-purple-400 bg-purple-50 dark:bg-purple-950/30',
          !member.gender && 'border-border'
        )}
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-background shadow">
            <AvatarImage src={member.photoUrl ?? undefined} alt={`${member.firstName} ${member.lastName}`} />
            <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
          </Avatar>
          <div className="text-left">
            <p className="font-semibold text-sm leading-tight">
              {member.firstName}
            </p>
            <p className="font-semibold text-sm leading-tight">
              {member.lastName}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{lifespan}</p>
          </div>
        </div>
        {member.occupation ? (
          <p className="text-xs text-muted-foreground mt-2 truncate max-w-[140px]">
            {member.occupation}
          </p>
        ) : null}
      </div>

      {/* Bottom handle for sending connections to children */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectable={false}
        style={{ background: '#6366f1', width: 10, height: 10, bottom: -5, border: '2px solid white' }}
      />
    </>
  );
}

export const FamilyMemberNode = memo(FamilyMemberNodeComponent);
