import {Entity, Column, PrimaryGeneratedColumn, Generated, CreateDateColumn} from 'typeorm';
import {RatesLogData} from "../../app.interfaces";

@Entity()
export class RatesLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Generated('increment')
  cursor: number;

  @Column({ type: 'json', default: []})
  data: RatesLogData[];

  @Column({type: "timestamp"})
  at: Date;

  @Column({ length: 24, default: '0'.repeat(10) })
  atCursor: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ length: 24, default: '0'.repeat(10) })
  createdAtCursor: string;
}
