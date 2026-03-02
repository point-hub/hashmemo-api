import { BaseUseCase, type IUseCaseOutputFailed, type IUseCaseOutputSuccess } from '@point-hub/papi';

import type { IAuthorizationService } from '@/modules/_shared/services/authorization.service';
import type { IAuthUser } from '@/modules/master/users/interface';

import type { IRetrieveRepository } from '../repositories/retrieve.repository';

export interface IInput {
  authUser: IAuthUser
  filter: {
    _id: string
  }
}

export interface IDeps {
  retrieveRepository: IRetrieveRepository
  authorizationService: IAuthorizationService
}

export interface ISuccessData {
  _id: string
  username: string
  name: string
  email: string
  action: string
  ip: string
  created_at: Date
}

/**
 * Use case: Retrieve Activity.
 *
 * Responsibilities:
 * - Retrieve a single data record from the database.
 * - Return a success response.
 */
export class RetrieveUseCase extends BaseUseCase<IInput, IDeps, ISuccessData> {
  async handle(input: IInput): Promise<IUseCaseOutputSuccess<ISuccessData> | IUseCaseOutputFailed> {
    // Retrieve a single data record from the database.
    const response = await this.deps.retrieveRepository.handle(input.filter._id);
    if (!response) {
      return this.fail({
        code: 404,
        message: 'The requested data does not exist.',
      });
    }

    // Return a success response.
    return this.success({
      _id: response._id,
      name: response.name,
      username: response.username,
      email: response.email,
      action: response.action,
      ip: response.ip,
      created_at: response.created_at,
    });
  }
}
