import { BaseUseCase, type IUseCaseOutputFailed, type IUseCaseOutputSuccess } from '@point-hub/papi';

import type { IUserAgent } from '@/modules/_shared/types/user-agent.type';
import type { IAuditLogService } from '@/modules/audit-logs/services/audit-log.service';

import { collectionName, UserEntity } from '../entity';
import type { IRetrieveRepository } from '../repositories/retrieve.repository';
import type { IRetrieveManyRepository } from '../repositories/retrieve-many.repository';
import type { IVerifyPhotoRepository } from '../repositories/verify-photo.repository';

export interface IInput {
  userAgent: IUserAgent
  ip: string
  filter: {
    code: string
  }
  data: {
    photo_url: string
  }
}

export interface IDeps {
  verifyPhotoRepository: IVerifyPhotoRepository
  retrieveManyRepository: IRetrieveManyRepository
  retrieveRepository: IRetrieveRepository
  auditLogService: IAuditLogService
}

export interface ISuccessData {
  matched_count: number
  modified_count: number
}

/**
 * Use case: Verify a user's photo.
 *
 * Responsibilities:
 * - Validate that the verification code is valid and corresponds to an existing user.
 * - Mark the user's email as verified in the repository.
 * - Return a success response.
 */
export class VerifyPhotoUseCase extends BaseUseCase<IInput, IDeps, ISuccessData> {
  async handle(input: IInput): Promise<IUseCaseOutputSuccess<ISuccessData> | IUseCaseOutputFailed> {
    // Validate that the verification code is valid and corresponds to an existing user.
    const userResponse = await this.deps.retrieveManyRepository.handle({
      filter: { 'photo_code': input.filter.code },
    });
    if (userResponse.data.length === 0) {
      return this.fail({
        code: 422,
        message: 'photo code is invalid',
        errors: {
          code: ['photo code is invalid'],
        },
      });
    }

    // Check if the record exists
    const retrieveResponse = await this.deps.retrieveRepository.raw(userResponse.data[0]._id);
    if (!retrieveResponse) {
      return this.fail({ code: 404, message: 'Resource not found' });
    }

    // Normalizes data (trim).
    const userEntity = new UserEntity({
      photo_code: null,
      photo_url: input.data.photo_url,
    });

    // Mark the user's email as verified in the repository.
    const response = await this.deps.verifyPhotoRepository.handle(userResponse.data[0]._id, userEntity.data);

    // Create an audit log entry for this operation.
    const changes = this.deps.auditLogService.buildChanges(
      retrieveResponse,
      this.deps.auditLogService.mergeDefined(retrieveResponse, userEntity.data),
    );
    const dataLog = {
      operation_id: this.deps.auditLogService.generateOperationId(),
      entity_type: collectionName,
      entity_id: retrieveResponse._id!,
      entity_ref: retrieveResponse.username!,
      actor_type: 'anonymous',
      action: 'verify-photo',
      module: 'user',
      system_reason: 'update data',
      changes: changes,
      metadata: {
        ip: input.ip,
        device: input.userAgent.device,
        browser: input.userAgent.browser,
        os: input.userAgent.os,
      },
      created_at: new Date(),
    };
    await this.deps.auditLogService.log(dataLog);

    // Return a success response.
    return this.success({
      matched_count: response.matched_count,
      modified_count: response.modified_count,
    });
  }
}
