/**
 * Workflow Parser
 *
 * Parses and analyzes n8n workflow structures.
 */

export interface WorkflowNode {
  id: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  connections: Record<
    string,
    { main: Array<Array<{ node: string; type: string; index: number }>> }
  >;
}

export interface ParsedWorkflow {
  id: string;
  name: string;
  nodeCount: number;
  connectionCount: number;
  nodeTypes: Map<string, number>;
  startNodes: string[];
  endNodes: string[];
  complexity: number;
  estimatedDuration: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Estimated duration for each node type (in ms)
const NODE_DURATION_ESTIMATES: Record<string, number> = {
  start: 10,
  httpRequest: 2000,
  function: 100,
  set: 50,
  if: 50,
  switch: 50,
  merge: 20,
  wait: 1000, // Default wait, can be overridden by parameters
  webhook: 10,
  default: 100,
};

class WorkflowParser {
  private static getNodeTypeName(fullType: string): string {
    // Extract node type name from full type (e.g., 'n8n-nodes-base.httpRequest' -> 'httpRequest')
    const parts = fullType.split('.');
    return parts[parts.length - 1];
  }

  private static countConnections(workflow: Workflow): number {
    let count = 0;
    for (const nodeConnections of Object.values(workflow.connections)) {
      for (const outputs of nodeConnections.main) {
        count += outputs.length;
      }
    }
    return count;
  }

  private static findStartNodes(workflow: Workflow): string[] {
    const targetNodes = new Set<string>();

    // Find all nodes that are targets of connections
    for (const nodeConnections of Object.values(workflow.connections)) {
      for (const outputs of nodeConnections.main) {
        for (const connection of outputs) {
          targetNodes.add(connection.node);
        }
      }
    }

    // Start nodes are those that are not targets
    return workflow.nodes.map((node) => node.id).filter((nodeId) => !targetNodes.has(nodeId));
  }

  private static findEndNodes(workflow: Workflow): string[] {
    const sourceNodes = new Set(Object.keys(workflow.connections));

    // End nodes are those that don't have outgoing connections
    return workflow.nodes.map((node) => node.id).filter((nodeId) => !sourceNodes.has(nodeId));
  }

  private static countNodeTypes(workflow: Workflow): Map<string, number> {
    const counts = new Map<string, number>();

    for (const node of workflow.nodes) {
      const typeName = this.getNodeTypeName(node.type);
      counts.set(typeName, (counts.get(typeName) || 0) + 1);
    }

    return counts;
  }

  private static calculateComplexity(workflow: Workflow): number {
    const nodeCount = workflow.nodes.length;
    const connectionCount = this.countConnections(workflow);

    // Base complexity: nodes + connections/2
    let complexity = nodeCount + connectionCount * 0.5;

    // Check for branches (nodes with multiple outputs)
    for (const nodeConnections of Object.values(workflow.connections)) {
      if (nodeConnections.main.length > 1) {
        complexity += nodeConnections.main.length * 0.5;
      }
    }

    // Check for loops (self-referencing or circular connections)
    for (const [sourceId, nodeConnections] of Object.entries(workflow.connections)) {
      for (const outputs of nodeConnections.main) {
        for (const connection of outputs) {
          if (connection.node === sourceId) {
            complexity += 1; // Self-loop penalty
          }
        }
      }
    }

    return complexity;
  }

  private static estimateDuration(workflow: Workflow): number {
    let totalDuration = 0;

    for (const node of workflow.nodes) {
      const typeName = this.getNodeTypeName(node.type);

      // Special handling for wait nodes
      if (typeName === 'wait' && node.parameters.amount) {
        totalDuration += (node.parameters.amount as number) * 1000;
      } else {
        totalDuration += NODE_DURATION_ESTIMATES[typeName] || NODE_DURATION_ESTIMATES.default;
      }
    }

    return totalDuration;
  }

  static parse(workflow: Workflow): ParsedWorkflow {
    return {
      id: workflow.id,
      name: workflow.name,
      nodeCount: workflow.nodes.length,
      connectionCount: this.countConnections(workflow),
      nodeTypes: this.countNodeTypes(workflow),
      startNodes: this.findStartNodes(workflow),
      endNodes: this.findEndNodes(workflow),
      complexity: this.calculateComplexity(workflow),
      estimatedDuration: this.estimateDuration(workflow),
    };
  }

  static validate(workflow: Workflow): ValidationResult {
    const errors: string[] = [];

    // Check for empty workflow
    if (workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
      return { valid: false, errors };
    }

    // Build node ID set for validation
    const nodeIds = new Set(workflow.nodes.map((node) => node.id));

    // Check for invalid connections (pointing to non-existent nodes)
    for (const [sourceId, nodeConnections] of Object.entries(workflow.connections)) {
      if (!nodeIds.has(sourceId)) {
        errors.push(`Connection source node not found: ${sourceId}`);
      }

      for (const outputs of nodeConnections.main) {
        for (const connection of outputs) {
          if (!nodeIds.has(connection.node)) {
            errors.push(`Connection target node not found: ${connection.node}`);
          }
        }
      }
    }

    // Check for disconnected nodes (more than one connected component)
    if (workflow.nodes.length > 1) {
      // Build adjacency list (bidirectional)
      const adjacency = new Map<string, Set<string>>();
      for (const node of workflow.nodes) {
        adjacency.set(node.id, new Set());
      }

      // Add edges from connections
      for (const [sourceId, nodeConnections] of Object.entries(workflow.connections)) {
        for (const outputs of nodeConnections.main) {
          for (const connection of outputs) {
            adjacency.get(sourceId)?.add(connection.node);
            adjacency.get(connection.node)?.add(sourceId);
          }
        }
      }

      // BFS from first node to find all reachable nodes
      const connectedNodes = new Set<string>();
      const queue = [workflow.nodes[0].id];

      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (connectedNodes.has(nodeId)) continue;
        connectedNodes.add(nodeId);

        // Add adjacent nodes
        const neighbors = adjacency.get(nodeId);
        if (neighbors) {
          for (const neighbor of neighbors) {
            if (!connectedNodes.has(neighbor)) {
              queue.push(neighbor);
            }
          }
        }
      }

      // Check if all nodes are connected
      const disconnectedNodes = workflow.nodes.filter((node) => !connectedNodes.has(node.id));

      if (disconnectedNodes.length > 0) {
        const disconnectedIds = disconnectedNodes.map((n) => n.id).join(', ');
        errors.push(`Disconnected nodes found: ${disconnectedIds}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default WorkflowParser;
