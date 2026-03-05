import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { MetaField } from './MetaField';
import { MetaRelation } from './MetaRelation';
import { MetaLayout } from './MetaLayout';
import { MetaWorkflow } from './MetaWorkflow';

@Entity('meta_objects')
@Index(['tenantId', 'apiName'], { unique: true })
export class MetaObject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'varchar', name: 'api_name' })
  apiName: string;

  @Column({ type: 'varchar' })
  label: string;

  @Column({ type: 'varchar', name: 'plural_label' })
  pluralLabel: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', name: 'is_deleted', default: false })
  isDeleted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToMany(() => MetaField, field => field.object)
  fields: MetaField[];

  @OneToMany(() => MetaRelation, relation => relation.parentObject)
  parentRelations: MetaRelation[];

  @OneToMany(() => MetaRelation, relation => relation.childObject)
  childRelations: MetaRelation[];

  @OneToMany(() => MetaLayout, layout => layout.object)
  layouts: MetaLayout[];

  @OneToMany(() => MetaWorkflow, workflow => workflow.object)
  workflows: MetaWorkflow[];
}
