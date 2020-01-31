import {Entity, Column, PrimaryGeneratedColumn, Generated, CreateDateColumn} from 'typeorm';
import {RatesLogData} from "../app.interfaces";

@Entity()
export class RatesLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Generated('increment')
  cursor: number;

  @Column({ type: 'json' })
  data: RatesLogData[];

  @Column({type: "timestamp"})
  at: Date;

  @CreateDateColumn()
  createdAt: Date;
}
