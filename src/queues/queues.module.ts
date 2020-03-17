import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';

const BullQueueModule = BullModule.registerQueueAsync(
  {
    name: 'JobQueue',
    inject: [ConfigService],
    useFactory: (config: ConfigService) => config.get('redis'),
    imports: [ConfigService],
  },
  {
    name: 'txs',
    inject: [ConfigService],
    useFactory: (config: ConfigService) => config.get('redis'),
    imports: [ConfigService],
  }
);

@Module({
  imports: [
    BullQueueModule,
  ],
  exports: [
    BullQueueModule,
  ],
  providers: [
  ],
})
export class QueuesModule {}
