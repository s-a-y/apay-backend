import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Generated, ManyToOne, Unique } from 'typeorm';
import { Swap } from './swap.entity';
import { BigNumber } from 'bignumber.js';
import { BigNumberToStringTransformer } from '../app.transformers';

@Entity()
@Unique(['txIn', 'txInIndex'])
@Unique(['channel', 'sequence'])
export class Tx {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  @CreateDateColumn()
  createdAt?: Date;

  @Column({
    length: 255,
    nullable: false,
  })
  currencyIn: string;

  @Column({
    length: 255,
    nullable: false,
  })
  currencyOut: string;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 12,
    transformer: new BigNumberToStringTransformer(),
    nullable: false,
  })
  amountIn: BigNumber;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 12,
    transformer: new BigNumberToStringTransformer(),
    nullable: true,
  })
  amountFee?: BigNumber;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 12,
    transformer: new BigNumberToStringTransformer(),
    nullable: true,
  })
  amountOut?: BigNumber;

  @Column({length: 255, nullable: false})
  txIn: string;

  @Column({nullable: true})
  txInIndex: number;

  @Column({length: 255, nullable: true})
  txOut?: string; // can be updated once

  @Column({
    length: 255,
    nullable: true,
  })
  channel?: string;

  @Column({
    length: 255,
    nullable: true,
  })
  sequence?: string;

  @ManyToOne(type => Swap, swap => swap.txs, {
    eager: true, persistence: true,
  })
  swap: Swap;
}
