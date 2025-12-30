'use client';

import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
    Node,
    Controls,
    Background,
    MiniMap,
    useNodesState,
    useEdgesState,
    ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
    BaseNode,
    BaseEdge,
} from './lineage.types';
import LineageNode from './LineageNode';
import LineageLegend from './LineageLegend';
import { useLineageGraph } from './useLineageGraph';
import { colors } from '@/design-system/colors';
import EmptyState from '@/components/EmptyState';

interface LineageCanvasProps {
    nodes: BaseNode[];
    edges: BaseEdge[];
    onNodeClick?: (nodeId: string) => void;
    focusedNodeId?: string | null;
}

// Custom node types
const nodeTypes = {
    lineageNode: LineageNode,
};

function LineageCanvasContent({ nodes: graphNodes, edges: graphEdges, onNodeClick, focusedNodeId }: LineageCanvasProps) {
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // Use custom hook for graph logic
    const { layoutedNodes, layoutedEdges } = useLineageGraph({
        nodes: graphNodes,
        edges: graphEdges,
        focusedNodeId
    });

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

            <LineageLegend />
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
