import type { IDatabase, IPagination, IPipeline, IQuery } from '@point-hub/papi';
import { BaseMongoDBQueryFilters } from '@point-hub/papi';

import { collectionName } from '../entity';
import type { IActivity } from '../interface';
import type { IRetrieveOutput } from './retrieve.repository';

export interface IRetrieveManyRepository {
  handle(query: IQuery): Promise<IRetrieveManyOutput>
  raw(query: IQuery): Promise<IRetrieveManyRawOutput>
}

export interface IRetrieveManyOutput {
  data: IRetrieveOutput[]
  pagination: IPagination
}

export interface IRetrieveManyRawOutput {
  data: IActivity[]
  pagination: IPagination
}

export class RetrieveManyRepository implements IRetrieveManyRepository {
  constructor(
    public database: IDatabase,
    public options?: Record<string, unknown>,
  ) { }

  async handle(query: IQuery): Promise<IRetrieveManyOutput> {
    const pipeline: IPipeline[] = [];

    pipeline.push(...this.pipeQueryFilter(query));
    pipeline.push(...this.pipeProject());

    const response = await this.database.collection(collectionName).aggregate<IRetrieveOutput>(pipeline, query, this.options);

    return {
      data: response.data.map(item => {
        return {
          _id: item._id,
          username: item.username,
          name: item.name,
          email: item.email,
          action: item.action,
          ip: item.ip,
          created_at: item.created_at,
        };
      }),
      pagination: response.pagination,
    };
  }

  async raw(query: IQuery): Promise<IRetrieveManyRawOutput> {
    return await this.database.collection(collectionName).retrieveMany<IActivity>(query, this.options);
  }

  private pipeQueryFilter(query: IQuery): IPipeline[] {
    const filters: Record<string, unknown>[] = [];

    // General search across multiple fields
    if (query?.['search.all']) {
      const searchRegex = { $regex: query?.['search.all'], $options: 'i' };
      const fields = ['code', 'name', 'composite_unique_1', 'composite_unique_2', 'age', 'gender', 'optional_unique_1'];
      filters.push({
        $or: fields.map((field) => ({ [field]: searchRegex })),
      });
    }

    // Filter specific field
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'username', query?.['search.username']);
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'name', query?.['search.name']);
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'email', query?.['search.email']);

    // Filter exact field
    BaseMongoDBQueryFilters.addExactFilter(filters, 'file_id', query?.['search.file_id']);
    BaseMongoDBQueryFilters.addExactFilter(filters, 'action', query?.['search.action']);
    BaseMongoDBQueryFilters.addExactFilter(filters, 'ip', query?.['search.ip']);

    // Apply numeric filter using the helper function
    console.log(filters);
    return filters.length > 0 ? [{ $match: { $and: filters } }] : [];
  }

  private pipeProject(): IPipeline[] {
    return [
      {
        $project: {
          _id: 1,
          username: 1,
          name: 1,
          email: 1,
          action: 1,
          ip: 1,
          created_at: 1,
        },
      },
    ];
  }
}
