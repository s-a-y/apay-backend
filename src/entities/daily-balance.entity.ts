import {Entity, Column, PrimaryGeneratedColumn, Generated, Unique, CreateDateColumn} from 'typeorm';
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

  @Column({type: "date"})
  date: Date;

  @Column({ length: 24, default: '0'.repeat(10) })
  dateCursor: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ length: 24, default: '0'.repeat(10) })
  createdAtCursor: string;
}
