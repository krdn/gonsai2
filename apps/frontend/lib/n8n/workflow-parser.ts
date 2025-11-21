/**
 * Workflow Parser
 *
 * Parses and analyzes n8n workflow structures.
 */

interface WorkflowNode {
  id: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
}

interface WorkflowConnection {
  node: string;
  type: string;
  index: number;
}

interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  connections: Record<string, Record<string, WorkflowConnection[][]>>;
}

interface ParsedWorkflow {
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

class WorkflowParser {
  /**
   * Parse workflow structure
   */
  static parse(workflow: Workflow): ParsedWorkflow {
    const nodeTypes = this.countNodeTypes(workflow.nodes);
    const startNodes = this.findStartNodes(workflow);
    const endNodes = this.findEndNodes(workflow);
    const connectionCount = this.countConnections(workflow.connections);
    const complexity = this.calculateComplexity(workflow);
    const estimatedDuration = this.estimateDuration(workflow);

    return {
      id: workflow.id,
      name: workflow.name,
      nodeCount: workflow.nodes.length,
      connectionCount,
      nodeTypes,
      startNodes,
      endNodes,
      complexity,
      estimatedDuration,
    };
  }

  /**
   * Count node types
   */
  private static countNodeTypes(nodes: WorkflowNode[]): Map<string, number> {
    const counts = new Map<string, number>();

    nodes.forEach((node) => {
      const baseType = node.type.split('.').pop() || node.type;
      counts.set(baseType, (counts.get(baseType) || 0) + 1);
    });

    return counts;
  }

  /**
   * Find start nodes (nodes with no incoming connections)
   */
  private static findStartNodes(workflow: Workflow): string[] {
    const hasIncoming = new Set<string>();

    Object.values(workflow.connections).forEach((connections) => {
      Object.values(connections).forEach((connectionList) => {
        connectionList.forEach((list) => {
          list.forEach((conn) => {
            hasIncoming.add(conn.node);
          });
        });
      });
    });

    return workflow.nodes.filter((node) => !hasIncoming.has(node.id)).map((node) => node.id);
  }

  /**
   * Find end nodes (nodes with no outgoing connections)
   */
  private static findEndNodes(workflow: Workflow): string[] {
    const hasOutgoing = new Set(Object.keys(workflow.connections));

    return workflow.nodes.filter((node) => !hasOutgoing.has(node.id)).map((node) => node.id);
  }

  /**
   * Count total connections
   */
  private static countConnections(
    connections: Record<string, Record<string, WorkflowConnection[][]>>
  ): number {
    let count = 0;

    Object.values(connections).forEach((nodeConnections) => {
      Object.values(nodeConnections).forEach((connectionList) => {
        connectionList.forEach((list) => {
          count += list.length;
        });
      });
    });

    return count;
  }

  /**
   * Calculate workflow complexity
   * Based on: nodes, connections, branches, loops
   */
  private static calculateComplexity(workflow: Workflow): number {
    const nodeCount = workflow.nodes.length;
    const connectionCount = this.countConnections(workflow.connections);

    // Detect branches (nodes with multiple outgoing connections)
    let branchCount = 0;
    Object.values(workflow.connections).forEach((nodeConnections) => {
      Object.values(nodeConnections).forEach((connectionList) => {
        connectionList.forEach((list) => {
          if (list.length > 1) {
            branchCount += list.length - 1;
          }
        });
      });
    });

    // Detect loops (simplified)
    const loopCount = this.detectLoops(workflow);

    // Complexity formula: weighted sum
    return nodeCount * 1 + connectionCount * 0.5 + branchCount * 2 + loopCount * 3;
  }

  /**
   * Detect loops in workflow (simplified DFS)
   */
  private static detectLoops(workflow: Workflow): number {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    let loopCount = 0;

    const dfs = (nodeId: string): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const nodeConnections = workflow.connections[nodeId];
      if (nodeConnections) {
        Object.values(nodeConnections).forEach((connectionList) => {
          connectionList.forEach((list) => {
            list.forEach((conn) => {
              if (!visited.has(conn.node)) {
                dfs(conn.node);
              } else if (recursionStack.has(conn.node)) {
                loopCount++;
              }
            });
          });
        });
      }

      recursionStack.delete(nodeId);
    };

    const startNodes = this.findStartNodes(workflow);
    startNodes.forEach((nodeId) => {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    });

    return loopCount;
  }

  /**
   * Estimate workflow duration (in milliseconds)
   * Based on node types and typical execution times
   */
  private static estimateDuration(workflow: Workflow): number {
    const nodeTypeDurations: Record<string, number> = {
      start: 10,
      httpRequest: 2000,
      webhook: 1000,
      function: 100,
      set: 50,
      if: 50,
      switch: 50,
      code: 200,
      wait: 5000,
      default: 500,
    };

    let totalDuration = 0;

    workflow.nodes.forEach((node) => {
      const baseType = node.type.split('.').pop() || 'default';
      const duration = nodeTypeDurations[baseType] || nodeTypeDurations.default;

      // Add parameter-based adjustments
      if (baseType === 'wait' && node.parameters.amount) {
        totalDuration += node.parameters.amount * 1000;
      } else {
        totalDuration += duration;
      }
    });

    return totalDuration;
  }

  /**
   * Validate workflow structure
   */
  static validate(workflow: Workflow): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for nodes
    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    // Check for start nodes
    const startNodes = this.findStartNodes(workflow);
    if (startNodes.length === 0) {
      errors.push('Workflow must have at least one start node');
    }

    // Check for disconnected nodes
    const connectedNodes = new Set<string>();
    Object.keys(workflow.connections).forEach((nodeId) => connectedNodes.add(nodeId));
    Object.values(workflow.connections).forEach((nodeConnections) => {
      Object.values(nodeConnections).forEach((connectionList) => {
        connectionList.forEach((list) => {
          list.forEach((conn) => connectedNodes.add(conn.node));
        });
      });
    });

    const disconnected = workflow.nodes.filter((node) => !connectedNodes.has(node.id));
    if (disconnected.length > 0 && workflow.nodes.length > 1) {
      errors.push(`Disconnected nodes found: ${disconnected.map((n) => n.id).join(', ')}`);
    }

    // Check for invalid connections
    const nodeIds = new Set(workflow.nodes.map((n) => n.id));
    Object.entries(workflow.connections).forEach(([sourceId, connections]) => {
      if (!nodeIds.has(sourceId)) {
        errors.push(`Connection source node not found: ${sourceId}`);
      }

      Object.values(connections).forEach((connectionList) => {
        connectionList.forEach((list) => {
          list.forEach((conn) => {
            if (!nodeIds.has(conn.node)) {
              errors.push(`Connection target node not found: ${conn.node}`);
            }
          });
        });
      });
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default WorkflowParser;
export type { Workflow, ParsedWorkflow, WorkflowNode };
