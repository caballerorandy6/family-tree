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

// Dynamically import Tree to avoid SSR issues
const Tree = dynamic(() => import('react-d3-tree').then(mod => mod.default), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Loading tree...</span>
      </div>
    </div>
  ),
});

interface FamilyTreeD3Props {
  tree: FamilyTree;
  initialMembers: FamilyMemberWithRelations[];
  accessToken: string;
}

// Enhanced color palette for genders
function getGenderColors(gender?: string) {
  if (gender === 'male') {
    return {
      bg: '#dbeafe',
      bgGradientFrom: '#eff6ff',
      bgGradientTo: '#dbeafe',
      border: '#3b82f6',
      borderLight: '#93c5fd',
      text: '#1e40af',
      accent: '#2563eb',
    };
  }
  if (gender === 'female') {
    return {
      bg: '#fce7f3',
      bgGradientFrom: '#fdf2f8',
      bgGradientTo: '#fce7f3',
      border: '#ec4899',
      borderLight: '#f9a8d4',
      text: '#9d174d',
      accent: '#db2777',
    };
  }
  return {
    bg: '#ede9fe',
    bgGradientFrom: '#f5f3ff',
    bgGradientTo: '#ede9fe',
    border: '#8b5cf6',
    borderLight: '#c4b5fd',
    text: '#5b21b6',
    accent: '#7c3aed',
  };
}

// Custom node component with enhanced styling
function renderCustomNode(
  { nodeDatum }: CustomNodeElementProps,
  members: FamilyMemberWithRelations[],
  onMemberClick: (member: FamilyMemberWithRelations) => void
) {
  const data = nodeDatum as unknown as FamilyNodeData;
  const attrs = data.attributes;

  if (!attrs) return null;

  const isVirtualRoot = attrs.id === 'root';

  // Render virtual root as subtle connector
  if (isVirtualRoot) {
    return (
      <g>
        <circle r={6} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={2} />
      </g>
    );
  }

  // Get primary member and colors
  const member = findMemberById(attrs.id, members);
  const colors = getGenderColors(attrs.gender);

  const lifespan = attrs.deathYear
    ? `${attrs.birthYear} - ${attrs.deathYear}`
    : `b. ${attrs.birthYear}`;

  const isDeceased = !!attrs.deathYear;

  // Spouses: separate attached (no parents in tree) and elsewhere (has parents in tree)
  const allSpouses = attrs.spouses || [];
  const attachedSpouses = allSpouses.filter(s => !s.appearsElsewhere);
  const elsewhereSpouses = allSpouses.filter(s => s.appearsElsewhere);

  // Check if we have at least one attached spouse to display
  const hasAttachedSpouse = attachedSpouses.length > 0;
  const firstSpouse = attachedSpouses[0];

  // Get first spouse's colors if exists
  const firstSpouseColors = firstSpouse ? getGenderColors(firstSpouse.gender) : null;
  const firstSpouseMember = firstSpouse ? findMemberById(firstSpouse.id, members) : null;

  // Calculate card dimensions
  const singleWidth = 150;
  const coupleWidth = 280;
  const cardWidth = hasAttachedSpouse ? coupleWidth : singleWidth;
  const cardHeight = 110;
  const cardX = -cardWidth / 2;
  const cardY = -cardHeight / 2;

  // Unique gradient IDs
  const gradientId = `gradient-${attrs.id}`;
  const spouseGradientId = firstSpouse ? `gradient-spouse-${firstSpouse.id}` : '';

  return (
    <g className="tree-node">
      {/* Gradient definitions */}
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colors.bgGradientFrom} />
          <stop offset="100%" stopColor={colors.bgGradientTo} />
        </linearGradient>
        {firstSpouseColors && (
          <linearGradient id={spouseGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={firstSpouseColors.bgGradientFrom} />
            <stop offset="100%" stopColor={firstSpouseColors.bgGradientTo} />
          </linearGradient>
        )}
        <filter id="card-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.15" />
        </filter>
        <filter id="card-shadow-hover" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* Main card container */}
      <g filter="url(#card-shadow)">
        {/* Card background */}
        <rect
          x={cardX}
          y={cardY}
          width={cardWidth}
          height={cardHeight}
          rx={16}
          fill="white"
          stroke="#e2e8f0"
          strokeWidth={1}
        />

        {/* Decorative top border gradient */}
        <rect
          x={cardX}
          y={cardY}
          width={cardWidth}
          height={4}
          rx={16}
          fill={colors.border}
        />
        <rect
          x={cardX}
          y={cardY + 4}
          width={cardWidth}
          height={12}
          fill="white"
        />
      </g>

      {/* Primary member section */}
      <g
        transform={hasAttachedSpouse ? `translate(${cardX + 75}, 0)` : 'translate(0, 0)'}
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          e.stopPropagation();
          if (member) onMemberClick(member);
        }}
      >
        {/* Avatar circle with gradient background */}
        {member?.photoUrl ? (
          <foreignObject x={-28} y={-45} width={56} height={56}>
            <div
              className="w-14 h-14 rounded-full overflow-hidden border-3 cursor-pointer hover:scale-105 transition-transform duration-200 shadow-md"
              style={{
                borderColor: colors.border,
                boxShadow: `0 0 0 3px ${colors.bgGradientFrom}`
              }}
            >
              <Image
                src={member.photoUrl}
                alt={data.name}
                width={56}
                height={56}
                className="object-cover w-full h-full"
              />
            </div>
          </foreignObject>
        ) : (
          <g>
            {/* Outer glow ring */}
            <circle
              cy={-17}
              r={30}
              fill={colors.bgGradientFrom}
              opacity={0.5}
            />
            {/* Main avatar circle */}
            <circle
              cy={-17}
              r={26}
              fill={`url(#${gradientId})`}
              stroke={colors.border}
              strokeWidth={3}
              className="transition-all duration-200"
            />
            {/* Initials */}
            <text
              y={-11}
              textAnchor="middle"
              fontSize={14}
              fontWeight={700}
              fill={colors.text}
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              {data.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </text>
          </g>
        )}

        {/* Name with better typography */}
        <text
          y={22}
          textAnchor="middle"
          fontSize={13}
          fontWeight={600}
          fill="#1e293b"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          {member?.firstName || data.name.split(' ')[0]}
        </text>

        {/* Lifespan with icon indicator */}
        <g transform="translate(0, 38)">
          {isDeceased && (
            <text
              x={-25}
              textAnchor="middle"
              fontSize={10}
              fill="#9ca3af"
            >
              ✝
            </text>
          )}
          <text
            x={isDeceased ? 5 : 0}
            textAnchor="middle"
            fontSize={11}
            fill="#64748b"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            {lifespan}
          </text>
        </g>
      </g>

      {/* Heart connector and spouse section */}
      {hasAttachedSpouse && firstSpouse && firstSpouseColors && (
        <>
          {/* Animated heart connector */}
          <g transform="translate(0, -10)">
            <circle cx={0} cy={0} r={14} fill="#fdf2f8" stroke="#fbcfe8" strokeWidth={1} />
            <text
              x={0}
              y={5}
              textAnchor="middle"
              fill="#ec4899"
              fontSize={14}
              className="animate-pulse"
            >
              ♥
            </text>
          </g>

          {/* Spouse section */}
          <g
            transform={`translate(${cardX + coupleWidth - 75}, 0)`}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              if (firstSpouseMember) onMemberClick(firstSpouseMember);
            }}
          >
            {/* Spouse avatar */}
            {firstSpouse.photoUrl ? (
              <foreignObject x={-28} y={-45} width={56} height={56}>
                <div
                  className="w-14 h-14 rounded-full overflow-hidden border-3 cursor-pointer hover:scale-105 transition-transform duration-200 shadow-md"
                  style={{
                    borderColor: firstSpouseColors.border,
                    boxShadow: `0 0 0 3px ${firstSpouseColors.bgGradientFrom}`
                  }}
                >
                  <Image
                    src={firstSpouse.photoUrl}
                    alt={firstSpouse.firstName}
                    width={56}
                    height={56}
                    className="object-cover w-full h-full"
                  />
                </div>
              </foreignObject>
            ) : (
              <g>
                <circle
                  cy={-17}
                  r={30}
                  fill={firstSpouseColors.bgGradientFrom}
                  opacity={0.5}
                />
                <circle
                  cy={-17}
                  r={26}
                  fill={`url(#${spouseGradientId})`}
                  stroke={firstSpouseColors.border}
                  strokeWidth={3}
                />
                <text
                  y={-11}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight={700}
                  fill={firstSpouseColors.text}
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  {firstSpouse.firstName[0]}{firstSpouse.name.split(' ')[1]?.[0] || ''}
                </text>
              </g>
            )}

            {/* Spouse name */}
            <text
              y={22}
              textAnchor="middle"
              fontSize={13}
              fontWeight={600}
              fill="#1e293b"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              {firstSpouse.firstName}
            </text>

            {/* Spouse birth year */}
            <text
              y={38}
              textAnchor="middle"
              fontSize={11}
              fill="#64748b"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              b. {firstSpouse.birthYear}
            </text>
          </g>
        </>
      )}

      {/* Badge for additional spouses (multiple marriages) */}
      {attachedSpouses.length > 1 && (
        <g transform={`translate(${cardX + cardWidth - 20}, ${cardY + 10})`}>
          <circle r={12} fill="#fef3c7" stroke="#f59e0b" strokeWidth={2} />
          <text
            y={4}
            textAnchor="middle"
            fill="#d97706"
            fontSize={11}
            fontWeight={700}
          >
            +{attachedSpouses.length - 1}
          </text>
        </g>
      )}

      {/* Indicator for spouse that appears elsewhere in tree */}
      {elsewhereSpouses.length > 0 && !hasAttachedSpouse && (
        <g transform={`translate(${singleWidth / 2 - 5}, -20)`}>
          <rect
            x={-30}
            y={-15}
            width={60}
            height={35}
            rx={8}
            fill="#fef3c7"
            stroke="#fbbf24"
            strokeWidth={1.5}
            strokeDasharray="4,2"
          />
          <text y={0} textAnchor="middle" fill="#f59e0b" fontSize={12}>♥</text>
          <text
            y={13}
            textAnchor="middle"
            fill="#b45309"
            fontSize={9}
            fontWeight={500}
          >
            {elsewhereSpouses[0]?.firstName || 'Spouse'}
          </text>
        </g>
      )}

      {/* Connection point at top (where parent line connects) */}
      <circle
        cy={cardY - 4}
        r={5}
        fill={colors.border}
        stroke="white"
        strokeWidth={2}
      />

      {/* Connection point at bottom (where children lines connect) */}
      <circle
        cy={cardY + cardHeight + 4}
        r={5}
        fill="#94a3b8"
        stroke="white"
        strokeWidth={2}
      />
    </g>
  );
}

export function FamilyTreeD3({ tree, initialMembers, accessToken }: FamilyTreeD3Props) {
  const { members, setMembers, setCurrentTree, selectedMember, setSelectedMember } = useTreeStore();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(0.8);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize store with tree data
  useEffect(() => {
    setCurrentTree(tree);
    setMembers(initialMembers);
  }, [tree, initialMembers, setCurrentTree, setMembers]);

  // Update dimensions on mount and resize
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

  // Transform members to tree data
  const treeData = transformToTreeData(members);

  // Render custom node with closure over members and click handler
  const renderNode = (props: CustomNodeElementProps) =>
    renderCustomNode(props, members, setSelectedMember);

  // Empty state with enhanced design
  if (members.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)', backgroundSize: '24px 24px' }} />

        <div className="relative text-center py-16 px-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 mb-6">
            <Users className="h-10 w-10 text-primary/60" />
          </div>
          <h3 className="text-2xl font-semibold mb-3 text-foreground">Start Your Family Tree</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Begin documenting your family history by adding your first family member.
          </p>
          <Button size="lg" onClick={() => setAddDialogOpen(true)} className="shadow-lg hover:shadow-xl transition-shadow">
            <UserPlus className="mr-2 h-5 w-5" />
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
    <div className="space-y-4">
      {/* Enhanced toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-muted-foreground">in this tree</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-background border rounded-lg p-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium w-14 text-center text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={() => setZoom(z => Math.min(2, z + 0.1))}
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={() => setZoom(0.8)}
              title="Reset zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={() => setZoom(1)}
              title="Fit to view"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Add member button */}
          <Button onClick={() => setAddDialogOpen(true)} className="shadow-sm">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Tree container with enhanced styling */}
      <div
        ref={containerRef}
        className="tree-container relative h-[700px] rounded-2xl border shadow-inner overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 50%, #f8fafc 100%)',
        }}
      >
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}
        />

        {treeData && dimensions.width > 0 && (
          <Tree
            data={treeData as TreeNodeDatum}
            renderCustomNodeElement={renderNode}
            orientation="vertical"
            pathFunc="step"
            translate={{
              x: dimensions.width / 2,
              y: 100,
            }}
            zoom={zoom}
            onUpdate={({ zoom: newZoom }) => setZoom(newZoom)}
            separation={{ siblings: 1.8, nonSiblings: 2.2 }}
            nodeSize={{ x: 300, y: 180 }}
            pathClassFunc={() => 'tree-link'}
            enableLegacyTransitions
            transitionDuration={400}
            collapsible={false}
            zoomable
            draggable
          />
        )}
      </div>

      {/* Enhanced legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Legend</span>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-blue-500 shadow-sm" />
            <span className="text-sm text-muted-foreground">Male</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 border-2 border-pink-500 shadow-sm" />
            <span className="text-sm text-muted-foreground">Female</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 border-2 border-purple-500 shadow-sm" />
            <span className="text-sm text-muted-foreground">Other</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-50 border border-pink-200">
              <span className="text-pink-500 text-xs">♥</span>
            </div>
            <span className="text-sm text-muted-foreground">Couple</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">✝</span>
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

      {/* Enhanced tree link styles */}
      <style jsx global>{`
        .tree-link {
          stroke: #94a3b8;
          stroke-width: 2.5;
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
          transition: stroke 0.3s ease, stroke-width 0.3s ease;
        }
        .tree-link:hover {
          stroke: #64748b;
          stroke-width: 3.5;
        }
        .rd3t-tree-container {
          background: transparent !important;
        }
        .rd3t-grabbable {
          cursor: grab;
        }
        .rd3t-grabbable:active {
          cursor: grabbing;
        }
        /* Node hover animation */
        .tree-node {
          transition: transform 0.2s ease-out;
        }
        .tree-node:hover {
          transform: translateY(-2px);
        }
        /* Smooth zoom transitions */
        .rd3t-tree-container svg {
          transition: transform 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
