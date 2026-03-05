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

export enum RelationType {
  LOOKUP = 'LOOKUP',
  MASTER_DETAIL = 'MASTER_DETAIL',
  M2M = 'M2M',
}

@Entity('meta_relations')
@Index(['tenantId', 'parentObjectId', 'childObjectId'], { unique: true })
export class MetaRelation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'parent_object_id' })
  parentObjectId: string;

  @Column({ type: 'varchar', name: 'child_object_id' })
  childObjectId: string;

  @Column({ type: 'varchar', name: 'tenant_id' })
  tenantId: string;

  @Column({
    type: 'enum',
    enum: RelationType,
  })
  relationType: RelationType;

  @Column({ type: 'varchar', name: 'field_name' })
  fieldName: string;

  @Column({ type: 'varchar', name: 'related_field_name', nullable: true })
  relatedFieldName?: string;

  @Column({ type: 'boolean', name: 'cascade_delete', default: false })
  cascadeDelete: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => MetaObject, object => object.parentRelations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_object_id' })
  parentObject: MetaObject;

  @ManyToOne(() => MetaObject, object => object.childRelations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_object_id' })
  childObject: MetaObject;
}
