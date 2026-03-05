import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppDataSource } from '../config/database';
import { MetaPage } from '../entities/MetaPage';

export class MetaPageController {
  private repository = AppDataSource.getRepository(MetaPage);

  routes = async (fastify: FastifyInstance) => {
    fastify.post('/', this.createPage.bind(this));
    fastify.get('/:id', this.getPage.bind(this));
    fastify.get('/', this.listPages.bind(this));
    fastify.patch('/:id', this.updatePage.bind(this));
    fastify.delete('/:id', this.deletePage.bind(this));
  };

  private async createPage(request: FastifyRequest, reply: FastifyReply) {
    try {
      const pageData = request.body as Partial<MetaPage>;
      
      const metaPage = this.repository.create(pageData);
      const savedPage = await this.repository.save(metaPage);

      return reply.status(201).send(savedPage);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async getPage(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      const metaPage = await this.repository.findOne({
        where: { id, isActive: true }
      });

      if (!metaPage) {
        return reply.status(404).send({ error: 'Page not found' });
      }

      return reply.send(metaPage);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async listPages(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { tenantId } = request.query as { tenantId?: string };

      const where: any = { isActive: true };
      if (tenantId) where.tenantId = tenantId;

      const pages = await this.repository.find({
        where,
        order: { createdAt: 'ASC' }
      });

      return reply.send({ pages });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async updatePage(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const updateData = request.body as Partial<MetaPage>;

      const metaPage = await this.repository.findOne({
        where: { id }
      });

      if (!metaPage) {
        return reply.status(404).send({ error: 'Page not found' });
      }

      Object.assign(metaPage, updateData);
      const updatedPage = await this.repository.save(metaPage);

      return reply.send(updatedPage);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async deletePage(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      const metaPage = await this.repository.findOne({
        where: { id }
      });

      if (!metaPage) {
        return reply.status(404).send({ error: 'Page not found' });
      }

      metaPage.isActive = false;
      await this.repository.save(metaPage);

      return reply.status(204).send();
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }
}
