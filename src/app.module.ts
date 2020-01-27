import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import {StellarService} from "./stellar.service";
import {ConfigModule, ConfigService} from "@nestjs/config";
import configuration from './config/configuration';
import {TypeOrmModule} from "@nestjs/typeorm";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration]
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => config.get('database'),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [StellarService],
})
export class AppModule {}
