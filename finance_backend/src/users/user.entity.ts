import { Entity, PrimaryColumn, Column, CreateDateColumn} from 'typeorm';

@Entity()
export class User {
  @PrimaryColumn()
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true }) 
  password?: string;

  @Column({ default: false })
  isGoogleAccount: boolean;

  @Column({ nullable: true })
  googleId?: string;

  @Column({
    type: 'varchar', 
    length: 255,
    nullable: false, 
    default: '/assets/img/avatar.png' 
  })
  avatar_url: string;

  @Column({ type: 'text', nullable: true }) 
  bio?: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)' })
  public createdAt?: Date;
}
