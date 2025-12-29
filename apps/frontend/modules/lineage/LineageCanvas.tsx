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

import {
    BaseNode,
    BaseEdge,
    DEFAULT_LAYOUT_CONFIG,
    PERFORMANCE_LIMITS,
} from './lineage.types';
import LineageNode from './LineageNode';
import { colors } from '@/design-system/colors';
import { theme } from '@/design-system/themes';
import { getEdgeColor } from '@/design-system/themes';
import EmptyState from '@/components/EmptyState';

interface LineageCanvasProps {
    nodes: BaseNode[];
    edges: BaseEdge[];
    onNodeClick?: (nodeId: string) => void;
    focusedNodeId?: string | null;
}

const nodeWidth = 240;
const nodeHeight = 100;

// Custom node types
const nodeTypes = {
    lineageNode: LineageNode,
};

// Helper to get connected nodes (BFS)
const getConnectedNodes = (startNodeId: string, edges: Edge[], maxDepth: number = 2): Set<string> => {
    const connected = new Set<string>();
    connected.add(startNodeId);

    let currentLevel = new Set<string>([startNodeId]);

    for (let i = 0; i < maxDepth; i++) {
        const nextLevel = new Set<string>();
        edges.forEach(edge => {
            if (currentLevel.has(edge.source)) {
                connected.add(edge.target);
                nextLevel.add(edge.target);
            }
            if (currentLevel.has(edge.target)) {
                connected.add(edge.source);
                nextLevel.add(edge.source);
            }
        });
        currentLevel = nextLevel;
    }
    return connected;
};

/**
 * Apply Dagre hierarchical layout to nodes
 */
function getLayoutedElements(nodes: Node[], edges: Edge[]) {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({
        rankdir: DEFAULT_LAYOUT_CONFIG.rankdir,
        nodesep: DEFAULT_LAYOUT_CONFIG.nodesep,
        ranksep: DEFAULT_LAYOUT_CONFIG.ranksep,
        edgesep: DEFAULT_LAYOUT_CONFIG.edgesep,
        marginx: DEFAULT_LAYOUT_CONFIG.marginx,
        marginy: DEFAULT_LAYOUT_CONFIG.marginy,
    });

    nodes.forEach((node) => {
        // Dynamic sizing matching LineageNode.tsx
        let width = 240;
        let height = 100;

        // Ensure these match LineageNode.tsx exactly or are slightly larger
        switch (node.data.type) {
            case 'system':
                width = 320; // Increased width
                height = 180; // Increased to safe height for text wrapping
                break;
            case 'asset':
            case 'file':
            case 'table':
                width = 280;
                height = 160; // Increased height
                break;
            case 'data_category':
            case 'category':
                width = 240;
                height = 140; // Increased height
                break;
            case 'finding':
                width = 220;
                height = 120; // Increased height
                break;
            default:
                width = 240;
                height = 140;
        }

        dagreGraph.setNode(node.id, { width, height });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);

        if (!nodeWithPosition) return node;

        // Recalculate dimensions for centering (must match above)
        let width = 240;
        let height = 100;
        switch (node.data.type) {
            case 'system': width = 320; height = 180; break;
            case 'asset': case 'file': case 'table': width = 280; height = 160; break;
            case 'data_category': case 'category': width = 240; height = 140; break;
            case 'finding': width = 220; height = 120; break;
            default: width = 240; height = 140;
        }

        return {
            ...node,
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
            position: {
                x: nodeWithPosition.x - width / 2,
                y: nodeWithPosition.y - height / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
}

function LineageCanvasContent({ nodes: graphNodes, edges: graphEdges, onNodeClick, focusedNodeId }: LineageCanvasProps) {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // Initial Expansion Strategy
    useEffect(() => {
        const initialExpanded = new Set<string>();

        if (focusedNodeId) {
            // If focused, expand the focused node
            initialExpanded.add(focusedNodeId);
            // Also expand parents to show context? Maybe not initially.
        } else {
            // Default: Expand all System nodes
            graphNodes.forEach((node) => {
                if (node.type === 'system') {
                    initialExpanded.add(node.id);
                }
            });
        }
        setExpandedNodes(initialExpanded);
    }, [graphNodes, focusedNodeId]);

    const handleToggleExpand = useCallback((nodeId: string) => {
        setExpandedNodes((prev) => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    }, []);

    // Filter visible nodes based on expansion state and focus
    const { layoutedNodes, layoutedEdges } = useMemo(() => {
        if (graphNodes.length === 0) return { layoutedNodes: [], layoutedEdges: [] };

        const visibleNodeIds = new Set<string>();

        if (focusedNodeId) {
            // FOCUSED MODE: Start with the focused node
            visibleNodeIds.add(focusedNodeId);

            // Add anything connected to currently visible AND expanded nodes
            // Logic:
            // 1. Focused node is visible.
            // 2. If focused node is expanded, show its neighbors?
            // Actually, we need to respect the general graph traversal rules but rooted at focusedNodeId.

            // Simply: Add system nodes if NO focus.
            // But here we have focus.
        } else {
            // DEFAULT MODE: Roots are Systems
            graphNodes.forEach((node) => {
                if (node.type === 'system') {
                    visibleNodeIds.add(node.id);
                }
            });
        }

        // Iterative visibility expansion
        let changed = true;
        let iterations = 0;
        const maxIterations = 10;

        while (changed && iterations < maxIterations) {
            changed = false;
            iterations++;

            graphNodes.forEach((node) => {
                // If parent is visible AND expanded -> Show Child
                if (node.parent_id && visibleNodeIds.has(node.parent_id) && expandedNodes.has(node.parent_id)) {
                    if (!visibleNodeIds.has(node.id)) {
                        visibleNodeIds.add(node.id);
                        changed = true;
                    }
                }
            });

            // Edges: If source is visible AND expanded -> Show Target
            graphEdges.forEach((edge) => {
                if (visibleNodeIds.has(edge.source) && expandedNodes.has(edge.source)) {
                    if (!visibleNodeIds.has(edge.target)) {
                        visibleNodeIds.add(edge.target);
                        changed = true;
                    }
                }

                // Also: If we are in focused mode, we might want to see parents?
                // If Target is visible (and maybe we want to see upstream) -> Show Source?
                // For now, let's keep strictly downstream flow from expanded nodes.
            });
        }

        // Filter to visible nodes
        const filteredNodes = graphNodes.filter((n) => visibleNodeIds.has(n.id));

        // Performance limit check
        if (filteredNodes.length > PERFORMANCE_LIMITS.MAX_VISIBLE_NODES) {
            console.warn(`Too many visible nodes (${filteredNodes.length}). Consider filtering.`);
        }

        // Filter to visible edges
        const visibleEdges = graphEdges.filter(
            (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
        );

        // Count children for each node
        const childCounts = new Map<string, number>();
        graphNodes.forEach((node) => {
            if (node.parent_id) {
                childCounts.set(node.parent_id, (childCounts.get(node.parent_id) || 0) + 1);
            }
        });
        graphEdges.forEach((edge) => {
            childCounts.set(edge.source, (childCounts.get(edge.source) || 0) + 1);
        });

        // Transform to ReactFlow format
        const rfNodes: Node[] = filteredNodes.map((node) => ({
            id: node.id,
            type: 'lineageNode',
            data: {
                ...node,
                expanded: expandedNodes.has(node.id),
                childCount: childCounts.get(node.id) || 0,
                onExpand: () => handleToggleExpand(node.id),
            },
            position: { x: 0, y: 0 }, // Will be set by layout
        }));

        const rfEdges: Edge[] = visibleEdges.map((edge) => {
            const isCritical = edge.type === 'EXPOSES';
            const isClassification = edge.type === 'CLASSIFIED_AS';
            const edgeColor = getEdgeColor(edge.type);

            return {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                label: edge.label,
                type: 'smoothstep',
                animated: isCritical,
                style: {
                    stroke: edgeColor,
                    strokeWidth: isCritical ? 2.5 : 2,
                    opacity: isCritical ? 0.8 : 0.5,
                },
                labelStyle: {
                    fill: colors.text.secondary,
                    fontWeight: 600,
                    fontSize: '12px',
                    opacity: 0.9,
                },
                labelBgStyle: {
                    fill: colors.background.card,
                    fillOpacity: 0.95,
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: edgeColor,
                    width: 20,
                    height: 20,
                },
            };
        });

        // Apply layout
        const layout = getLayoutedElements(rfNodes, rfEdges);
        return { layoutedNodes: layout.nodes, layoutedEdges: layout.edges };
    }, [graphNodes, graphEdges, expandedNodes, handleToggleExpand]);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Sync layout with state
    useEffect(() => {
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

    const handleNodeClick = useCallback(
        (_: React.MouseEvent, node: Node) => {
            setSelectedNodeId(node.id);
            onNodeClick && onNodeClick(node.id);
        },
        [onNodeClick]
    );

    if (graphNodes.length === 0) {
        return (
            <EmptyState
                icon="🔗"
                title="No Lineage Data"
                description="No lineage graph available. Please run a scan to populate the graph."
            />
        );
    }

    return (
        <div
            style={{
                height: 'calc(100vh - 250px)',
                background: colors.background.primary,  // Soft gray background
                borderRadius: '12px',
                overflow: 'hidden',
                border: `1px solid ${colors.border.default}`,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
                position: 'relative',
            }}
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{
                    padding: 0.15,
                    minZoom: 0.5,
                    maxZoom: 1.5,
                }}
                minZoom={0.2}
                maxZoom={2}
                attributionPosition="bottom-left"
                proOptions={{ hideAttribution: true }}
            >
                <Controls showInteractive={false} />
                <Background
                    color={colors.border.subtle}
                    gap={20}
                    style={{ opacity: 0.5 }}
                />
                <MiniMap
                    nodeColor={(n) => {
                        const nodeType = n.data.type;
                        if (nodeType === 'system') return colors.nodeColors.system;
                        if (nodeType === 'asset' || nodeType === 'file' || nodeType === 'table')
                            return colors.nodeColors.asset;
                        if (nodeType === 'data_category' || nodeType === 'category')
                            return colors.nodeColors.category;
                        if (nodeType === 'finding') {
                            return n.data.risk_score >= 90 ? colors.state.risk : colors.border.default;
                        }
                        return colors.border.default;
                    }}
                    style={{
                        border: `1px solid ${colors.border.default}`,
                        borderRadius: '8px',
                        background: colors.background.surface,
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    }}
                    maskColor="rgba(248, 250, 252, 0.8)"
                />
            </ReactFlow>

            {/* Legend */}
            <div
                style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: colors.background.surface,
                    backdropFilter: 'blur(10px)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border.default}`,
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px',
                    color: colors.text.secondary,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                }}
            >
                <div style={{ fontWeight: 600, color: colors.text.primary, marginBottom: '4px' }}>Legend</div>
                <LegendItem color={colors.nodeColors.system} label="System" />
                <LegendItem color={colors.nodeColors.asset} label="Asset" />
                <LegendItem color={colors.nodeColors.category} label="Category" />
                <LegendItem color={colors.state.risk} label="Critical" />
            </div>
        </div>
    );
}

function LegendItem({ color, label }: { color: string; label: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
                style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '3px',
                    backgroundColor: color,
                }}
            />
            <span>{label}</span>
        </div>
    );
}

export default function LineageCanvas(props: LineageCanvasProps) {
    return (
        <ReactFlowProvider>
            <LineageCanvasContent {...props} />
        </ReactFlowProvider>
    );
}
