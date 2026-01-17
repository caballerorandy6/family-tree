import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { FamilyMemberWithRelations } from '@familytree/types/member.types';
import type { FamilyMemberNodeData } from '@/components/tree/FamilyMemberNode';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 120;

// Half-sibling relationship types
const HALF_SIBLING_TYPES = ['half-brother', 'half-sister'] as const;

function isHalfSibling(member: FamilyMemberWithRelations): boolean {
  return HALF_SIBLING_TYPES.includes(member.relationship as typeof HALF_SIBLING_TYPES[number]);
}

export function createNodesAndEdges(
  members: FamilyMemberWithRelations[],
  onSelectMember: (member: FamilyMemberWithRelations) => void
): { nodes: Node<FamilyMemberNodeData>[]; edges: Edge[] } {
  if (members.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Create dagre graph
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure graph layout
  dagreGraph.setGraph({
    rankdir: 'TB', // Top to bottom (vertical timeline)
    nodesep: 80,   // Horizontal separation between nodes
    ranksep: 150,  // Vertical separation between ranks (generations)
    marginx: 50,
    marginy: 50,
  });

  // Add nodes to dagre graph
  for (const member of members) {
    dagreGraph.setNode(member.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  // Track spouse pairs to add constraints
  const spousePairs = new Map<string, [string, string]>();

  // Create a set of member IDs for fast lookup
  const memberIds = new Set(members.map(m => m.id));

  // Add edges for parent-child relationships (only if both nodes exist)
  for (const member of members) {
    if (member.parentId && memberIds.has(member.parentId)) {
      dagreGraph.setEdge(member.parentId, member.id);
    }
    // For half-siblings, only add edge to shared parent (parentId), not secondParentId
    if (member.secondParentId && memberIds.has(member.secondParentId) && !isHalfSibling(member)) {
      dagreGraph.setEdge(member.secondParentId, member.id);
    }

    // Track spouse pairs (parents who share children)
    // Skip half-siblings - their parents might not be spouses in the traditional sense
    if (member.parentId && member.secondParentId &&
        memberIds.has(member.parentId) && memberIds.has(member.secondParentId) &&
        !isHalfSibling(member)) {
      const key = [member.parentId, member.secondParentId].sort().join('-');
      if (!spousePairs.has(key)) {
        spousePairs.set(key, [member.parentId, member.secondParentId]);
      }
    }
  }

  // Run dagre layout algorithm
  dagre.layout(dagreGraph);

  // Create ReactFlow nodes from dagre positions
  const nodes: Node<FamilyMemberNodeData>[] = members.map((member) => {
    const nodeWithPosition = dagreGraph.node(member.id);

    return {
      id: member.id,
      type: 'familyMember',
      position: {
        // Dagre gives center position, ReactFlow needs top-left
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
      data: {
        member,
        onSelect: onSelectMember,
      },
    };
  });

  // Create edges
  const edges: Edge[] = [];

  // Parent-child edges - only create if both nodes exist
  for (const member of members) {
    if (member.parentId && memberIds.has(member.parentId)) {
      edges.push({
        id: `edge-parent-${member.parentId}-to-${member.id}`,
        source: member.parentId,
        target: member.id,
        sourceHandle: 'bottom',
        targetHandle: 'top',
        type: 'smoothstep',
        animated: false,
        zIndex: 1000,
        style: { stroke: '#64748b', strokeWidth: 2 },
      });
    }

    // For half-siblings, only show connection to the shared parent (parentId)
    // Skip drawing edge to secondParentId to make the half-sibling relationship clearer
    if (member.secondParentId && memberIds.has(member.secondParentId) && !isHalfSibling(member)) {
      edges.push({
        id: `edge-parent-${member.secondParentId}-to-${member.id}`,
        source: member.secondParentId,
        target: member.id,
        sourceHandle: 'bottom',
        targetHandle: 'top',
        type: 'smoothstep',
        animated: false,
        zIndex: 1000,
        style: { stroke: '#64748b', strokeWidth: 2 },
      });
    }
  }

  // Spouse edges (horizontal connection between partners)
  for (const [key, [spouse1Id, spouse2Id]] of spousePairs) {
    // Only create spouse edge if both spouses exist as nodes
    if (!memberIds.has(spouse1Id) || !memberIds.has(spouse2Id)) continue;

    const spouse1Node = nodes.find(n => n.id === spouse1Id);
    const spouse2Node = nodes.find(n => n.id === spouse2Id);

    if (spouse1Node && spouse2Node) {
      // Determine left/right based on position
      const leftSpouse = spouse1Node.position.x < spouse2Node.position.x ? spouse1Id : spouse2Id;
      const rightSpouse = spouse1Node.position.x < spouse2Node.position.x ? spouse2Id : spouse1Id;

      edges.push({
        id: `edge-spouse-${key}`,
        source: leftSpouse,
        target: rightSpouse,
        sourceHandle: 'right-source',
        targetHandle: 'left-target',
        type: 'straight',
        animated: false,
        zIndex: 1000,
        style: {
          stroke: '#ec4899',
          strokeWidth: 2,
          strokeDasharray: '6,4',
        },
      });
    }
  }

  return { nodes, edges };
}
