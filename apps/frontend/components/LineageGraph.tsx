'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
    MiniMap,
    useNodesState,
    useEdgesState,
    MarkerType,
    Position,
    ReactFlowProvider,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { Node as GraphNode, Edge as GraphEdge } from '@/types';
import SemanticNode from './graph/SemanticNode';
import InspectorPanel from './graph/InspectorPanel';

interface LineageGraphProps {
    nodes: GraphNode[];
    edges: GraphEdge[];
    onNodeClick?: (nodeId: string) => void;
    level: string;
    onLevelChange: (level: string) => void;
}

const nodeWidth = 220;
const nodeHeight = 100;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({
        rankdir: 'LR', // Left-to-Right for traditional lineage flow
        nodesep: 80,   // Increased node separation
        ranksep: 150,  // Increased rank separation
        edgesep: 30,   // Increased edge separation
        marginx: 50,
        marginy: 50
    });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);

        // Safety check for layout fail
        if (!nodeWithPosition) return node;

        return {
            ...node,
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};

const nodeTypes = {
    semantic: SemanticNode,
};

export default function LineageGraph({ nodes: graphNodes, edges: graphEdges, level }: LineageGraphProps) {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    // Initial Expansion: Expand all Systems by default
    useEffect(() => {
        const initialExpanded = new Set<string>();
        graphNodes.forEach(n => {
            if (n.type === 'system') initialExpanded.add(n.id);
        });
        setExpandedNodes(initialExpanded);
    }, [graphNodes]);

    const handleExpandChain = useCallback((nodeId: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    }, []);

    // Filter Visible Graph based on Expansion State
    const { layoutedNodes, layoutedEdges } = useMemo(() => {
        if (graphNodes.length === 0) return { layoutedNodes: [], layoutedEdges: [] };

        // 1. Identify Visible Nodes
        // Always show Roots (Systems or nodes with no parent)
        // Show Children only if Parent is Expanded
        const visibleNodeIds = new Set<string>();

        // Forward Pass to determine visibility
        // This is tricky for generic graph.
        // Simplification: 
        // - Roots are always visible.
        // - If edge Source is Visible AND Source is Expanded -> Target is Visible.

        // Find roots (in basic sense, systems)
        const roots = graphNodes.filter(n => n.type === 'system');
        roots.forEach(n => visibleNodeIds.add(n.id));

        // Iterative discovery? Or use edges map.
        // Let's rely on ParentID property if available, or Edges.

        // Using Edges flow:
        // We need robust traversal.
        // Let's assume 'system' nodes are roots.
        // We also check for 'asset' that are NOT in a system? 
        // graphNodes often have `parent_id`.

        // Simple logic:
        // 1. All Systems visible.
        // 2. All Nodes with parent_id: Check if parent is Expanded.

        graphNodes.forEach(node => {
            if (node.type === 'system') {
                visibleNodeIds.add(node.id);
            } else if (node.parent_id) {
                if (expandedNodes.has(node.parent_id)) {
                    visibleNodeIds.add(node.id);
                }
            } else {
                // No parent (orphan asset?) -> Show it
                visibleNodeIds.add(node.id);
            }
        });

        // Also, for Finding/Classification, usually they are children of Asset (via Edge? or ParentID?)
        // In Step 916 `lineage_service.go`, Findings have `ParentID = nodeID` (Asset).
        // So checking `parent_id` expansion covers Findings too.
        // Classification has no parent in Go service logic? 
        // Wait: `nodes = append(nodes, Node{... ID: classNodeID, ... })` 
        // It does NOT set ParentID for classification.
        // But it creates Edge: Finding -> Classification.

        // We need `Edge` based visibility for Classifications.
        // If Finding is Visible AND Expanded -> Classification is Visible.

        // Let's run a second pass for edge-based dependencies (Visual Hierarchy)
        // Repeat until stable? Or just one pass if ordered?
        // Let's do a simple recursive finder or just iterate edges.

        let changed = true;
        while (changed) {
            changed = false;
            graphEdges.forEach(edge => {
                if (visibleNodeIds.has(edge.source) && expandedNodes.has(edge.source)) {
                    if (!visibleNodeIds.has(edge.target)) {
                        visibleNodeIds.add(edge.target);
                        changed = true;
                    }
                }
            });
        }

        // 2. Filter Nodes
        const filteredNodes = graphNodes.filter(n => visibleNodeIds.has(n.id));

        // 3. Filter Edges (Both ends must be visible)
        // Exception: If Target is hidden, don't show edge.
        const visibleEdges = graphEdges.filter(e =>
            visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
        );

        // 4. Transform to ReactFlow Format
        const rfNodes: Node[] = filteredNodes.map(node => ({
            id: node.id,
            type: 'semantic',
            data: {
                label: node.label,
                type: node.type,
                risk_score: node.risk_score,
                metadata: node.metadata,
                expanded: expandedNodes.has(node.id),
                onExpand: () => handleExpandChain(node.id)
            },
            position: { x: 0, y: 0 } // Layout calculates this
        }));

        const rfEdges: Edge[] = visibleEdges.map(edge => {
            const isCritical = edge.type === 'EXPOSES';
            // Neutral-first: Use muted gray for all edges, red only for critical
            const color = isCritical ? 'rgba(239, 68, 68, 0.6)' : 'rgba(148, 163, 184, 0.3)';
            return {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                label: edge.label,
                type: 'default', // Bezier curves as requested
                style: {
                    stroke: color,
                    strokeWidth: isCritical ? 2 : 1.5,
                    opacity: isCritical ? 0.6 : 0.3
                },
                labelStyle: {
                    fill: '#64748b',
                    fontWeight: 600,
                    fontSize: 10,
                    opacity: 0.7
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: isCritical ? '#ef4444' : '#94a3b8'
                }
            };
        });

        // 5. Apply Layout
        const layout = getLayoutedElements(rfNodes, rfEdges);
        return { layoutedNodes: layout.nodes, layoutedEdges: layout.edges };

    }, [graphNodes, graphEdges, expandedNodes, handleExpandChain]);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Sync Layout
    useEffect(() => {
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

    const onNodeClick = (_: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
    };

    if (graphNodes.length === 0) {
        return (
            <div className="section" style={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: 'var(--color-text-secondary)' }}>No lineage data available</div>
            </div>
        );
    }

    return (
        <ReactFlowProvider>
            <div className="section" style={{
                padding: 0,
                height: 650,
                position: 'relative',
                background: '#f8fafc',
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid #e2e8f0'
            }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick}
                    nodeTypes={nodeTypes}
                    fitView
                    minZoom={0.1}
                    attributionPosition="bottom-left"
                >
                    <Controls />
                    <Background color="#e2e8f0" gap={16} style={{ opacity: 0.4 }} />
                    <MiniMap
                        nodeColor={n => {
                            // Neutral minimap colors
                            if (n.data.type === 'system') return '#cbd5e1';
                            if (n.data.type === 'finding' && n.data.risk_score >= 90) return '#ef4444';
                            return '#e2e8f0';
                        }}
                        style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: 8,
                            background: '#ffffff'
                        }}
                        maskColor="rgba(248, 250, 252, 0.8)"
                    />
                </ReactFlow>

                <InspectorPanel
                    node={selectedNode}
                    onClose={() => setSelectedNode(null)}
                />
            </div>
        </ReactFlowProvider>
    );
}
