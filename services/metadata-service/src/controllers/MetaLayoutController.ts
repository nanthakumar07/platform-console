import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppDataSource } from '../config/database';
import { MetaLayout } from '../entities/MetaLayout';

export class MetaLayoutController {
  private repository = AppDataSource.getRepository(MetaLayout);

  routes = async (fastify: FastifyInstance) => {
    fastify.post('/', this.createLayout.bind(this));
    fastify.get('/:id', this.getLayout.bind(this));
    fastify.get('/', this.listLayouts.bind(this));
    fastify.patch('/:id', this.updateLayout.bind(this));
    fastify.delete('/:id', this.deleteLayout.bind(this));
  };

  private async createLayout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const layoutData = request.body as Partial<MetaLayout>;
      
      const metaLayout = this.repository.create(layoutData);
      const savedLayout = await this.repository.save(metaLayout);

      return reply.status(201).send(savedLayout);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async getLayout(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      const metaLayout = await this.repository.findOne({
        where: { id },
        relations: ['object']
      });

      if (!metaLayout) {
        return reply.status(404).send({ error: 'Layout not found' });
      }

      return reply.send(metaLayout);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async listLayouts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { objectId, tenantId, layoutType } = request.query as { 
        objectId?: string; 
        tenantId?: string; 
        layoutType?: string;
      };

      const where: any = { isActive: true };
      if (objectId) where.objectId = objectId;
      if (tenantId) where.tenantId = tenantId;
      if (layoutType) where.layoutType = layoutType;

      const layouts = await this.repository.find({
        where,
        relations: ['object'],
        order: { createdAt: 'ASC' }
      });

      return reply.send({ layouts });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async updateLayout(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const updateData = request.body as Partial<MetaLayout>;

      const metaLayout = await this.repository.findOne({
        where: { id }
      });

      if (!metaLayout) {
        return reply.status(404).send({ error: 'Layout not found' });
      }

      Object.assign(metaLayout, updateData);
      const updatedLayout = await this.repository.save(metaLayout);

      return reply.send(updatedLayout);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async deleteLayout(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      const metaLayout = await this.repository.findOne({
        where: { id }
      });

      if (!metaLayout) {
        return reply.status(404).send({ error: 'Layout not found' });
      }

      await this.repository.remove(metaLayout);

      return reply.status(204).send();
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }
}
