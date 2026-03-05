import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppDataSource } from '../config/database';
import { MetaObject } from '../entities/MetaObject';
import { MetaField } from '../entities/MetaField';
import { MetaRelation } from '../entities/MetaRelation';

export class DashboardController {
  private objectRepository = AppDataSource.getRepository(MetaObject);
  private fieldRepository = AppDataSource.getRepository(MetaField);
  private relationRepository = AppDataSource.getRepository(MetaRelation);

  routes = async (fastify: FastifyInstance) => {
    // Get dashboard statistics
    fastify.get('/stats', {
      schema: {
        tags: ['Dashboard'],
        summary: 'Get dashboard statistics',
        response: {
          200: {
            type: 'object',
            properties: {
              totalObjects: { type: 'number' },
              totalFields: { type: 'number' },
              totalRelations: { type: 'number' },
              recentActivity: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    type: { type: 'string', enum: ['object', 'field', 'relation'] },
                    action: { type: 'string', enum: ['created', 'updated', 'deleted'] },
                    name: { type: 'string' },
                    timestamp: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }, this.getDashboardStats.bind(this));
  };

  private async getDashboardStats(request: FastifyRequest<{ Querystring: { tenantId?: string } }>, reply: FastifyReply) {
    try {
      const { tenantId } = request.query;
      
      // Use provided tenantId or default to 'demo' for testing
      const effectiveTenantId = tenantId || 'demo';

      // Get total counts
      const totalObjects = await this.objectRepository.count({
        where: { tenantId: effectiveTenantId, isDeleted: false }
      });

      const totalFields = await this.fieldRepository.count({
        where: { tenantId: effectiveTenantId, isDeleted: false }
      });

      const totalRelations = await this.relationRepository.count({
        where: { tenantId: effectiveTenantId }
      });

      // Get recent activity (last 10 items across all entities)
      const recentObjects = await this.objectRepository.find({
        where: { tenantId: effectiveTenantId, isDeleted: false },
        order: { updatedAt: 'DESC' },
        take: 3
      });

      const recentFields = await this.fieldRepository.find({
        where: { tenantId: effectiveTenantId, isDeleted: false },
        order: { updatedAt: 'DESC' },
        take: 3
      });

      const recentRelations = await this.relationRepository.find({
        where: { tenantId: effectiveTenantId },
        order: { updatedAt: 'DESC' },
        take: 3
      });

      // Combine and format recent activity
      const recentActivity = [
        ...recentObjects.map(obj => ({
          id: obj.id,
          type: 'object' as const,
          action: 'updated' as const,
          name: obj.label,
          timestamp: obj.updatedAt
        })),
        ...recentFields.map(field => ({
          id: field.id,
          type: 'field' as const,
          action: 'updated' as const,
          name: field.label,
          timestamp: field.updatedAt
        })),
        ...recentRelations.map(relation => ({
          id: relation.id,
          type: 'relation' as const,
          action: 'updated' as const,
          name: `${relation.parentObjectId} -> ${relation.childObjectId}`,
          timestamp: relation.updatedAt
        }))
      ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

      return {
        totalObjects,
        totalFields,
        totalRelations,
        recentActivity
      };
    } catch (error) {
      request.server.log.error({ error }, 'Error fetching dashboard stats');
      reply.code(500);
      return { error: 'Internal server error' };
    }
  }
}
