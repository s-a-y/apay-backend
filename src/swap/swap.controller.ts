import { Body, Controller, InternalServerErrorException, Post } from '@nestjs/common';
import { SwapDto } from './swap.dto';
import { SwapService } from './swap.service';
import { SwapResponseDto } from './swap-response.dto';
import { TxService } from './tx.service';
import { StellarService } from '../stellar.service';
import * as StellarSdk from 'stellar-sdk';
import { Asset } from 'stellar-sdk';
import { ConfigService } from '@nestjs/config';

@Controller('swap')
export class SwapController {
  constructor(
    private readonly configService: ConfigService,
    private readonly swapService: SwapService,
    private readonly txService: TxService,
    private readonly stellarService: StellarService,
  ) {
  }

  @Post()
  async swap(@Body() dto: SwapDto): Promise<SwapResponseDto> {
    const swap = await this.swapService.getOrCreate(dto);
    if (!swap.addressIn) {
      throw new InternalServerErrorException('Unable to generate deposit address');
    }
    return {
      ...dto,
      id: swap.uuid,
      addressIn: swap.addressIn,
      addressInExtra: (['XLM', 'XDR'].includes(dto.currencyIn) ? swap.id.toString() : null),
    } as SwapResponseDto;
  }

  @Post('retry')
  async retry(@Body() dto): Promise<any> {
    return this.txService.enqueue(dto);
  }

  @Post('refund')
  async refund(@Body() dto): Promise<any> {
    const tx = await this.txService.find(dto.id);
    if (tx) {
      const currencyInIssuer = this.configService.get('stellar').knownIssuers[tx.currencyIn];
      const sourceKeypair = StellarSdk.Keypair.fromSecret(this.configService.get('swapAccountSecret'));
      return this.stellarService.buildAndSubmitTx(process.env[`STELLAR_SECRET_${tx.channel}`], [
        StellarSdk.Operation.payment({
          destination: tx.addressFrom,
          asset: new Asset(tx.currencyIn, currencyInIssuer),
          amount: tx.amountIn.toFixed(7),
          source: tx.swap.addressIn,
        }),
      ], {
        memo: StellarSdk.Memo.return(tx.txIn),
        sequence: tx.sequence,
        secretKeys: [sourceKeypair.secret()],
      });
    }
  }
}
