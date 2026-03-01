import type { IDatabase } from '@point-hub/papi';

import { collectionName } from '../entity';

export interface IOtpRepository {
  handle(_id: string, user_id: string, otp: string): Promise<IOtpOutput>
}

export interface IOtpOutput {
  matched_count: number
  modified_count: number
}

export class OtpRepository implements IOtpRepository {
  constructor(
    public database: IDatabase,
    public options?: Record<string, unknown>,
  ) { }

  async handle(_id: string, user_id: string, otp: string): Promise<IOtpOutput> {
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
                    { $eq: ['$$sig.user_id', user_id] },
                    {
                      $mergeObjects: [
                        '$$sig',
                        {
                          otp: otp,
                          otp_at: new Date(),
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
      ],
    );

    return response;
  }
}
