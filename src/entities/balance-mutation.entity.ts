import {Entity, Column, PrimaryGeneratedColumn, Generated, CreateDateColumn, Index, Unique} from 'typeorm';
import {BalanceMutationType} from "../app.enums";
import BigNumber from "bignumber.js";
import {BigNumberToStringTransformer} from "../app.transformers";

@Entity()
@Unique('UQ_accountId_type_externalId',['accountId', 'type', 'externalId'])
export class BalanceMutation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Generated('increment')
  cursor: number;

  @Column({nullable: false})
  accountId: string;

  @Column({nullable: false})
  externalId: string;

  @Column({nullable: false})
  externalCursor: string;

  @Column()
  asset: string;

  @Column({
    type: 'enum',
    enum: [
      BalanceMutationType.credit,
      BalanceMutationType.debit,
    ],
  })
  type: BalanceMutationType;

  @Column({
    type: 'decimal',
    precision: 20,
    scale: 10,
    transformer: new BigNumberToStringTransformer(),
  })
  amount: BigNumber;

  @Column({type: "timestamp"})
  at: Date;

  @CreateDateColumn()
  createdAt: Date;
}
