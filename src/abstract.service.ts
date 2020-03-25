import { sprintf } from 'sprintf-js';
import { FindConditions, FindOneOptions, ObjectID, Repository, SelectQueryBuilder } from 'typeorm';
import { BigNumber } from 'bignumber.js';
import {EntitiesOrder, GetEntitiesInputInterface} from "./app.interfaces";
import {EntityField} from "./app.enums";

export abstract class AbstractService<I extends GetEntitiesInputInterface, T, M> {
  protected  abstract entitiesRepository: Repository<T>;
  abstract getItemsBuilder(input: GetEntitiesInputInterface, repository?: Repository<T>): SelectQueryBuilder<any>;

  async getPagedItems(input: I) {
    let hasNextPage = false;

    if (!input.order) {
      input.order = { field: 'cursor', order: 'DESC' } as unknown as EntitiesOrder;
    }

    const builder = this.getItemsBuilder(input);

    const totalCount = await builder.getCount();

    const first = input.first || 20;
    input.first = first + 1;
    if (input.first) {
      builder.limit(input.first);
    }

    const items = await builder.getMany();

    let edges = [];
    let endCursor = 'NaN';
    if (items.length > 0) {
      if (items.length > first) {
        hasNextPage = true;
        items.pop();
      }
      const lastItem = items[items.length - 1];
      const cursorField = this.getCursorField(input);
      endCursor = lastItem[cursorField];

      const mappedItems = await Promise.all(items.map(async (item: T) => {
        return await this.mapPagedItems(item, input);
      }));
      edges = mappedItems.map(item => {
        const cursor = item[cursorField];
        return { cursor, node: item } as unknown as {node: M, cursor: string};
      });
    }

    return {edges, hasNextPage, endCursor, totalCount};
  }

  async mapPagedItems(v: T, input?: I) {
    return await Promise.resolve(v as unknown as M);
  }

  protected generateCursor(value: string, cursor: any): string {
    const valueStr = value.toString();
    const valueLength = valueStr.length;
    return (valueLength > 10 ? valueStr.slice(0, 10) : valueStr + '0'.repeat(10 - valueLength))
      + sprintf('%010s', cursor.toString());
  }

  protected generateFloatCursor(value: number, cursor: any): string {
    const valueStr = Math.round(value * Math.pow(10, 10)).toString(16);

    const valueLength = valueStr.length;
    return (valueLength > 18 ? valueStr.slice(0, 18) : sprintf('%018s', valueStr)) + sprintf('%010s', cursor.toString());
  }

  protected generateBigNumberCursor(value: BigNumber, cursor: any): string {
    const valueStr = value.shiftedBy(10).decimalPlaces(0).toString(16);

    const valueLength = valueStr.length;
    return (valueLength > 18 ? valueStr.slice(0, 18) : sprintf('%018s', valueStr)) + sprintf('%010s', cursor.toString());
  }

  protected generateDateCursor(value: Date, cursor: any): string {
    const valueStr = value.getTime().toString();
    const valueLength = valueStr.length;
    return (valueLength > 14 ? valueStr.slice(0, 14) : sprintf('%014s', valueStr))
      + sprintf('%010s', cursor.toString());
  }

  protected getCursorField(input: I): string {
    return input.order.field === EntityField.cursor
      ? EntityField.cursor
      : input.order.field + 'Cursor';
  }

  findOneById(id: string, repository?: Repository<any>): Promise<T> {
    return (repository || this.entitiesRepository).findOne({id} as unknown as FindConditions<T>);
  }

  findOne(options?: FindOneOptions<T>, dummy?: any, repository?: Repository<any>): Promise<T | undefined>;
  findOne(id?: string | number | Date | ObjectID, options?: FindOneOptions<T>, repository?: Repository<any>): Promise<T | undefined>;
  findOne(conditions?: FindConditions<T>, options?: FindOneOptions<T>, repository?: Repository<any>): Promise<T | undefined>;
  findOne(idOrOptionsOrConditions?: string|string[]|number|number[]|Date|Date[]|ObjectID|ObjectID[]|FindOneOptions<T>|FindConditions<T>, maybeOptions?: FindOneOptions<T>, repository?: Repository<any>): Promise<T | undefined> {
    // zero filters means empty return value
    if (!idOrOptionsOrConditions) {
      return Promise.resolve(undefined);
    }
    // @ts-ignore
    return (repository || this.entitiesRepository).findOne(idOrOptionsOrConditions, maybeOptions);
  }
}
