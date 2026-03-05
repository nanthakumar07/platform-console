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

export enum DataType {
  TEXT = 'TEXT',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  URL = 'URL',
  NUMBER = 'NUMBER',
  CURRENCY = 'CURRENCY',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  BOOLEAN = 'BOOLEAN',
  PICKLIST = 'PICKLIST',
  LOOKUP = 'LOOKUP',
  FORMULA = 'FORMULA',
}

export interface PicklistValue {
  value: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ValidationRule {
  type: 'required' | 'unique' | 'regex' | 'minLength' | 'maxLength' | 'min' | 'max';
  value?: string | number;
  message?: string;
}

@Entity('meta_fields')
@Index(['tenantId', 'objectId', 'apiName'], { unique: true })
export class MetaField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'object_id' })
  objectId: string;

  @Column({ type: 'varchar', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'varchar', name: 'api_name' })
  apiName: string;

  @Column({ type: 'varchar' })
  label: string;

  @Column({
    type: 'enum',
    enum: DataType,
  })
  dataType: DataType;

  @Column({ type: 'boolean', default: false })
  required: boolean;

  @Column({ type: 'boolean', default: false })
  unique: boolean;

  @Column({ type: 'text', nullable: true })
  defaultValue?: string;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  picklistValues?: PicklistValue[];

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  validationRules?: ValidationRule[];

  @Column({ type: 'boolean', name: 'is_deleted', default: false })
  isDeleted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => MetaObject, object => object.fields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'object_id' })
  object: MetaObject;
}
