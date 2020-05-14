import { HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {RatesLog} from "./entities/rates-log.entity";
import {RatesController} from "./rates.controller";
import {RatesService} from "./rates.service";

@Module({
  controllers: [
    RatesController,
  ],
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      RatesLog,
    ]),
  ],
  exports: [
    RatesService,
  ],
  providers: [
    RatesService,
  ],
})
export class RatesModule {}
