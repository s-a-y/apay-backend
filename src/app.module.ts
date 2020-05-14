import {HttpModule, Module} from '@nestjs/common';
import {StellarService} from './stellar.service';
import {ConfigModule, ConfigService} from '@nestjs/config';
import configuration from './config/configuration';
import {TypeOrmModule} from '@nestjs/typeorm';
import { SwapModule } from './swap/swap.module';
import { QueuesModule } from './queues/queues.module';
import { TxsProcessor } from './swap/txs.processor';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => config.get('database'),
      inject: [ConfigService],
    }),
    QueuesModule,
    SwapModule,
  ],
  controllers: [
  ],
  providers: [
    ConfigService,
    StellarService,
    TxsProcessor,
  ],
})
export class AppModule {}
