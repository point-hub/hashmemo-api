import { BaseUseCase, type IUseCaseOutputFailed, type IUseCaseOutputSuccess } from '@point-hub/papi';

import type { IUniqueValidationService } from '@/modules/_shared/services/unique-validation.service';
import type { IUuidService } from '@/modules/_shared/services/uuid.service';
import type { IUserAgent } from '@/modules/_shared/types/user-agent.type';
import type { IAuditLogService } from '@/modules/audit-logs/services/audit-log.service';

import { collectionName, redactFields, UserEntity } from '../entity';
import type { IRetrieveRepository } from '../repositories/retrieve.repository';
import type { IRetrieveManyRepository } from '../repositories/retrieve-many.repository';
import type { IVerifyEmailRepository } from '../repositories/verify-email.repository';
import type { IPasswordService } from '../services/password.service';

export interface IInput {
  userAgent: IUserAgent
  ip: string
  filter: {
    code: string
  }
  data: {
    name: string
    birthdate: string
    nik: string
    initial_name: string
    photo_id_url: string
    password: string
  }
}

export interface IDeps {
  verifyEmailRepository: IVerifyEmailRepository
  retrieveManyRepository: IRetrieveManyRepository
  retrieveRepository: IRetrieveRepository
  auditLogService: IAuditLogService
  uuidService: IUuidService
  passwordService: IPasswordService
  uniqueValidationService: IUniqueValidationService
}

export interface ISuccessData {
  matched_count: number
  modified_count: number
  photo_code: string
}

/**
 * Use case: Verify a user's email address.
 *
 * Responsibilities:
 * - Validate that the verification code is valid and corresponds to an existing user.
 * - Check if the record exists
 * - Normalizes data (trim).
 * - Mark the user's email as verified in the repository.
 * - Create an audit log entry for this operation.
 * - Return a success response.
 */
export class VerifyEmailUseCase extends BaseUseCase<IInput, IDeps, ISuccessData> {
  async handle(input: IInput): Promise<IUseCaseOutputSuccess<ISuccessData> | IUseCaseOutputFailed> {
    // Validate that the verification code is valid and corresponds to an existing user.
    const userResponse = await this.deps.retrieveManyRepository.handle({
      filter: { 'email_verification.code': input.filter.code },
    });
    if (userResponse.data.length === 0) {
      return this.fail({
        code: 422,
        message: 'Verification code is invalid',
        errors: {
          code: ['Verification code is invalid'],
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
      name: input.data.name,
      birthdate: input.data.birthdate,
      nik: input.data.nik,
      initial_name: input.data.initial_name,
      photo_id_url: input.data.photo_id_url,
      password: await this.deps.passwordService.hash(input.data.password),
      photo_code: this.deps.uuidService.random(),
      photo_url: '',
      email_verification: {
        is_verified: true,
        verified_at: new Date(),
        requested_at: null,
        code: null,
        url: null,
      },
    });

    // Validate uniqueness: single unique username field.
    const uniqueNikErrors = await this.deps.uniqueValidationService.validate(
      collectionName,
      { nik: userEntity.data.nik },
    );
    if (uniqueNikErrors) {
      return this.fail({ code: 422, message: 'Validation failed due to duplicate values.', errors: uniqueNikErrors });
    }

    // Mark the user's email as verified in the repository.
    const response = await this.deps.verifyEmailRepository.handle(userResponse.data[0]._id, userEntity.data);

    // Create an audit log entry for this operation.
    const changes = this.deps.auditLogService.buildChanges(
      retrieveResponse,
      this.deps.auditLogService.mergeDefined(retrieveResponse, userEntity.data),
      { redactFields },
    );

    const dataLog = {
      operation_id: this.deps.auditLogService.generateOperationId(),
      entity_type: collectionName,
      entity_id: retrieveResponse._id!,
      entity_ref: retrieveResponse.username!,
      actor_type: 'anonymous',
      action: 'verify-email',
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
      photo_code: userEntity.data.photo_code!,
    });
  }
}
