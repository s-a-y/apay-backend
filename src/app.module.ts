import {HttpModule, Module} from '@nestjs/common';
import { AppController } from './app.controller';
import {StellarService} from "./stellar.service";
import {ConfigModule, ConfigService} from "@nestjs/config";
import configuration from './config/configuration';
import {TypeOrmModule} from "@nestjs/typeorm";
import {RatesLog} from "./entities/rates_log.entity";
import {RatesService} from "./rates.service";

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration]
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const cfg = config.get('database');
        cfg.entities = [RatesLog];
        return cfg;
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [StellarService, RatesService],
})
export class AppModule {}
