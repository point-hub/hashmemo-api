import { BaseEntity } from '@/modules/_shared/entity/base.entity';

import { type IActivity } from './interface';

export const collectionName = 'activities';

export class ActivityEntity extends BaseEntity<IActivity> {
  constructor(public data: IActivity) {
    super();

    this.data = this.normalize(this.data);
  }
}
