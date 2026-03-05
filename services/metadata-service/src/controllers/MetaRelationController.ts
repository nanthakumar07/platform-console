import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppDataSource } from '../config/database';
import { MetaRelation } from '../entities/MetaRelation';

export class MetaRelationController {
  private repository = AppDataSource.getRepository(MetaRelation);

  routes = async (fastify: FastifyInstance) => {
    fastify.post('/', this.createRelation.bind(this));
    fastify.get('/:id', this.getRelation.bind(this));
    fastify.get('/', this.listRelations.bind(this));
    fastify.delete('/:id', this.deleteRelation.bind(this));
  };

  private async createRelation(request: FastifyRequest, reply: FastifyReply) {
    try {
      const relationData = request.body as Partial<MetaRelation>;
      
      const metaRelation = this.repository.create(relationData);
      const savedRelation = await this.repository.save(metaRelation);

      return reply.status(201).send(savedRelation);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async getRelation(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      const metaRelation = await this.repository.findOne({
        where: { id },
        relations: ['parentObject', 'childObject']
      });

      if (!metaRelation) {
        return reply.status(404).send({ error: 'Relation not found' });
      }

      return reply.send(metaRelation);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async listRelations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { tenantId, parentObjectId, childObjectId } = request.query as { 
        tenantId?: string; 
        parentObjectId?: string; 
        childObjectId?: string;
      };

      const where: any = {};
      if (tenantId) where.tenantId = tenantId;
      if (parentObjectId) where.parentObjectId = parentObjectId;
      if (childObjectId) where.childObjectId = childObjectId;

      const relations = await this.repository.find({
        where,
        relations: ['parentObject', 'childObject'],
        order: { createdAt: 'ASC' }
      });

      return reply.send({ relations });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async deleteRelation(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      const metaRelation = await this.repository.findOne({
        where: { id }
      });

      if (!metaRelation) {
        return reply.status(404).send({ error: 'Relation not found' });
      }

      await this.repository.remove(metaRelation);

      return reply.status(204).send();
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }
}
