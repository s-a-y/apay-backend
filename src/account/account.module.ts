import { Module } from '@nestjs/common';
import {AccountService} from "./account.service";
import {TypeOrmModule} from "@nestjs/typeorm";
import {Account} from "./account.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Account]),
  ],
  exports: [
    AccountService,
  ],
  providers: [
    AccountService,
  ],
})
export class AccountModule {}
