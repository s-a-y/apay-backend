import {Entity, Column, PrimaryGeneratedColumn, Generated, CreateDateColumn} from 'typeorm';
import {SupportedCurrency} from "../../app.enums";
import BigNumber from "bignumber.js";
import {BigNumberToStringTransformer} from "../../app.transformers";

@Entity()
export class RateHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Generated('increment')
  cursor: number;

  @Column()
  currency: SupportedCurrency;

  @Column({
    type: 'decimal',
    precision: 20,
    scale: 10,
    transformer: new BigNumberToStringTransformer(),
  })
  rate: BigNumber;

  @Column({type: "timestamp"})
  at: Date;

  @CreateDateColumn()
  createdAt: Date;
}
