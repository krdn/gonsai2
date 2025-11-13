/**
 * Swagger/OpenAPI Configuration
 *
 * @description API 문서화를 위한 Swagger 설정
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gonsai2 API Documentation',
      version: '1.0.0',
      description: 'AI-Optimized n8n Integration Platform API',
      contact: {
        name: 'API Support',
        email: 'support@gonsai2.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'http://192.168.0.50:3000',
        description: 'Local network server',
      },
      {
        url: 'https://api.gonsai2.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              description: 'Error message',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email',
            },
            name: {
              type: 'string',
              description: 'User name',
            },
            role: {
              type: 'string',
              enum: ['admin', 'user'],
              description: 'User role',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Workflow: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Workflow ID',
            },
            name: {
              type: 'string',
              description: 'Workflow name',
            },
            description: {
              type: 'string',
              description: 'Workflow description',
            },
            n8nWorkflowId: {
              type: 'string',
              description: 'n8n workflow ID',
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'error'],
            },
            userId: {
              type: 'string',
              description: 'Owner user ID',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Execution: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Execution ID',
            },
            workflowId: {
              type: 'string',
              description: 'Workflow ID',
            },
            n8nExecutionId: {
              type: 'string',
              description: 'n8n execution ID',
            },
            status: {
              type: 'string',
              enum: ['new', 'running', 'success', 'error', 'waiting'],
            },
            mode: {
              type: 'string',
              enum: ['manual', 'trigger', 'webhook'],
            },
            startedAt: {
              type: 'string',
              format: 'date-time',
            },
            finishedAt: {
              type: 'string',
              format: 'date-time',
            },
            retryOf: {
              type: 'string',
              description: 'Original execution ID if this is a retry',
            },
            data: {
              type: 'object',
              description: 'Execution data',
            },
          },
        },
      },
      parameters: {
        limitParam: {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
          description: 'Number of items to return',
        },
        offsetParam: {
          in: 'query',
          name: 'offset',
          schema: {
            type: 'integer',
            minimum: 0,
            default: 0,
          },
          description: 'Number of items to skip',
        },
        sortParam: {
          in: 'query',
          name: 'sort',
          schema: {
            type: 'string',
            default: '-createdAt',
          },
          description: 'Sort field and order (e.g., -createdAt for descending)',
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication information is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        NotFoundError: {
          description: 'The requested resource was not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Authentication endpoints',
      },
      {
        name: 'Users',
        description: 'User management endpoints',
      },
      {
        name: 'Workflows',
        description: 'Workflow management endpoints',
      },
      {
        name: 'Executions',
        description: 'Workflow execution endpoints',
      },
      {
        name: 'Webhooks',
        description: 'Webhook endpoints',
      },
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/routes/*.js',
    './apps/backend/src/routes/*.ts', // For monorepo structure
    './apps/backend/src/routes/*.js',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
