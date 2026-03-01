import type { IDatabase, IPipeline } from '@point-hub/papi';

import type { IAuthUser } from '@/modules/master/users/interface';

import { collectionName } from '../entity';
import type { IFile } from '../interface';

export interface IRetrieveRepository {
  handle(_id: string): Promise<IRetrieveOutput | null>
  raw(_id: string): Promise<IFile | null>
}

export interface IApproval {
  user_id: string
  name: string
  initial: string
  role: string
}

export interface ISignature {
  id: string
  x: number
  y: number
  page: number
  user_id: string
  name: string
  initial: string
  signed: boolean
}

export interface IRetrieveOutput {
  _id: string
  folder_id: string
  pdf_url: string
  name: string
  hash: string
  certificate_id: string
  approvals: IApproval[]
  signatures: ISignature[]
  status: string
  is_archived: boolean
  created_at: Date
  created_by: IAuthUser
  voided_at: Date
  voided_by: IAuthUser
  voided_reason: string
}

export class RetrieveRepository implements IRetrieveRepository {
  constructor(
    public database: IDatabase,
    public options?: Record<string, unknown>,
  ) { }

  async handle(_id: string): Promise<IRetrieveOutput | null> {
    const pipeline: IPipeline[] = [];

    pipeline.push(...this.pipeFilter(_id));
    pipeline.push(...this.pipeJoinCreatedById());
    pipeline.push(...this.pipeProject());

    const response = await this.database.collection(collectionName).aggregate<IRetrieveOutput>(pipeline, {}, this.options);
    if (!response || response.data.length === 0) {
      return null;
    }

    return {
      _id: response.data[0]._id,
      folder_id: response.data[0].folder_id,
      pdf_url: response.data[0].pdf_url,
      name: response.data[0].name,
      hash: response.data[0].hash,
      certificate_id: response.data[0].certificate_id,
      approvals: response.data[0].approvals,
      signatures: response.data[0].signatures,
      status: response.data[0].status,
      is_archived: response.data[0].is_archived,
      created_at: response.data[0].created_at,
      created_by: response.data[0].created_by,
      voided_at: response.data[0].voided_at,
      voided_by: response.data[0].voided_by,
      voided_reason: response.data[0].voided_reason,
    };
  }

  async raw(_id: string): Promise<IFile | null> {
    const response = await this.database.collection(collectionName).retrieve<IFile>(_id, this.options);
    if (!response) {
      return null;
    }

    return response;
  }

  private pipeFilter(_id: string): IPipeline[] {
    return [{ $match: { _id } }];
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
        },
      },
    ];
  }
}
