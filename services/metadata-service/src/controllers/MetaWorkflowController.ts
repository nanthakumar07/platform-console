import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppDataSource } from '../config/database';
import { MetaWorkflow } from '../entities/MetaWorkflow';

export class MetaWorkflowController {
  private repository = AppDataSource.getRepository(MetaWorkflow);

  routes = async (fastify: FastifyInstance) => {
    fastify.post('/', this.createWorkflow.bind(this));
    fastify.get('/:id', this.getWorkflow.bind(this));
    fastify.get('/', this.listWorkflows.bind(this));
    fastify.patch('/:id', this.updateWorkflow.bind(this));
    fastify.delete('/:id', this.deleteWorkflow.bind(this));
  };

  private async createWorkflow(request: FastifyRequest, reply: FastifyReply) {
    try {
      const workflowData = request.body as Partial<MetaWorkflow>;
      
      const metaWorkflow = this.repository.create(workflowData);
      const savedWorkflow = await this.repository.save(metaWorkflow);

      return reply.status(201).send(savedWorkflow);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async getWorkflow(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      const metaWorkflow = await this.repository.findOne({
        where: { id },
        relations: ['object']
      });

      if (!metaWorkflow) {
        return reply.status(404).send({ error: 'Workflow not found' });
      }

      return reply.send(metaWorkflow);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async listWorkflows(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { tenantId, objectId, isActive } = request.query as { 
        tenantId?: string; 
        objectId?: string; 
        isActive?: string;
      };

      const where: any = {};
      if (tenantId) where.tenantId = tenantId;
      if (objectId) where.objectId = objectId;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const workflows = await this.repository.find({
        where,
        relations: ['object'],
        order: { createdAt: 'ASC' }
      });

      return reply.send({ workflows });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async updateWorkflow(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const updateData = request.body as Partial<MetaWorkflow>;

      const metaWorkflow = await this.repository.findOne({
        where: { id }
      });

      if (!metaWorkflow) {
        return reply.status(404).send({ error: 'Workflow not found' });
      }

      Object.assign(metaWorkflow, updateData);
      const updatedWorkflow = await this.repository.save(metaWorkflow);

      return reply.send(updatedWorkflow);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async deleteWorkflow(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      const metaWorkflow = await this.repository.findOne({
        where: { id }
      });

      if (!metaWorkflow) {
        return reply.status(404).send({ error: 'Workflow not found' });
      }

      await this.repository.remove(metaWorkflow);

      return reply.status(204).send();
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }
}
