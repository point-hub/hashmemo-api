import type { IDatabase, IPagination, IPipeline, IQuery } from '@point-hub/papi';
import { BaseMongoDBQueryFilters } from '@point-hub/papi';

import { collectionName } from '../entity';
import type { IFile } from '../interface';
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
  data: IFile[]
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
    pipeline.push(...this.pipeJoinCreatedById());
    pipeline.push(...this.pipeJoinRejectedById());
    pipeline.push(...this.pipeJoinVoidedById());
    pipeline.push(...this.pipeProject());

    const response = await this.database.collection(collectionName).aggregate<IRetrieveOutput>(pipeline, query, this.options);

    return {
      data: response.data.map(item => {
        return {
          _id: item._id,
          folder_id: item.folder_id,
          pdf_url: item.pdf_url,
          name: item.name,
          hash: item.hash,
          certificate_id: item.certificate_id,
          approvals: item.approvals,
          signatures: item.signatures,
          status: item.status,
          is_archived: item.is_archived,
          created_at: item.created_at,
          created_by: item.created_by,
          voided_at: item.voided_at,
          voided_by: item.voided_by,
          voided_reason: item.voided_reason,
          rejected_at: item.rejected_at,
          rejected_by: item.rejected_by,
          rejected_reason: item.rejected_reason,
        };
      }),
      pagination: response.pagination,
    };
  }

  async raw(query: IQuery): Promise<IRetrieveManyRawOutput> {
    return await this.database.collection(collectionName).retrieveMany<IFile>(query, this.options);
  }

  private pipeQueryFilter(query: IQuery): IPipeline[] {
    const filters: Record<string, unknown>[] = [];

    // General search across multiple fields
    if (query?.['search.all']) {
      const searchRegex = { $regex: query?.['search.all'], $options: 'i' };
      const fields = ['name'];
      filters.push({
        $or: fields.map((field) => ({ [field]: searchRegex })),
      });
    }

    if (query?.['search.tab'] === '1') {
      BaseMongoDBQueryFilters.addExactFilter(filters, 'created_by_id', query?.['user_id']);
    }
    if (query?.['search.tab'] === '2') {
      BaseMongoDBQueryFilters.addExactFilter(filters, 'approvals.user_id', query?.['user_id']);
    }

    // Filter specific field
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'name', query?.['search.name']);

    // Filter exact field
    BaseMongoDBQueryFilters.addExactFilter(filters, 'status', query?.['search.status']);
    BaseMongoDBQueryFilters.addExactFilter(filters, 'hash', query?.['search.hash']);

    BaseMongoDBQueryFilters.addBooleanFilter(filters, 'is_archived', query?.['search.is_archived']);

    return filters.length > 0 ? [{ $match: { $and: filters } }] : [];
  }

  private pipeJoinCreatedById(): IPipeline[] {
    return [
      {
        $lookup: {
          from: 'users',
          let: { userId: '$created_by_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
            {
              $project: {
                _id: 1,
                name: 1,
                username: 1,
                email: 1,
              },
            },
          ],
          as: 'created_by',
        },
      },
      {
        $unwind: {
          path: '$created_by',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];
  }

  private pipeJoinVoidedById(): IPipeline[] {
    return [
      {
        $lookup: {
          from: 'users',
          let: { userId: '$voided_by_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
            {
              $project: {
                _id: 1,
                name: 1,
                username: 1,
                email: 1,
              },
            },
          ],
          as: 'voided_by',
        },
      },
      {
        $unwind: {
          path: '$voided_by',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];
  }

  private pipeJoinRejectedById(): IPipeline[] {
    return [
      {
        $lookup: {
          from: 'users',
          let: { userId: '$rejected_by_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
            {
              $project: {
                _id: 1,
                name: 1,
                username: 1,
                email: 1,
              },
            },
          ],
          as: 'rejected_by',
        },
      },
      {
        $unwind: {
          path: '$rejected_by',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];
  }

  private pipeProject(): IPipeline[] {
    return [
      {
        $project: {
          _id: 1,
          folder_id: 1,
          pdf_url: 1,
          name: 1,
          hash: 1,
          certificate_id: 1,
          approvals: 1,
          signatures: 1,
          status: 1,
          is_archived: 1,
          created_at: 1,
          created_by: 1,
          voided_at: 1,
          voided_by: 1,
          voided_reason: 1,
          rejected_at: 1,
          rejected_by: 1,
          rejected_reason: 1,
        },
      },
    ];
  }
}
