import { Body, Controller, InternalServerErrorException, Post } from '@nestjs/common';
import { SwapDto } from './swap.dto';
import { SwapService } from './swap.service';
import { SwapResponseDto } from './swap-response.dto';

@Controller('swap')
export class SwapController {
  constructor(
    private readonly swapService: SwapService
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
}
