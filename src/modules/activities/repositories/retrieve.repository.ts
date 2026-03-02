import type { IDatabase, IPipeline } from '@point-hub/papi';

import { collectionName } from '../entity';
import type { IActivity } from '../interface';

export interface IRetrieveRepository {
  handle(_id: string): Promise<IRetrieveOutput | null>
  raw(_id: string): Promise<IActivity | null>
}

export interface IRetrieveOutput {
  _id: string
  name: string
  username: string
  email: string
  action: string
  file_id: string
  file_name: string
  ip: string
  created_at: Date
}

export class RetrieveRepository implements IRetrieveRepository {
  constructor(
    public database: IDatabase,
    public options?: Record<string, unknown>,
  ) { }

  async handle(_id: string): Promise<IRetrieveOutput | null> {
    const pipeline: IPipeline[] = [];

    pipeline.push(...this.pipeFilter(_id));
    pipeline.push(...this.pipeProject());

    const response = await this.database.collection(collectionName).aggregate<IRetrieveOutput>(pipeline, {}, this.options);
    if (!response || response.data.length === 0) {
      return null;
    }

    return {
      _id: response.data[0]._id,
      username: response.data[0].username,
      name: response.data[0].name,
      email: response.data[0].email,
      action: response.data[0].action,
      file_id: response.data[0].file_id,
      file_name: response.data[0].file_name,
      ip: response.data[0].ip,
      created_at: response.data[0].created_at,
    };
  }

  async raw(_id: string): Promise<IActivity | null> {
    const response = await this.database.collection(collectionName).retrieve<IActivity>(_id, this.options);
    if (!response) {
      return null;
    }

    return response;
  }

  private pipeFilter(_id: string): IPipeline[] {
    return [{ $match: { _id } }];
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
          file_id: 1,
          file_name: 1,
          ip: 1,
          created_at: 1,
        },
      },
    ];
  }
}
