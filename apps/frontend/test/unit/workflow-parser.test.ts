/**
 * Workflow Parser Tests
 *
 * Unit tests for workflow structure analysis.
 */

import WorkflowParser from '@/lib/n8n/workflow-parser';
import type { Workflow } from '@/lib/n8n/workflow-parser';

describe('WorkflowParser', () => {
  const simpleWorkflow: Workflow = {
    id: 'simple-1',
    name: 'Simple Workflow',
    nodes: [
      {
        id: 'start',
        type: 'n8n-nodes-base.start',
        typeVersion: 1,
        position: [0, 0],
        parameters: {},
      },
      {
        id: 'http',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 1,
        position: [200, 0],
        parameters: { url: 'https://api.example.com' },
      },
    ],
    connections: {
      start: {
        main: [[{ node: 'http', type: 'main', index: 0 }]],
      },
    },
  };

  const complexWorkflow: Workflow = {
    id: 'complex-1',
    name: 'Complex Workflow',
    nodes: [
      {
        id: 'start',
        type: 'n8n-nodes-base.start',
        typeVersion: 1,
        position: [0, 0],
        parameters: {},
      },
      {
        id: 'if',
        type: 'n8n-nodes-base.if',
        typeVersion: 1,
        position: [200, 0],
        parameters: {},
      },
      {
        id: 'branch1',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 1,
        position: [400, -100],
        parameters: {},
      },
      {
        id: 'branch2',
        type: 'n8n-nodes-base.function',
        typeVersion: 1,
        position: [400, 100],
        parameters: {},
      },
      {
        id: 'end',
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [600, 0],
        parameters: {},
      },
    ],
    connections: {
      start: {
        main: [[{ node: 'if', type: 'main', index: 0 }]],
      },
      if: {
        main: [
          [{ node: 'branch1', type: 'main', index: 0 }],
          [{ node: 'branch2', type: 'main', index: 0 }],
        ],
      },
      branch1: {
        main: [[{ node: 'end', type: 'main', index: 0 }]],
      },
      branch2: {
        main: [[{ node: 'end', type: 'main', index: 0 }]],
      },
    },
  };

  describe('parse', () => {
    it('should parse simple workflow', () => {
      const parsed = WorkflowParser.parse(simpleWorkflow);

      expect(parsed).toMatchObject({
        id: 'simple-1',
        name: 'Simple Workflow',
        nodeCount: 2,
        connectionCount: 1,
      });
      expect(parsed.nodeTypes.get('start')).toBe(1);
      expect(parsed.nodeTypes.get('httpRequest')).toBe(1);
    });

    it('should identify start nodes', () => {
      const parsed = WorkflowParser.parse(simpleWorkflow);

      expect(parsed.startNodes).toEqual(['start']);
    });

    it('should identify end nodes', () => {
      const parsed = WorkflowParser.parse(simpleWorkflow);

      expect(parsed.endNodes).toEqual(['http']);
    });

    it('should count connections', () => {
      const parsed = WorkflowParser.parse(complexWorkflow);

      expect(parsed.connectionCount).toBe(5);
    });

    it('should count node types', () => {
      const parsed = WorkflowParser.parse(complexWorkflow);

      expect(parsed.nodeTypes.get('start')).toBe(1);
      expect(parsed.nodeTypes.get('if')).toBe(1);
      expect(parsed.nodeTypes.get('httpRequest')).toBe(1);
      expect(parsed.nodeTypes.get('function')).toBe(1);
      expect(parsed.nodeTypes.get('set')).toBe(1);
    });
  });

  describe('calculateComplexity', () => {
    it('should calculate low complexity for simple workflow', () => {
      const parsed = WorkflowParser.parse(simpleWorkflow);

      // 2 nodes * 1 + 1 connection * 0.5 = 2.5
      expect(parsed.complexity).toBeCloseTo(2.5, 1);
    });

    it('should calculate higher complexity for branching workflow', () => {
      const parsed = WorkflowParser.parse(complexWorkflow);

      // Should be significantly higher due to branches
      expect(parsed.complexity).toBeGreaterThan(5);
    });

    it('should detect loops', () => {
      const loopWorkflow: Workflow = {
        id: 'loop-1',
        name: 'Loop Workflow',
        nodes: [
          {
            id: 'start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [0, 0],
            parameters: {},
          },
          {
            id: 'loop',
            type: 'n8n-nodes-base.function',
            typeVersion: 1,
            position: [200, 0],
            parameters: {},
          },
        ],
        connections: {
          start: {
            main: [[{ node: 'loop', type: 'main', index: 0 }]],
          },
          loop: {
            main: [[{ node: 'loop', type: 'main', index: 0 }]], // Self-loop
          },
        },
      };

      const parsed = WorkflowParser.parse(loopWorkflow);

      // Should have elevated complexity due to loop
      expect(parsed.complexity).toBeGreaterThan(3);
    });
  });

  describe('estimateDuration', () => {
    it('should estimate duration for simple workflow', () => {
      const parsed = WorkflowParser.parse(simpleWorkflow);

      // start: 10ms + httpRequest: 2000ms = 2010ms
      expect(parsed.estimatedDuration).toBe(2010);
    });

    it('should estimate duration for complex workflow', () => {
      const parsed = WorkflowParser.parse(complexWorkflow);

      // start: 10 + if: 50 + httpRequest: 2000 + function: 100 + set: 50 = 2210
      expect(parsed.estimatedDuration).toBe(2210);
    });

    it('should handle wait nodes with custom duration', () => {
      const waitWorkflow: Workflow = {
        id: 'wait-1',
        name: 'Wait Workflow',
        nodes: [
          {
            id: 'start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [0, 0],
            parameters: {},
          },
          {
            id: 'wait',
            type: 'n8n-nodes-base.wait',
            typeVersion: 1,
            position: [200, 0],
            parameters: { amount: 5 }, // 5 seconds
          },
        ],
        connections: {
          start: {
            main: [[{ node: 'wait', type: 'main', index: 0 }]],
          },
        },
      };

      const parsed = WorkflowParser.parse(waitWorkflow);

      // start: 10 + wait: 5000 = 5010
      expect(parsed.estimatedDuration).toBe(5010);
    });
  });

  describe('validate', () => {
    it('should validate correct workflow', () => {
      const result = WorkflowParser.validate(simpleWorkflow);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect empty workflow', () => {
      const emptyWorkflow: Workflow = {
        id: 'empty',
        name: 'Empty',
        nodes: [],
        connections: {},
      };

      const result = WorkflowParser.validate(emptyWorkflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow must have at least one node');
    });

    it('should detect workflow without start node', () => {
      const noStartWorkflow: Workflow = {
        id: 'no-start',
        name: 'No Start',
        nodes: [
          {
            id: 'http',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 1,
            position: [0, 0],
            parameters: {},
          },
        ],
        connections: {},
      };

      const result = WorkflowParser.validate(noStartWorkflow);

      // Single node is both start and end
      expect(result.valid).toBe(true);
    });

    it('should detect disconnected nodes', () => {
      const disconnectedWorkflow: Workflow = {
        id: 'disconnected',
        name: 'Disconnected',
        nodes: [
          {
            id: 'start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [0, 0],
            parameters: {},
          },
          {
            id: 'orphan',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 1,
            position: [0, 200],
            parameters: {},
          },
        ],
        connections: {},
      };

      const result = WorkflowParser.validate(disconnectedWorkflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Disconnected nodes'))).toBe(true);
    });

    it('should detect invalid connections', () => {
      const invalidWorkflow: Workflow = {
        id: 'invalid',
        name: 'Invalid',
        nodes: [
          {
            id: 'start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [0, 0],
            parameters: {},
          },
        ],
        connections: {
          start: {
            main: [[{ node: 'non-existent', type: 'main', index: 0 }]],
          },
        },
      };

      const result = WorkflowParser.validate(invalidWorkflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('target node not found'))).toBe(true);
    });
  });
});
