import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppDataSource } from '../config/database';
import { MetaField } from '../entities/MetaField';

export class MetaFieldController {
  private repository = AppDataSource.getRepository(MetaField);

  routes = async (fastify: FastifyInstance) => {
    fastify.post('/', this.createField.bind(this));
    fastify.get('/:id', this.getField.bind(this));
    fastify.get('/', this.listFields.bind(this));
    fastify.patch('/:id', this.updateField.bind(this));
    fastify.delete('/:id', this.deleteField.bind(this));
  };

  private async createField(request: FastifyRequest, reply: FastifyReply) {
    try {
      const fieldData = request.body as Partial<MetaField>;
      
      // Get tenant ID from authenticated user or use default for testing
      const tenantId = (request as any).user?.tenantId || 'demo';
      
      const metaField = this.repository.create({
        ...fieldData,
        tenantId
      });
      const savedField = await this.repository.save(metaField);

      return reply.status(201).send(savedField);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async getField(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      const metaField = await this.repository.findOne({
        where: { id, isDeleted: false },
        relations: ['object']
      });

      if (!metaField) {
        return reply.status(404).send({ error: 'Field not found' });
      }

      return reply.send(metaField);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async listFields(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { objectId, tenantId } = request.query as { objectId?: string; tenantId?: string };

      const where: any = { isDeleted: false };
      if (objectId) where.objectId = objectId;
      if (tenantId) where.tenantId = tenantId;

      const fields = await this.repository.find({
        where,
        relations: ['object'],
        order: { createdAt: 'ASC' }
      });

      return reply.send({ fields });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async updateField(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const updateData = request.body as Partial<MetaField>;

      const metaField = await this.repository.findOne({
        where: { id, isDeleted: false }
      });

      if (!metaField) {
        return reply.status(404).send({ error: 'Field not found' });
      }

      Object.assign(metaField, updateData);
      const updatedField = await this.repository.save(metaField);

      return reply.send(updatedField);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async deleteField(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      const metaField = await this.repository.findOne({
        where: { id, isDeleted: false }
      });

      if (!metaField) {
        return reply.status(404).send({ error: 'Field not found' });
      }

      metaField.isDeleted = true;
      await this.repository.save(metaField);

      return reply.status(204).send();
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }
}
