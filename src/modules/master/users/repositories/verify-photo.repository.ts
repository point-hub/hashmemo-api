import type { IDatabase, IDocument } from '@point-hub/papi';

import { collectionName } from '../entity';

export interface IVerifyPhotoRepository {
  handle(_id: string, document: IDocument): Promise<IVerifyPhotoOutput>
}

export interface IVerifyPhotoOutput {
  matched_count: number
  modified_count: number
}

export class VerifyPhotoRepository implements IVerifyPhotoRepository {
  constructor(
    public database: IDatabase,
    public options?: Record<string, unknown>,
  ) { }

  async handle(_id: string, document: IDocument): Promise<IVerifyPhotoOutput> {
    return await this.database.collection(collectionName).update(_id, document, { ...this.options });
  }
}
