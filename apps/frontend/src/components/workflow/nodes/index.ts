/**
 * Custom React Flow Node Components
 *
 * Export all custom node types for use in WorkflowCanvas
 */

import { TriggerNode } from './TriggerNode';
import { HttpNode } from './HttpNode';
import { AINode } from './AINode';
import { DatabaseNode } from './DatabaseNode';
import { DefaultNode } from './DefaultNode';

export { TriggerNode, HttpNode, AINode, DatabaseNode, DefaultNode };

// Node type mapping for React Flow
export const nodeTypes = {
  trigger: TriggerNode,
  http: HttpNode,
  ai: AINode,
  database: DatabaseNode,
  default: DefaultNode,
};
