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

// Enhanced color palette with richer gradients and glow effects
function getGenderColors(gender?: string) {
  if (gender === 'male') {
    return {
      bgGradientFrom: '#e0f2fe',
      bgGradientTo: '#bae6fd',
      border: '#0284c7',
      borderLight: '#38bdf8',
      text: '#0c4a6e',
      accent: '#0369a1',
      glow: 'rgba(14, 165, 233, 0.3)',
    };
  }
  if (gender === 'female') {
    return {
      bgGradientFrom: '#fce7f3',
      bgGradientTo: '#fbcfe8',
      border: '#db2777',
      borderLight: '#f472b6',
      text: '#831843',
      accent: '#be185d',
      glow: 'rgba(236, 72, 153, 0.3)',
    };
  }
  return {
    bgGradientFrom: '#ede9fe',
    bgGradientTo: '#ddd6fe',
    border: '#7c3aed',
    borderLight: '#a78bfa',
    text: '#4c1d95',
    accent: '#6d28d9',
    glow: 'rgba(139, 92, 246, 0.3)',
  };
}

// Card dimensions - LARGER for better visibility
const CARD_CONFIG = {
  singleWidth: 200,
  coupleWidth: 380,
  cardHeight: 140,
  avatarSize: 72,
  avatarRadius: 36,
  borderRadius: 20,
  nameFontSize: 15,
  lifespanFontSize: 13,
  initialsFontSize: 22,
};

function renderCustomNode(
  { nodeDatum }: CustomNodeElementProps,
  members: FamilyMemberWithRelations[],
  onMemberClick: (member: FamilyMemberWithRelations) => void
) {
  const data = nodeDatum as unknown as FamilyNodeData;
  const attrs = data.attributes;

  if (!attrs) return null;

  const isVirtualRoot = attrs.id === 'root';

  if (isVirtualRoot) {
    return (
      <g>
        <circle r={8} fill="#94a3b8" stroke="#64748b" strokeWidth={2} />
      </g>
    );
  }

  const member = findMemberById(attrs.id, members);
  const colors = getGenderColors(attrs.gender);

  const lifespan = attrs.deathYear
    ? `${attrs.birthYear} – ${attrs.deathYear}`
    : `Born ${attrs.birthYear}`;

  const isDeceased = !!attrs.deathYear;

  const allSpouses = attrs.spouses || [];
  const attachedSpouses = allSpouses.filter(s => !s.appearsElsewhere);
  const elsewhereSpouses = allSpouses.filter(s => s.appearsElsewhere);

  const hasAttachedSpouse = attachedSpouses.length > 0;
  const firstSpouse = attachedSpouses[0];

  const firstSpouseColors = firstSpouse ? getGenderColors(firstSpouse.gender) : null;
  const firstSpouseMember = firstSpouse ? findMemberById(firstSpouse.id, members) : null;

  const { singleWidth, coupleWidth, cardHeight, avatarSize, borderRadius, nameFontSize, lifespanFontSize, initialsFontSize } = CARD_CONFIG;
  const cardWidth = hasAttachedSpouse ? coupleWidth : singleWidth;
  const cardX = -cardWidth / 2;
  const cardY = -cardHeight / 2;

  const gradientId = `grad-${attrs.id}`;
  const spouseGradientId = firstSpouse ? `grad-sp-${firstSpouse.id}` : '';
  const shadowId = `shadow-${attrs.id}`;

  return (
    <g className="tree-node-group">
      {/* Definitions */}
      <defs>
        {/* Main member gradient */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colors.bgGradientFrom} />
          <stop offset="100%" stopColor={colors.bgGradientTo} />
        </linearGradient>

        {/* Spouse gradient */}
        {firstSpouseColors && (
          <linearGradient id={spouseGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={firstSpouseColors.bgGradientFrom} />
            <stop offset="100%" stopColor={firstSpouseColors.bgGradientTo} />
          </linearGradient>
        )}

        {/* Card shadow with double layer */}
        <filter id={shadowId} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000" floodOpacity="0.12" />
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.08" />
        </filter>

        {/* Glow effect for avatars */}
        <filter id={`glow-${attrs.id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main card with shadow */}
      <g filter={`url(#${shadowId})`}>
        {/* Card background */}
        <rect
          x={cardX}
          y={cardY}
          width={cardWidth}
          height={cardHeight}
          rx={borderRadius}
          fill="white"
          stroke="#e2e8f0"
          strokeWidth={1.5}
        />

        {/* Top accent bar */}
        <rect
          x={cardX}
          y={cardY}
          width={cardWidth}
          height={6}
          rx={borderRadius}
          fill={colors.border}
        />
        {/* Cover the bottom corners of accent bar */}
        <rect
          x={cardX}
          y={cardY + 6}
          width={cardWidth}
          height={borderRadius}
          fill="white"
        />
      </g>

      {/* Primary member section */}
      <g
        transform={hasAttachedSpouse ? `translate(${cardX + 95}, 0)` : 'translate(0, 0)'}
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          e.stopPropagation();
          if (member) onMemberClick(member);
        }}
        className="member-node"
      >
        {/* Avatar glow ring */}
        <circle
          cy={-15}
          r={avatarSize / 2 + 8}
          fill={colors.glow}
          className="avatar-glow"
        />

        {/* Avatar */}
        {member?.photoUrl ? (
          <foreignObject x={-avatarSize / 2} y={-15 - avatarSize / 2} width={avatarSize} height={avatarSize}>
            <div
              className="rounded-full overflow-hidden transition-all duration-300 hover:scale-110"
              style={{
                width: avatarSize,
                height: avatarSize,
                border: `4px solid ${colors.border}`,
                boxShadow: `0 0 0 4px ${colors.bgGradientFrom}, 0 4px 12px rgba(0,0,0,0.15)`,
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
          <g>
            {/* Avatar background circle */}
            <circle
              cy={-15}
              r={avatarSize / 2}
              fill={`url(#${gradientId})`}
              stroke={colors.border}
              strokeWidth={4}
              className="transition-all duration-300"
            />
            {/* Initials */}
            <text
              y={-8}
              textAnchor="middle"
              fontSize={initialsFontSize}
              fontWeight={700}
              fill={colors.text}
              style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
            >
              {data.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </text>
          </g>
        )}

        {/* Name */}
        <text
          y={35}
          textAnchor="middle"
          fontSize={nameFontSize}
          fontWeight={700}
          fill="#1e293b"
          style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
        >
          {member?.firstName || data.name.split(' ')[0]}
        </text>

        {/* Last name */}
        <text
          y={52}
          textAnchor="middle"
          fontSize={nameFontSize - 2}
          fontWeight={500}
          fill="#475569"
          style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
        >
          {member?.lastName || data.name.split(' ')[1] || ''}
        </text>

        {/* Lifespan with deceased indicator */}
        <g transform="translate(0, 68)">
          {isDeceased && (
            <text
              x={-35}
              textAnchor="middle"
              fontSize={12}
              fill="#94a3b8"
            >
              ✝
            </text>
          )}
          <text
            x={isDeceased ? 5 : 0}
            textAnchor="middle"
            fontSize={lifespanFontSize}
            fill="#64748b"
            fontWeight={500}
            style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
          >
            {lifespan}
          </text>
        </g>
      </g>

      {/* Heart connector and spouse section */}
      {hasAttachedSpouse && firstSpouse && firstSpouseColors && (
        <>
          {/* Heart connector */}
          <g transform="translate(0, -8)">
            <circle cx={0} cy={0} r={18} fill="#fdf2f8" stroke="#fce7f3" strokeWidth={2} />
            <text
              x={0}
              y={6}
              textAnchor="middle"
              fill="#ec4899"
              fontSize={18}
              className="heart-icon"
            >
              ♥
            </text>
          </g>

          {/* Spouse section */}
          <g
            transform={`translate(${cardX + coupleWidth - 95}, 0)`}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              if (firstSpouseMember) onMemberClick(firstSpouseMember);
            }}
            className="member-node"
          >
            {/* Spouse avatar glow */}
            <circle
              cy={-15}
              r={avatarSize / 2 + 8}
              fill={firstSpouseColors.glow}
              className="avatar-glow"
            />

            {/* Spouse avatar */}
            {firstSpouse.photoUrl ? (
              <foreignObject x={-avatarSize / 2} y={-15 - avatarSize / 2} width={avatarSize} height={avatarSize}>
                <div
                  className="rounded-full overflow-hidden transition-all duration-300 hover:scale-110"
                  style={{
                    width: avatarSize,
                    height: avatarSize,
                    border: `4px solid ${firstSpouseColors.border}`,
                    boxShadow: `0 0 0 4px ${firstSpouseColors.bgGradientFrom}, 0 4px 12px rgba(0,0,0,0.15)`,
                  }}
                >
                  <Image
                    src={firstSpouse.photoUrl}
                    alt={firstSpouse.firstName}
                    width={avatarSize}
                    height={avatarSize}
                    className="object-cover w-full h-full"
                  />
                </div>
              </foreignObject>
            ) : (
              <g>
                <circle
                  cy={-15}
                  r={avatarSize / 2}
                  fill={`url(#${spouseGradientId})`}
                  stroke={firstSpouseColors.border}
                  strokeWidth={4}
                />
                <text
                  y={-8}
                  textAnchor="middle"
                  fontSize={initialsFontSize}
                  fontWeight={700}
                  fill={firstSpouseColors.text}
                  style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
                >
                  {firstSpouse.firstName[0]}{firstSpouse.name.split(' ')[1]?.[0] || ''}
                </text>
              </g>
            )}

            {/* Spouse name */}
            <text
              y={35}
              textAnchor="middle"
              fontSize={nameFontSize}
              fontWeight={700}
              fill="#1e293b"
              style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
            >
              {firstSpouse.firstName}
            </text>

            {/* Spouse last name */}
            <text
              y={52}
              textAnchor="middle"
              fontSize={nameFontSize - 2}
              fontWeight={500}
              fill="#475569"
              style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
            >
              {firstSpouse.name.split(' ')[1] || ''}
            </text>

            {/* Spouse birth year */}
            <text
              y={68}
              textAnchor="middle"
              fontSize={lifespanFontSize}
              fill="#64748b"
              fontWeight={500}
              style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
            >
              Born {firstSpouse.birthYear}
            </text>
          </g>
        </>
      )}

      {/* Badge for additional spouses */}
      {attachedSpouses.length > 1 && (
        <g transform={`translate(${cardX + cardWidth - 18}, ${cardY + 18})`}>
          <circle r={14} fill="#fef3c7" stroke="#f59e0b" strokeWidth={2} />
          <text
            y={5}
            textAnchor="middle"
            fill="#b45309"
            fontSize={12}
            fontWeight={700}
          >
            +{attachedSpouses.length - 1}
          </text>
        </g>
      )}

      {/* Indicator for spouse elsewhere in tree */}
      {elsewhereSpouses.length > 0 && !hasAttachedSpouse && (
        <g transform={`translate(${singleWidth / 2 + 10}, -15)`}>
          <rect
            x={-35}
            y={-18}
            width={70}
            height={40}
            rx={10}
            fill="#fef3c7"
            stroke="#fbbf24"
            strokeWidth={2}
            strokeDasharray="6,3"
          />
          <text y={2} textAnchor="middle" fill="#f59e0b" fontSize={14}>♥</text>
          <text
            y={16}
            textAnchor="middle"
            fill="#92400e"
            fontSize={10}
            fontWeight={600}
          >
            {elsewhereSpouses[0]?.firstName || 'Spouse'}
          </text>
        </g>
      )}

      {/* Connection points */}
      <circle
        cy={cardY - 6}
        r={6}
        fill={colors.border}
        stroke="white"
        strokeWidth={3}
      />
      <circle
        cy={cardY + cardHeight + 6}
        r={6}
        fill="#94a3b8"
        stroke="white"
        strokeWidth={3}
      />
    </g>
  );
}

export function FamilyTreeD3({ tree, initialMembers, accessToken }: FamilyTreeD3Props) {
  const { members, setMembers, setCurrentTree, selectedMember, setSelectedMember } = useTreeStore();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(0.7);
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

  // Transform members to tree data (React Compiler handles memoization)
  const treeData = transformToTreeData(members);

  // Render custom node
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
              onClick={() => setZoom(0.7)}
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
        className="tree-container relative h-[750px] rounded-2xl border-2 shadow-xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #f1f5f9 0%, #ffffff 30%, #ffffff 70%, #f1f5f9 100%)',
        }}
      >
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)',
            backgroundSize: '40px 40px'
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
              y: 120,
            }}
            zoom={zoom}
            onUpdate={({ zoom: newZoom }) => setZoom(newZoom)}
            separation={{ siblings: 2, nonSiblings: 2.5 }}
            nodeSize={{ x: 400, y: 220 }}
            pathClassFunc={() => 'tree-link'}
            enableLegacyTransitions
            transitionDuration={400}
            collapsible={false}
            zoomable
            draggable
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-8 p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/80 border backdrop-blur-sm">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Legend</span>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-100 to-sky-200 border-[3px] border-sky-600 shadow-sm" />
            <span className="text-sm font-medium text-muted-foreground">Male</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 border-[3px] border-pink-600 shadow-sm" />
            <span className="text-sm font-medium text-muted-foreground">Female</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-100 to-violet-200 border-[3px] border-violet-600 shadow-sm" />
            <span className="text-sm font-medium text-muted-foreground">Other</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-pink-50 border-2 border-pink-200">
              <span className="text-pink-500 text-sm">♥</span>
            </div>
            <span className="text-sm font-medium text-muted-foreground">Couple</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-slate-400 text-sm">✝</span>
            <span className="text-sm font-medium text-muted-foreground">Deceased</span>
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
