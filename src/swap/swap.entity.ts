import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Generated, OneToMany } from 'typeorm';
import { Tx } from './tx.entity';
import { BigNumberToStringTransformer } from '../app.transformers';
import { BigNumber } from 'bignumber.js';

@Entity()
export class Swap {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  @Generated('uuid')
  uuid: string;

  @CreateDateColumn()
  createdAt: Date;

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
    nullable: true,
  })
  amountIn: BigNumber;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 12,
    transformer: new BigNumberToStringTransformer(),
    nullable: true,
  })
  amountOut: BigNumber;

  @Column({
    length: 255,
    nullable: true,
  })
  userInput: string;

  @Column({
    length: 255,
    nullable: true,
  })
  account: string;

  @Column({
    length: 255,
    nullable: true,
  })
  addressIn: string;

  @Column({
    length: 255,
    nullable: false,
  })
  addressOut: string;

  @Column({
    length: 255,
    nullable: true,
  })
  addressOutExtra: string;

  @OneToMany(type => Tx, tx => tx.swap, {
    lazy: true,
  })
  txs: Tx[];
}
