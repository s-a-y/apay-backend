import {Entity, Column, PrimaryGeneratedColumn, Generated, Unique} from 'typeorm';
import BigNumber from "bignumber.js";
import {BigNumberToStringTransformer} from "../app.transformers";

@Entity()
@Unique('UQ_accountId_asset_date',['accountId', 'asset', 'date'])
export class DailyBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Generated('increment')
  cursor: number;

  @Column({nullable: false})
  accountId: string;

  @Column()
  asset: string;

  @Column({
    type: 'decimal',
    precision: 20,
    scale: 10,
    transformer: new BigNumberToStringTransformer(),
  })
  amount: BigNumber;

  @Column()
  date: string;
}
