import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class News {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  newsid: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column('text', { nullable: true }) 
  content: string | null;

  @Column()
  url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  urlToImage: string | null;

  @Column('json')
  source: object;

  @Column({ type: 'date' })
  date: Date;
}
