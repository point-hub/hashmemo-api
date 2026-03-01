import type { IDatabase } from '@point-hub/papi';

import { collectionName } from '../entity';

export interface ISignRepository {
  handle(_id: string, user_id: string, otp: string): Promise<ISignOutput>
}

export interface ISignOutput {
  matched_count: number
  modified_count: number
}

export class SignRepository implements ISignRepository {
  constructor(
    public database: IDatabase,
    public options?: Record<string, unknown>,
  ) { }

  async handle(_id: string, user_id: string, otp: string): Promise<ISignOutput> {
    const response = await this.database.collection(collectionName).updateOne(
      { _id: _id },
      [
        {
          $set: {
            signatures: {
              $map: {
                input: '$signatures',
                as: 'sig',
                in: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$$sig.user_id', user_id] },
                        { $eq: ['$$sig.otp', otp] },
                      ],
                    },
                    {
                      $mergeObjects: [
                        '$$sig',
                        {
                          signed: true,
                          signed_at: new Date(),
                        },
                      ],
                    },
                    '$$sig',
                  ],
                },
              },
            },
          },
        },
        {
          $set: {
            status: {
              $cond: [
                {
                  $allElementsTrue: {
                    $map: {
                      input: '$signatures',
                      as: 'sig',
                      in: '$$sig.signed',
                    },
                  },
                },
                'signed',
                '$status',
              ],
            },
          },
        },
      ],
    );

    return response;
  }
}
