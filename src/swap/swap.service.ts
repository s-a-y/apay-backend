import { HttpService, Injectable } from '@nestjs/common';
import {getRepository, Repository, SelectQueryBuilder} from 'typeorm';
import {InjectRepository} from '@nestjs/typeorm';
import { Swap } from './swap.entity';
import { SwapDto } from './swap.dto';
import { ConfigService } from '@nestjs/config';
import { MyLoggerService } from '../my-logger.service';
import { BigNumber } from 'bignumber.js';

@Injectable()
export class SwapService {
  private readonly logger = new MyLoggerService(SwapService.name);
  constructor(
    @InjectRepository(Swap)
    protected readonly repo: Repository<Swap>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
  }

  get(id: string) {
    return this.repo.findOne(id);
  }

  async getOrCreate(dto: SwapDto): Promise<Swap> {
    const swap = await this.repo.findOne(dto);
    if (swap) {
      return swap;
    } else {
      const newSwap = this.repo.create();
      newSwap.addressOut = dto.addressOut;
      newSwap.addressOutExtra = dto.addressOutExtra;
      newSwap.currencyIn = dto.currencyIn;
      newSwap.currencyOut = dto.currencyOut;
      newSwap.account = dto.account;
      newSwap.amountIn = new BigNumber(dto.amountIn);
      newSwap.amountOut = new BigNumber(dto.amountOut);
      newSwap.userInput = dto.userInput;
      newSwap.referral = dto.ref;
      const saved = await this.repo.save(newSwap);
      if (['XLM', 'XDR'].includes(dto.currencyIn)) {
        saved.addressIn = this.config.get('swapAccount');
      } else {
        const response = await this.http.post(this.config.get('apayBaseUrl')
          + '/transactions/deposit/non-interactive', {
          asset_code: saved.currencyIn,
          account: this.config.get('swapAccount'),
          memo_type: 'id',
          memo: saved.id,
        }).toPromise();
        saved.addressIn = response.data.how;
      }
      return this.repo.save(saved);
    }
  }
}
