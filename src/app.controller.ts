import { Controller, Get } from '@nestjs/common';
import {StellarService} from "./stellar.service";

@Controller()
export class AppController {
  constructor(private readonly stellarService: StellarService) {}

  @Get()
  getBalances(): string {
    return 'TODO';
  }

  @Get()
  getRates(): string {
    return 'TODO';
  }
}
