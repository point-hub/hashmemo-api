import { faker } from '@faker-js/faker';
import { BaseFactory, type IDatabase } from '@point-hub/papi';

import { type IFolder } from './interface';
import { CreateRepository } from './repositories/create.repository';
import { CreateManyRepository } from './repositories/create-many.repository';

export default class FolderFactory extends BaseFactory<IFolder> {
  constructor(public dbConnection: IDatabase, public options?: Record<string, unknown>) {
    super();
  }

  definition() {
    return {
      name: faker.person.firstName(),
      is_archived: false,
      created_at: new Date(),
      created_by_id: undefined, // injected
    } as IFolder;
  }

  async create() {
    const createRepository = new CreateRepository(this.dbConnection, this.options);
    return await createRepository.handle(this.makeOne());
  }

  async createMany(count: number) {
    const createManyRepository = new CreateManyRepository(this.dbConnection, this.options);
    return await createManyRepository.handle(this.makeMany(count));
  }
}
