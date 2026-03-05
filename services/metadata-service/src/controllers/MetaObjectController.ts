import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppDataSource } from '../config/database';
import { MetaObject } from '../entities/MetaObject';
import { IsString, IsOptional } from 'class-validator';
import { validate } from 'class-validator';

class CreateObjectRequest {
  @IsString()
  tenantId!: string;

  @IsString()
  apiName!: string;

  @IsString()
  label!: string;

  @IsString()
  pluralLabel!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class UpdateObjectRequest {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  pluralLabel?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class MetaObjectController {
  private repository = AppDataSource.getRepository(MetaObject);

  routes = async (fastify: FastifyInstance) => {
    // Create object
    fastify.post('/', {
      schema: {
        body: {
          type: 'object',
          required: ['tenantId', 'apiName', 'label', 'pluralLabel'],
          properties: {
            tenantId: { type: 'string' },
            apiName: { type: 'string' },
            label: { type: 'string' },
            pluralLabel: { type: 'string' },
            description: { type: 'string' }
          }
        }
      }
    }, this.createObject.bind(this));

    // Get object by ID
    fastify.get('/:id', {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        }
      }
    }, this.getObject.bind(this));

    // List objects
    fastify.get('/', {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 }
          }
        }
      }
    }, this.listObjects.bind(this));

    // Update object
    fastify.patch('/:id', {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        },
        body: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            pluralLabel: { type: 'string' },
            description: { type: 'string' }
          }
        }
      }
    }, this.updateObject.bind(this));

    // Delete object
    fastify.delete('/:id', {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        }
      }
    }, this.deleteObject.bind(this));
  };

  private async createObject(request: FastifyRequest<{ Body: CreateObjectRequest }>, reply: FastifyReply) {
    try {
      const createRequest = new CreateObjectRequest();
      Object.assign(createRequest, request.body);

      const validationErrors = await validate(createRequest);
      if (validationErrors.length > 0) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validationErrors
        });
      }

      // Check if object with same apiName already exists for this tenant
      const existingObject = await this.repository.findOne({
        where: {
          tenantId: createRequest.tenantId,
          apiName: createRequest.apiName,
          isDeleted: false
        }
      });

      if (existingObject) {
        return reply.status(409).send({
          error: 'Object with this API name already exists for this tenant'
        });
      }

      const metaObject = this.repository.create(createRequest);
      const savedObject = await this.repository.save(metaObject);

      return reply.status(201).send(savedObject);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async getObject(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      const metaObject = await this.repository.findOne({
        where: { id, isDeleted: false },
        relations: ['fields', 'parentRelations', 'childRelations']
      });

      if (!metaObject) {
        return reply.status(404).send({ error: 'Object not found' });
      }

      return reply.send(metaObject);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async listObjects(request: FastifyRequest<{ Querystring: { tenantId?: string; page?: number; limit?: number } }>, reply: FastifyReply) {
    try {
      const { tenantId, page = 1, limit = 20 } = request.query;

      const where: any = { isDeleted: false };
      if (tenantId) {
        where.tenantId = tenantId;
      }

      const [objects, total] = await this.repository.findAndCount({
        where,
        skip: (page - 1) * limit,
        take: limit,
        order: { createdAt: 'DESC' }
      });

      return reply.send({
        objects,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async updateObject(request: FastifyRequest<{ Params: { id: string }; Body: UpdateObjectRequest }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const updateData = request.body;

      const metaObject = await this.repository.findOne({
        where: { id, isDeleted: false }
      });

      if (!metaObject) {
        return reply.status(404).send({ error: 'Object not found' });
      }

      Object.assign(metaObject, updateData);
      const updatedObject = await this.repository.save(metaObject);

      return reply.send(updatedObject);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  private async deleteObject(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      const metaObject = await this.repository.findOne({
        where: { id, isDeleted: false }
      });

      if (!metaObject) {
        return reply.status(404).send({ error: 'Object not found' });
      }

      // Soft delete
      metaObject.isDeleted = true;
      await this.repository.save(metaObject);

      return reply.status(204).send();
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }
}
