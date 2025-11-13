/**
 * Workflow Test Fixtures
 *
 * 테스트용 워크플로우 데이터 팩토리
 */

import { ObjectId } from 'mongodb';

export interface TestWorkflow {
  _id?: ObjectId;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error';
  userId: ObjectId;
  n8nWorkflowId?: string;
  config: any;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 기본 워크플로우 생성
 */
export const createTestWorkflow = (overrides?: Partial<TestWorkflow>): TestWorkflow => {
  return {
    _id: new ObjectId(),
    name: 'Test Workflow',
    description: 'Test workflow description',
    status: 'active',
    userId: new ObjectId(),
    config: {
      nodes: [],
      connections: {},
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

/**
 * 다수의 워크플로우 생성
 */
export const createTestWorkflows = (count: number, userId?: ObjectId): TestWorkflow[] => {
  const workflows: TestWorkflow[] = [];
  const ownerId = userId || new ObjectId();

  for (let i = 0; i < count; i++) {
    workflows.push(
      createTestWorkflow({
        name: `Workflow ${i + 1}`,
        description: `Test workflow ${i + 1} description`,
        userId: ownerId,
      })
    );
  }

  return workflows;
};

/**
 * 에러 상태 워크플로우 생성
 */
export const createErrorWorkflow = (overrides?: Partial<TestWorkflow>): TestWorkflow => {
  return createTestWorkflow({
    name: 'Error Workflow',
    status: 'error',
    ...overrides,
  });
};
