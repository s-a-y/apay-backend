import { HttpService, Injectable } from '@nestjs/common';
import {getRepository, Repository, SelectQueryBuilder} from "typeorm";
import {InjectRepository} from "@nestjs/typeorm";
import { ConfigService } from '@nestjs/config';
import { MyLoggerService } from '../my-logger.service';
import { Tx } from './tx.entity';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { StellarService } from '../stellar.service';

@Injectable()
export class TxService {
  private readonly logger = new MyLoggerService(TxService.name);
  constructor(
    @InjectRepository(Tx)
    protected readonly repo: Repository<Tx>,
    private readonly config: ConfigService,
    @InjectQueue('txs') readonly queue: Queue,
    private readonly stellarService: StellarService,
  ) {
  }

  save(entity: Tx): Promise<Tx> {
    return this.repo.save(entity);
  }

  find(id: number): Promise<Tx> {
    return this.repo.findOne(id);
  }

  enqueue(tx: Tx) {
    return this.queue.add(tx.id, {
      attempts: 1,
    });
  }
}
