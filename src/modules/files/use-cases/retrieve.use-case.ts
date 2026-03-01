import { BaseUseCase, type IUseCaseOutputFailed, type IUseCaseOutputSuccess } from '@point-hub/papi';

import type { IAuthorizationService } from '@/modules/_shared/services/authorization.service';
import type { IAuthUser } from '@/modules/master/users/interface';

import type { IApproval, IRetrieveRepository, ISignature } from '../repositories/retrieve.repository';

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
  folder_id: string
  pdf_url: string
  name: string
  hash: string
  certificate_id: string
  approvals: IApproval[]
  signatures: ISignature[]
  status: string
  is_archived: boolean
  created_at: Date
  created_by: IAuthUser
}

/**
 * Use case: Retrieve File.
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
      folder_id: response.folder_id,
      pdf_url: response.pdf_url,
      name: response.name,
      hash: response.hash,
      certificate_id: response.certificate_id,
      approvals: response.approvals,
      signatures: response.signatures,
      status: response.status,
      is_archived: response.is_archived,
      created_at: response.created_at,
      created_by: {
        _id: response.created_by?._id,
        username: response.created_by?.username,
        name: response.created_by?.name,
        email: response.created_by?.email,
      },
    });
  }
}
