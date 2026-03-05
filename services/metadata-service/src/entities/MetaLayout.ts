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

export enum LayoutType {
  FORM = 'FORM',
  LIST = 'LIST',
  DETAIL = 'DETAIL',
}

export interface LayoutSection {
  id: string;
  label: string;
  columns: 1 | 2 | 3;
  components: LayoutComponent[];
  collapsible?: boolean;
  visible?: boolean;
}

export interface LayoutComponent {
  id: string;
  type: 'Field' | 'Section' | 'Button' | 'Chart' | 'List' | 'Text';
  fieldApiName?: string;
  props: Record<string, any>;
  conditionalVisibility?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  };
}

@Entity('meta_layouts')
@Index(['tenantId', 'objectId', 'layoutType'], { unique: true })
export class MetaLayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'object_id' })
  objectId: string;

  @Column({ type: 'varchar', name: 'tenant_id' })
  tenantId: string;

  @Column({
    type: 'enum',
    enum: LayoutType,
  })
  layoutType: LayoutType;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  sections?: LayoutSection[];

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  fields?: string[];

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => MetaObject, object => object.layouts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'object_id' })
  object: MetaObject;
}
