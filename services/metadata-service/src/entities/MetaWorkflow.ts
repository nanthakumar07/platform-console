import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MetaObject } from './MetaObject';

export enum TriggerType {
  RECORD_CREATE = 'RECORD_CREATE',
  RECORD_UPDATE = 'RECORD_UPDATE',
  RECORD_DELETE = 'RECORD_DELETE',
  SCHEDULED = 'SCHEDULED',
  WEBHOOK = 'WEBHOOK',
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'changed';
  value: any;
}

export interface WorkflowAction {
  id: string;
  type: 'FieldUpdate' | 'SendEmail' | 'HttpCall' | 'SubFlow';
  config: Record<string, any>;
  order: number;
}

@Entity('meta_workflows')
@Index(['tenantId', 'objectId', 'triggerType'])
export class MetaWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'object_id', nullable: true })
  objectId?: string;

  @Column({ type: 'varchar', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', name: 'api_name' })
  apiName: string;

  @Column({
    type: 'enum',
    enum: TriggerType,
    enumName: 'trigger_type_enum'
  })
  triggerType: TriggerType;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  triggerConditions?: TriggerCondition[];

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  actions?: WorkflowAction[];

  // @Column({ name: 'cron_expression', nullable: true })
  // cronExpression?: string;

  @Column({
  type: 'text',
  name: 'cron_expression',
  nullable: true,
})
cronExpression!: string;

  @Column({ type: 'boolean', name: 'is_active', default: false })
  isActive: boolean;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => MetaObject, object => object.workflows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'object_id' })
  object?: MetaObject;
}
