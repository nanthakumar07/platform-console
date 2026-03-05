import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export interface PageComponent {
  id: string;
  type: 'Field' | 'Section' | 'Button' | 'Chart' | 'List' | 'Text' | 'Form' | 'Navigation';
  props: Record<string, any>;
  conditionalVisibility?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  };
}

export interface NavigationItem {
  id: string;
  label: string;
  apiName?: string;
  icon?: string;
  order: number;
  parentId?: string;
  isVisible: boolean;
}

@Entity('meta_pages')
@Index(['tenantId', 'apiName'], { unique: true })
export class MetaPage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'varchar', name: 'api_name' })
  apiName: string;

  @Column({ type: 'varchar' })
  label: string;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  components?: PageComponent[];

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  navigation?: NavigationItem[];

  @Column({
    type: 'text',
    array: true,
    nullable: true,
  })
  permissions?: string[];

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
