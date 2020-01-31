import {HttpService, Injectable} from '@nestjs/common';
import {ConfigService} from "@nestjs/config";
import {RatesLog} from "./entities/rates_log.entity";
import {getRepository, Repository, SelectQueryBuilder} from "typeorm";
import {AbstractService} from "./abstract.service";
import {GetRatesLogDto} from "./dto/get_rates_log.dto";
import {Rates, RatesContainer} from "./app.interfaces";

@Injectable()
export class RatesService extends AbstractService<GetRatesLogDto, RatesLog, RatesContainer> {
  protected entitiesRepository: Repository<RatesLog>;
  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  getItemsBuilder(input: GetRatesLogDto, repository?: Repository<RatesLog>): SelectQueryBuilder<any> {
    return (repository || getRepository(RatesLog)).createQueryBuilder('rates_log').where('true');
  }

  async mapPagedItems(log: RatesLog) {
    const rates: Rates = {};
    log.data.forEach((rawRates)=> {
      rates[rawRates.currency] = rawRates.rate;
    });
    return await Promise.resolve({rates, fetchedAt: log.createdAt, at: log.data[0].timestamp} as RatesContainer);
  }

  async fetchRates() {
    const rates = await this.fetchFromNomics();
    return await this.insertRatesLog(rates);
  }

  private async fetchFromNomics() {
    const response = await this.http.get(
      'https://api.nomics.com/v1/exchange-rates',
      {
        params: {key: this.configService.get('nomicsApiKey')}
      },
    ).toPromise();

    return response.data;
  }

  private async insertRatesLog(rates) {
    const log = new RatesLog();
    log.at = rates[0].timestamp;
    log.data = rates;
    return await getRepository(RatesLog).save(log);
  }
}
