import {Entity, Column, PrimaryGeneratedColumn, Generated, CreateDateColumn} from 'typeorm';
import {SupportedCurrency} from "../app.enums";

@Entity()
export class RateHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Generated('increment')
  cursor: number;

  @Column()
  currency: SupportedCurrency;

  @Column()
  rate: number;

  @Column({type: "timestamp"})
  at: Date;

  @CreateDateColumn()
  createdAt: Date;
}
