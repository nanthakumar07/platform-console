import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Workflow } from './Workflow';

export enum ActionType {
  FIELD_UPDATE = 'FIELD_UPDATE',
  EMAIL = 'EMAIL',
  HTTP_CALL = 'HTTP_CALL',
  CREATE_RECORD = 'CREATE_RECORD',
  UPDATE_RECORD = 'UPDATE_RECORD',
  DELETE_RECORD = 'DELETE_RECORD',
  APPROVAL = 'APPROVAL',
  NOTIFICATION = 'NOTIFICATION',
  SCRIPT = 'SCRIPT',
  WEBHOOK = 'WEBHOOK',
}

export enum ActionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

@Entity('workflow_actions')
export class Action {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ActionType })
  type: ActionType;

  @Column({ type: 'jsonb' })
  config: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  errorHandling: {
    retryCount?: number;
    retryDelay?: number;
    fallbackAction?: string;
    continueOnError?: boolean;
  };

  @Column({ type: 'jsonb', nullable: true })
  conditions: {
    field: string;
    operator: string;
    value: any;
  }[];

  @Column({ type: 'varchar', length: 255 })
  tenantId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Workflow, workflow => workflow.actions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workflowId' })
  workflow: Workflow;

  @Column({ type: 'uuid' })
  workflowId: string;
}
