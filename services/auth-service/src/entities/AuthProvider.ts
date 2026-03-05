import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('auth_providers')
export class AuthProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: ['oauth2', 'saml', 'ldap', 'local'],
    default: 'local'
  })
  type: 'oauth2' | 'saml' | 'ldap' | 'local';

  @Column({ type: 'jsonb' })
  config: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
