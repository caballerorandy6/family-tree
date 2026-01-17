'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { FamilyTree } from '@familytree/types/tree.types';
import type { FamilyMemberWithRelations } from '@familytree/types/member.types';
import { useTreeStore } from '@/stores/treeStore';
import { createNodesAndEdges } from '@/lib/treeLayout';
import { FamilyMemberNode, type FamilyMemberNodeData } from './FamilyMemberNode';
import { AddMemberDialog } from './AddMemberDialog';
import { MemberDetailDialog } from './MemberDetailDialog';
import { Button } from '@/components/ui/button';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';
import Users from 'lucide-react/dist/esm/icons/users';

interface TreeViewProps {
  tree: FamilyTree;
  initialMembers: FamilyMemberWithRelations[];
  accessToken: string;
}

const nodeTypes = {
  familyMember: FamilyMemberNode,
};

export function TreeView({ tree, initialMembers, accessToken }: TreeViewProps) {
  const { members, setMembers, setCurrentTree, selectedMember, setSelectedMember } = useTreeStore();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FamilyMemberNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Initialize store with tree data
  useEffect(() => {
    setCurrentTree(tree);
    setMembers(initialMembers);
  }, [tree, initialMembers, setCurrentTree, setMembers]);

  // Callback for selecting a member
  const handleSelectMember = useCallback(
    (member: FamilyMemberWithRelations) => {
      setSelectedMember(member);
    },
    [setSelectedMember]
  );

  // Update nodes and edges when members change
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = createNodesAndEdges(members, handleSelectMember);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [members, handleSelectMember, setNodes, setEdges]);

  // Memoize node types to prevent unnecessary re-renders
  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  if (members.length === 0) {
    return (
      <div className="text-center py-12 bg-secondary/30 rounded-lg">
        <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No family members yet</h3>
        <p className="text-muted-foreground mb-4">
          Start adding members to build your family tree.
        </p>
        <Button onClick={() => setAddDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add First Member
        </Button>
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
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {members.length} member{members.length !== 1 ? 's' : ''} in this tree
        </p>
        <Button onClick={() => setAddDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      <div className="h-[700px] border rounded-lg bg-background overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={memoizedNodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
          minZoom={0.1}
          maxZoom={2}
          connectionLineType={ConnectionLineType.SmoothStep}
          defaultEdgeOptions={{
            type: 'smoothstep',
            style: { strokeWidth: 2 },
            zIndex: 1000,
          }}
          edgesFocusable={false}
          edgesReconnectable={false}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          selectNodesOnDrag={false}
        >
          <Background color="#e2e8f0" gap={20} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as FamilyMemberNodeData;
              if (data.member.gender === 'male') return '#93c5fd';
              if (data.member.gender === 'female') return '#f9a8d4';
              return '#c4b5fd';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-200 border border-blue-400" />
          <span>Male</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-pink-200 border border-pink-400" />
          <span>Female</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-purple-200 border border-purple-400" />
          <span>Other</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-slate-400" />
          <span>Parent-Child</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-pink-400" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #f472b6, #f472b6 5px, transparent 5px, transparent 10px)' }} />
          <span>Spouse</span>
        </div>
      </div>

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
