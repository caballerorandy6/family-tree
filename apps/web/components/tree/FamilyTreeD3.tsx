'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { CustomNodeElementProps, TreeNodeDatum } from 'react-d3-tree';
import type { FamilyMemberWithRelations } from '@familytree/types/member.types';
import type { FamilyTree } from '@familytree/types/tree.types';
import { useTreeStore } from '@/stores/treeStore';
import { transformToTreeData, findMemberById, type FamilyNodeData } from '@/lib/treeD3Transform';
import { AddMemberDialog } from './AddMemberDialog';
import { MemberDetailDialog } from './MemberDetailDialog';
import { Button } from '@/components/ui/button';
import { UserPlus, Users, ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';

const Tree = dynamic(() => import('react-d3-tree').then(mod => mod.default), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        <span className="text-sm font-medium text-muted-foreground">Loading family tree...</span>
      </div>
    </div>
  ),
});

interface FamilyTreeD3Props {
  tree: FamilyTree;
  initialMembers: FamilyMemberWithRelations[];
  accessToken: string;
}

// Color palette for genders
function getGenderColors(gender?: string) {
  if (gender === 'male') {
    return { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' };
  }
  if (gender === 'female') {
    return { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' };
  }
  return { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6' };
}

// Card dimensions for individual nodes
const CARD = {
  width: 200,
  height: 180,
  avatarSize: 60,
  borderRadius: 16,
  nameFontSize: 16,
  lastNameFontSize: 14,
  lifespanFontSize: 12,
  initialsFontSize: 20,
};

function renderCustomNode(
  { nodeDatum }: CustomNodeElementProps,
  members: FamilyMemberWithRelations[],
  onMemberClick: (member: FamilyMemberWithRelations) => void
) {
  const data = nodeDatum as unknown as FamilyNodeData;
  const attrs = data.attributes;

  if (!attrs) return null;

  // Virtual root node
  if (attrs.id === 'root') {
    return (
      <g>
        <circle r={6} fill="#a0aec0" stroke="#64748b" strokeWidth={2} />
      </g>
    );
  }

  const member = findMemberById(attrs.id, members);
  const colors = getGenderColors(attrs.gender);

  const lifespan = attrs.deathYear
    ? `${attrs.birthYear} – ${attrs.deathYear}`
    : `b. ${attrs.birthYear}`;

  const isDeceased = !!attrs.deathYear;
  const hasSpouse = !!attrs.spouseId;

  const { width, height, avatarSize, borderRadius, nameFontSize, lastNameFontSize, lifespanFontSize, initialsFontSize } = CARD;
  const cardX = -width / 2;
  const cardY = -height / 2;

  const shadowId = `shadow-${attrs.id}`;

  return (
    <g className="tree-node-group">
      {/* Shadow filter */}
      <defs>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="#000" floodOpacity="0.1" />
        </filter>
      </defs>

      {/* Card with shadow */}
      <g filter={`url(#${shadowId})`}>
        <rect
          x={cardX}
          y={cardY}
          width={width}
          height={height}
          rx={borderRadius}
          fill="white"
          stroke={colors.border}
          strokeWidth={2}
        />
      </g>

      {/* Clickable area */}
      <g
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          e.stopPropagation();
          if (member) onMemberClick(member);
        }}
        className="member-node"
      >
        {/* Avatar */}
        {member?.photoUrl ? (
          <foreignObject x={-avatarSize / 2} y={cardY + 16} width={avatarSize} height={avatarSize}>
            <div
              className="rounded-full overflow-hidden"
              style={{
                width: avatarSize,
                height: avatarSize,
                border: `3px solid ${colors.border}`,
              }}
            >
              <Image
                src={member.photoUrl}
                alt={data.name}
                width={avatarSize}
                height={avatarSize}
                className="object-cover w-full h-full"
              />
            </div>
          </foreignObject>
        ) : (
          <g transform={`translate(0, ${cardY + 16 + avatarSize / 2})`}>
            <circle
              r={avatarSize / 2}
              fill={colors.bg}
              stroke={colors.border}
              strokeWidth={3}
            />
            <text
              y={6}
              textAnchor="middle"
              fontSize={initialsFontSize}
              fontWeight={400}
              fill={colors.text}
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              {data.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </text>
          </g>
        )}

        {/* First Name */}
        <text
          y={cardY + avatarSize + 36}
          textAnchor="middle"
          fontSize={nameFontSize}
          fontWeight={500}
          fill="#374151"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          {member?.firstName || data.name.split(' ')[0]}
        </text>

        {/* Last Name */}
        <text
          y={cardY + avatarSize + 54}
          textAnchor="middle"
          fontSize={lastNameFontSize}
          fontWeight={400}
          fill="#6b7280"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          {member?.lastName || data.name.split(' ')[1] || ''}
        </text>

        {/* Lifespan */}
        <text
          y={cardY + avatarSize + 72}
          textAnchor="middle"
          fontSize={lifespanFontSize}
          fill="#9ca3af"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          {isDeceased ? '✝ ' : ''}{lifespan}
        </text>

        {/* Spouse indicator badge */}
        {hasSpouse && (
          <g transform={`translate(${width / 2 - 8}, ${cardY + 8})`}>
            <circle r={12} fill="#fdf2f8" stroke="#f9a8d4" strokeWidth={1.5} />
            <text
              y={5}
              textAnchor="middle"
              fill="#ec4899"
              fontSize={14}
            >
              ♥
            </text>
          </g>
        )}
      </g>

      {/* Connection points */}
      <circle cy={cardY - 3} r={4} fill={colors.border} stroke="white" strokeWidth={2} />
      <circle cy={cardY + height + 3} r={4} fill="#9ca3af" stroke="white" strokeWidth={2} />
    </g>
  );
}

export function FamilyTreeD3({ tree, initialMembers, accessToken }: FamilyTreeD3Props) {
  const { members, setMembers, setCurrentTree, selectedMember, setSelectedMember } = useTreeStore();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(0.8);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentTree(tree);
    setMembers(initialMembers);
  }, [tree, initialMembers, setCurrentTree, setMembers]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const treeData = transformToTreeData(members);

  // Generate a stable key based on member IDs to force remount when structure changes
  const treeKey = members.map(m => m.id).sort().join('-') || 'empty';

  const renderNode = (props: CustomNodeElementProps) =>
    renderCustomNode(props, members, setSelectedMember);

  if (members.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #cbd5e1 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div className="relative text-center py-20 px-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-8 shadow-lg">
            <Users className="h-12 w-12 text-primary/70" />
          </div>
          <h3 className="text-3xl font-bold mb-4 text-foreground">Start Your Family Tree</h3>
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
            <p className="text-sm text-muted-foreground">in this family tree</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Zoom controls */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border rounded-xl p-1.5 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}
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
              className="h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={() => setZoom(z => Math.min(2, z + 0.1))}
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={() => setZoom(0.8)}
              title="Reset zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={() => setZoom(1)}
              title="Fit to view"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          <Button onClick={() => setAddDialogOpen(true)} size="lg" className="shadow-md hover:shadow-lg transition-shadow">
            <UserPlus className="mr-2 h-5 w-5" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Tree container */}
      <div
        ref={containerRef}
        className="tree-container relative h-[700px] rounded-2xl border shadow-lg overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 50%, #f8fafc 100%)',
        }}
      >
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}
        />

        {treeData && dimensions.width > 0 && (
          <Tree
            key={treeKey}
            data={treeData as TreeNodeDatum}
            renderCustomNodeElement={renderNode}
            orientation="vertical"
            pathFunc="step"
            translate={{
              x: dimensions.width / 2,
              y: 120,
            }}
            zoom={zoom}
            onUpdate={({ zoom: newZoom }) => setZoom(newZoom)}
            separation={{ siblings: 1.2, nonSiblings: 1.5 }}
            nodeSize={{ x: 280, y: 240 }}
            pathClassFunc={() => 'tree-link'}
            transitionDuration={0}
            collapsible={false}
            zoomable
            draggable
          />
        )}
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
            <span className="text-slate-400 text-sm">✝</span>
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
