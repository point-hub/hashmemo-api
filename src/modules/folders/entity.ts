import { BaseEntity } from '@/modules/_shared/entity/base.entity';

import { type IFolder } from './interface';

export const collectionName = 'folders';

export class FolderEntity extends BaseEntity<IFolder> {
  constructor(public data: IFolder) {
    super();

    this.data = this.normalize(this.data);
  }
}
