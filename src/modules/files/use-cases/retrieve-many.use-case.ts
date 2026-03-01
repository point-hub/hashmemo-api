import { BaseUseCase, type IQuery, type IUseCaseOutputFailed, type IUseCaseOutputSuccess } from '@point-hub/papi';

import type { IAuthorizationService } from '@/modules/_shared/services/authorization.service';
import type { IAuthUser } from '@/modules/master/users/interface';

import type { IApproval, ISignature } from '../repositories/retrieve.repository';
import type { IRetrieveManyRepository } from '../repositories/retrieve-many.repository';

export interface IInput {
  authUser: IAuthUser
  query: IQuery
}

export interface IDeps {
  retrieveManyRepository: IRetrieveManyRepository
  authorizationService: IAuthorizationService
}

export interface ISuccessData {
  data: {
    _id?: string
    folder_id?: string
    pdf_url?: string
    name?: string
    approvals: IApproval[]
    signatures: ISignature[]
    status: string
    is_archived?: boolean
    created_at?: Date
    created_by?: IAuthUser
    voided_at?: Date
    voided_by?: IAuthUser
    voided_reason?: string
  }[]
  pagination: {
    page: number
    page_count: number
    page_size: number
    total_document: number
  }
}

/**
 * Use case: Retrieve Files.
 *
 * Responsibilities:
 * - Check whether the user is authorized to perform this action
 * - Retrieve all data from the database.
 * - Optionally filter response fields using `query.fields`.
 * - Return a success response.
 */
export class RetrieveManyUseCase extends BaseUseCase<IInput, IDeps, ISuccessData> {
  async handle(input: IInput): Promise<IUseCaseOutputSuccess<ISuccessData> | IUseCaseOutputFailed> {
    input.query['user_id'] = input.authUser._id;
    // Retrieve all data from the database.
    const response = await this.deps.retrieveManyRepository.handle(input.query);

    // Optionally filter response fields using `query.fields`.
    const fields = typeof input.query.fields === 'string'
      ? input.query.fields.split(',').map(f => f.trim())
      : null;

    // Return a success response.
    return this.success({
      data: response.data.map(item => {
        const mapped = {
          _id: item._id,
          folder_id: item.folder_id,
          pdf_url: item.pdf_url,
          name: item.name,
          approvals: item.approvals,
          signatures: item.signatures,
          status: item.status,
          is_archived: item.is_archived,
          created_at: item.created_at,
          created_by: item.created_by,
          voided_at: item.voided_at,
          voided_by: item.voided_by,
          voided_reason: item.voided_reason,
        };

        // If no fields requested → return full object
        if (!fields) return mapped;

        // Otherwise → return only requested fields
        return Object.fromEntries(
          Object.entries(mapped).filter(([key]) => fields.includes(key)),
        ) as typeof mapped;
      }),
      pagination: response.pagination,
    });
  }
}
