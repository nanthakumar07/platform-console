import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Trigger } from './Trigger';
import { Action } from './Action';
import { WorkflowExecution } from './WorkflowExecution';

export enum TriggerType {
  ON_CREATE = 'ON_CREATE',
  ON_UPDATE = 'ON_UPDATE',
  ON_DELETE = 'ON_DELETE',
  SCHEDULED = 'SCHEDULED',
  WEBHOOK = 'WEBHOOK',
  MANUAL = 'MANUAL',
}

export enum WorkflowStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
}

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  apiName: string;

  @Column({ type: 'enum', enum: TriggerType })
  triggerType: TriggerType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  schedule: string;

  @Column({ type: 'enum', enum: WorkflowStatus, default: WorkflowStatus.DRAFT })
  status: WorkflowStatus;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>;

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

  @OneToMany(() => Trigger, trigger => trigger.workflow, { cascade: true })
  triggers: Trigger[];

  @OneToMany(() => Action, action => action.workflow, { cascade: true })
  actions: Action[];

  @OneToMany(() => WorkflowExecution, execution => execution.workflow)
  executions: WorkflowExecution[];

  @ManyToOne(() => Workflow, { nullable: true })
  @JoinColumn({ name: 'parentWorkflowId' })
  parentWorkflow: Workflow;

  @Column({ type: 'uuid', nullable: true })
  parentWorkflowId: string;
}
