import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WorkflowEngine } from '../core/WorkflowEngine';
import { ZodType, z } from 'zod';

// Schema definitions
const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  apiName: z.string().min(1).max(255),
  triggerType: z.enum(['ON_CREATE', 'ON_UPDATE', 'ON_DELETE', 'SCHEDULED', 'WEBHOOK', 'MANUAL']),
  schedule: z.string().optional(),
  config: z.record(z.any()).optional(),
  tenantId: z.string().min(1),
});

const UpdateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  schedule: z.string().optional(),
  config: z.record(z.any()).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT']).optional(),
});

const TriggerWorkflowSchema = z.object({
  workflowId: z.string().uuid(),
  eventData: z.record(z.any()),
  context: z.record(z.any()).optional(),
});

export async function WorkflowRoutes(
  fastify: FastifyInstance,
  options: { workflowEngine: WorkflowEngine }
) {
  const { workflowEngine } = options;

  // Get all workflows
  fastify.get('/workflows', {
    schema: {
      description: 'Get all workflows',
      tags: ['workflows'],
      querystring: {
        type: 'object',
        properties: {
          tenantId: { type: 'string' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DRAFT'] },
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20 },
        },
        required: [],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            workflows: { type: 'array' },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
              },
              required: ['page', 'limit', 'total', 'totalPages'],
            },
          },
          required: ['workflows', 'pagination'],
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // TODO: Implement workflow listing with pagination
    return {
      workflows: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    };
  });

  // Get workflow by ID
  fastify.get('/workflows/:id', {
    schema: {
      description: 'Get workflow by ID',
      tags: ['workflows'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            workflow: { type: 'object' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    
    // TODO: Implement workflow retrieval
    return { workflow: { id } };
  });

  // Create workflow
  fastify.post('/workflows', {
    schema: {
      description: 'Create a new workflow',
      tags: ['workflows'],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
          apiName: { type: 'string', minLength: 1, maxLength: 255 },
          triggerType: { type: 'string', enum: ['ON_CREATE', 'ON_UPDATE', 'ON_DELETE', 'SCHEDULED', 'WEBHOOK', 'MANUAL'] },
          schedule: { type: 'string' },
          config: { type: 'object' },
          tenantId: { type: 'string', minLength: 1 },
        },
        required: ['name', 'apiName', 'triggerType', 'tenantId'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            workflow: { type: 'object' },
          },
          required: ['workflow'],
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const workflowData = CreateWorkflowSchema.parse(request.body);
    
    // TODO: Implement workflow creation
    const workflow = {
      id: 'new-workflow-id',
      ...workflowData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    reply.code(201);
    return { workflow };
  });

  // Update workflow
  fastify.put('/workflows/:id', {
    schema: {
      description: 'Update workflow',
      tags: ['workflows'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
          schedule: { type: 'string' },
          config: { type: 'object' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DRAFT'] },
        },
        required: [],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            workflow: { type: 'object' },
          },
          required: ['workflow'],
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const updateData = UpdateWorkflowSchema.parse(request.body);
    
    // TODO: Implement workflow update
    const workflow = {
      id,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    return { workflow };
  });

  // Delete workflow
  fastify.delete('/workflows/:id', {
    schema: {
      description: 'Delete workflow',
      tags: ['workflows'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    
    // TODO: Implement workflow deletion
    return {
      success: true,
      message: `Workflow ${id} deleted successfully`,
    };
  });

  // Trigger workflow manually
  fastify.post('/workflows/:id/trigger', {
    schema: {
      description: 'Trigger workflow execution',
      tags: ['workflows'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          workflowId: { type: 'string', format: 'uuid' },
          eventData: { type: 'object' },
          context: { type: 'object' },
        },
        required: ['workflowId', 'eventData'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            executionId: { type: 'string' },
            status: { type: 'string' },
            message: { type: 'string' },
          },
          required: ['executionId', 'status', 'message'],
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const triggerData = TriggerWorkflowSchema.parse(request.body);
    
    // TODO: Implement manual workflow trigger
    const executionId = `exec-${Date.now()}`;
    
    return {
      executionId,
      status: 'TRIGGERED',
      message: `Workflow ${id} triggered successfully`,
    };
  });

  // Get workflow executions
  fastify.get('/workflows/:id/executions', {
    schema: {
      description: 'Get workflow execution history',
      tags: ['executions'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20 },
          status: { 
            type: 'string', 
            enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'SKIPPED'] 
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            executions: { type: 'array' },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const query = request.query as any;
    
    // TODO: Implement execution history retrieval
    return {
      executions: [],
      pagination: {
        page: query.page || 1,
        limit: query.limit || 20,
        total: 0,
        totalPages: 0,
      },
    };
  });

  // Get workflow execution details
  fastify.get('/executions/:id', {
    schema: {
      description: 'Get workflow execution details',
      tags: ['executions'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            execution: { type: 'object' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    
    // TODO: Implement execution details retrieval
    return { execution: { id } };
  });

  // Retry failed execution
  fastify.post('/executions/:id/retry', {
    schema: {
      description: 'Retry failed workflow execution',
      tags: ['executions'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            executionId: { type: 'string' },
            status: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    
    // TODO: Implement execution retry
    return {
      executionId: id,
      status: 'RETRIED',
      message: `Execution ${id} retried successfully`,
    };
  });

  // Cancel running execution
  fastify.post('/executions/:id/cancel', {
    schema: {
      description: 'Cancel running workflow execution',
      tags: ['executions'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            executionId: { type: 'string' },
            status: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    
    // TODO: Implement execution cancellation
    return {
      executionId: id,
      status: 'CANCELLED',
      message: `Execution ${id} cancelled successfully`,
    };
  });
}
