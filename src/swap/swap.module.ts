import { HttpModule, Module } from '@nestjs/common';
import { SwapController } from './swap.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Swap } from './swap.entity';
import { SwapService } from './swap.service';
import { Tx } from './tx.entity';
import { TxService } from './tx.service';
import { StellarService } from '../stellar.service';
import { QueuesModule } from '../queues/queues.module';

@Module({
  controllers: [SwapController],
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Swap, Tx]),
    QueuesModule,
  ],
  exports: [
    TxService,
  ],
  providers: [SwapService, TxService, StellarService],
})
export class SwapModule {}
