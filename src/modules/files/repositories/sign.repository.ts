import type { IDatabase } from '@point-hub/papi';

import { collectionName } from '../entity';

export interface IData {
  _id: string
  user_id: string
  otp: string
  ip: string
}

export interface ISignRepository {
  handle(data: IData): Promise<ISignOutput>
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

  async handle(data: IData): Promise<ISignOutput> {
    const response = await this.database.collection(collectionName).updateOne(
      {
        _id: data._id,
        signatures: {
          $elemMatch: {
            user_id: data.user_id,
            otp: data.otp,
          },
        },
      },
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
                        { $eq: ['$$sig.user_id', data.user_id] },
                        { $eq: ['$$sig.otp', data.otp] },
                      ],
                    },
                    {
                      $mergeObjects: [
                        '$$sig',
                        {
                          ip: data.ip,
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
                'awaiting-signature',
              ],
            },
          },
        },
      ],
    );

    return response;
  }
}
