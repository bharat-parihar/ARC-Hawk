import { useState, useEffect, useCallback, useMemo } from 'react';
import { Node, Edge, MarkerType } from 'reactflow';
import { BaseNode, BaseEdge, PERFORMANCE_LIMITS } from './lineage.types';
import { getLayoutedElements } from './layout.utils';
import { colors } from '@/design-system/colors';
import { getEdgeColor } from '@/design-system/themes';

interface UseLineageGraphProps {
    nodes: BaseNode[];
    edges: BaseEdge[];
    focusedNodeId?: string | null;
}

export function useLineageGraph({ nodes: graphNodes, edges: graphEdges, focusedNodeId }: UseLineageGraphProps) {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    // Initial Expansion Strategy
    useEffect(() => {
        const initialExpanded = new Set<string>();

        if (focusedNodeId) {
            // If focused, expand the focused node
            initialExpanded.add(focusedNodeId);
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
        // STRICT RULE: remove any node type 'finding' from visualization to prevent clutter
        const cleanNodes = graphNodes.filter(n => n.type !== 'finding');

        if (cleanNodes.length === 0) return { layoutedNodes: [], layoutedEdges: [] };

        const visibleNodeIds = new Set<string>();

        if (focusedNodeId) {
            visibleNodeIds.add(focusedNodeId);
        } else {
            cleanNodes.forEach((node) => {
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

            cleanNodes.forEach((node) => {
                if (node.parent_id && visibleNodeIds.has(node.parent_id) && expandedNodes.has(node.parent_id)) {
                    if (!visibleNodeIds.has(node.id)) {
                        visibleNodeIds.add(node.id);
                        changed = true;
                    }
                }
            });

            graphEdges.forEach((edge) => {
                const sourceExists = cleanNodes.some(n => n.id === edge.source);
                const targetExists = cleanNodes.some(n => n.id === edge.target);

                if (sourceExists && targetExists && visibleNodeIds.has(edge.source) && expandedNodes.has(edge.source)) {
                    if (!visibleNodeIds.has(edge.target)) {
                        visibleNodeIds.add(edge.target);
                        changed = true;
                    }
                }
            });
        }

        const filteredNodes = cleanNodes.filter((n) => visibleNodeIds.has(n.id));

        if (filteredNodes.length > PERFORMANCE_LIMITS.MAX_VISIBLE_NODES) {
            console.warn(`Too many visible nodes (${filteredNodes.length}). Consider filtering.`);
        }

        const visibleEdges = graphEdges.filter(
            (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
        );

        const childCounts = new Map<string, number>();
        cleanNodes.forEach((node) => {
            if (node.parent_id) {
                childCounts.set(node.parent_id, (childCounts.get(node.parent_id) || 0) + 1);
            }
        });

        const rfNodes: Node[] = filteredNodes.map((node) => ({
            id: node.id,
            type: 'lineageNode',
            data: {
                ...node,
                expanded: expandedNodes.has(node.id),
                childCount: childCounts.get(node.id) || 0,
                onExpand: () => handleToggleExpand(node.id),
            },
            position: { x: 0, y: 0 },
        }));

        const rfEdges: Edge[] = visibleEdges.map((edge) => {
            const isCritical = edge.type === 'EXPOSES';
            const edgeColor = getEdgeColor(edge.type);

            return {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                label: edge.label,
                type: 'default', // Bezier curves
                animated: isCritical,
                style: {
                    stroke: edgeColor,
                    strokeWidth: isCritical ? 2.5 : 1.5,
                    opacity: isCritical ? 0.9 : 0.6,
                },
                labelStyle: {
                    fill: colors.text.secondary,
                    fontWeight: 600,
                    fontSize: '11px',
                    opacity: 0.8,
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

        const layout = getLayoutedElements(rfNodes, rfEdges);
        return { layoutedNodes: layout.nodes, layoutedEdges: layout.edges };
    }, [graphNodes, graphEdges, expandedNodes, handleToggleExpand, focusedNodeId]);

    return { layoutedNodes, layoutedEdges };
}
