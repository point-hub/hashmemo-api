import { BaseEntity } from '@/modules/_shared/entity/base.entity';

import { type IFile } from './interface';

export const collectionName = 'files';

export class FileEntity extends BaseEntity<IFile> {
  constructor(public data: IFile) {
    super();

    this.data = this.normalize(this.data);
  }
}
