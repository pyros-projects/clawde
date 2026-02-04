'use client';

import { useMemo, useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  type OnSelectionChangeFunc,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore } from '@/stores/app-store';
import { Task, STATUS_COLORS } from '@/lib/types';
import { TaskNode } from './task-node';
import { TaskDetailPanel } from './task-detail-panel';

const nodeTypes: NodeTypes = {
  taskNode: TaskNode as unknown as NodeTypes['taskNode'],
};

function layoutNodes(tasks: Task[], agents: { id: string; name: string; color: string }[]): { nodes: Node[]; edges: Edge[] } {
  // Simple layered layout based on dependency depth
  const depthMap = new Map<string, number>();

  function getDepth(taskId: string, visited = new Set<string>()): number {
    if (visited.has(taskId)) return 0;
    visited.add(taskId);
    if (depthMap.has(taskId)) return depthMap.get(taskId)!;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.deps.length === 0) {
      depthMap.set(taskId, 0);
      return 0;
    }

    const maxDepDep = Math.max(...task.deps.map((d) => getDepth(d, visited)));
    const depth = maxDepDep + 1;
    depthMap.set(taskId, depth);
    return depth;
  }

  tasks.forEach((t) => getDepth(t.id));

  // Group by depth
  const layers = new Map<number, string[]>();
  depthMap.forEach((depth, taskId) => {
    if (!layers.has(depth)) layers.set(depth, []);
    layers.get(depth)!.push(taskId);
  });

  const LAYER_HEIGHT = 140;
  const NODE_WIDTH = 260;
  const NODE_GAP = 40;

  const nodes: Node[] = [];

  layers.forEach((taskIds, depth) => {
    const totalWidth = taskIds.length * NODE_WIDTH + (taskIds.length - 1) * NODE_GAP;
    const startX = -totalWidth / 2;

    taskIds.forEach((taskId, i) => {
      const task = tasks.find((t) => t.id === taskId)!;
      const agent = task.assignee ? agents.find((a) => a.id === task.assignee) : undefined;

      nodes.push({
        id: taskId,
        type: 'taskNode',
        position: {
          x: startX + i * (NODE_WIDTH + NODE_GAP),
          y: depth * LAYER_HEIGHT,
        },
        data: {
          task,
          agentName: agent?.name,
          agentColor: agent?.color,
        },
      });
    });
  });

  const edges: Edge[] = tasks.flatMap((task) =>
    task.deps.map((depId) => ({
      id: `${depId}-${task.id}`,
      source: depId,
      target: task.id,
      style: { stroke: 'var(--color-border)', strokeWidth: 1.5 },
      animated: task.status === 'in-progress',
    }))
  );

  return { nodes, edges };
}

export function TaskGraphScreen() {
  const { tasks, agents, selectTask } = useAppStore();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => layoutNodes(tasks, agents), [tasks, agents]);

  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      if (selectedNodes.length > 0) {
        const nodeId = selectedNodes[0].id;
        setSelectedNode(nodeId);
        selectTask(nodeId);
      } else {
        setSelectedNode(null);
        selectTask(null);
      }
    },
    [selectTask]
  );

  // Status filter counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return counts;
  }, [tasks]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task Graph</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Dependency visualization — {tasks.length} tasks
          </p>
        </div>
        <div className="flex gap-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <span
              key={status}
              className="text-[10px] px-2 py-1 rounded-full font-medium"
              style={{
                backgroundColor: `${STATUS_COLORS[status as keyof typeof STATUS_COLORS]}15`,
                color: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
              }}
            >
              {status.replace('-', ' ')}: {count}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <div
          className="flex-1 rounded-xl border overflow-hidden"
          style={{
            height: 'calc(100vh - 12rem)',
            background: 'var(--color-bg-card)',
            borderColor: 'var(--color-border-subtle)',
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.3}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e1e2e" />
            <Controls
              className="!bg-gray-900 !border-gray-700 !rounded-lg [&>button]:!bg-gray-800 [&>button]:!border-gray-700 [&>button]:!text-gray-300 [&>button:hover]:!bg-gray-700"
            />
            <MiniMap
              className="!bg-gray-900 !border-gray-700 !rounded-lg"
              nodeColor={(node) => {
                const task = (node.data as { task: { status: string } })?.task;
                return task ? STATUS_COLORS[task.status as keyof typeof STATUS_COLORS] || '#64748b' : '#64748b';
              }}
              maskColor="rgba(0, 0, 0, 0.7)"
            />
          </ReactFlow>
        </div>

        {selectedNode && <TaskDetailPanel taskId={selectedNode} onClose={() => { setSelectedNode(null); selectTask(null); }} />}
      </div>
    </div>
  );
}
