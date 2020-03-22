import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Generated,
  CreateDateColumn,
  UpdateDateColumn,
  Unique
} from 'typeorm';
import {BalanceFetcherDetails} from "../app.interfaces";

@Entity()
@Unique('UQ_address', ['address'])
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Generated('increment')
  cursor: number;

  @Column()
  address: string;

  @Column({ type: 'json', default: {}})
  balanceFetcherDetails: BalanceFetcherDetails;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
