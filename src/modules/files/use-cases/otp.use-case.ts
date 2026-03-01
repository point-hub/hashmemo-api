import { BaseUseCase, type IUseCaseOutputFailed, type IUseCaseOutputSuccess } from '@point-hub/papi';

import type { IAuthorizationService } from '@/modules/_shared/services/authorization.service';
import type { IEmailService } from '@/modules/_shared/services/email.service';
import type { IUniqueValidationService } from '@/modules/_shared/services/unique-validation.service';
import type { IUserAgent } from '@/modules/_shared/types/user-agent.type';
import type { IAblyService } from '@/modules/ably/services/ably.service';
import type { IAuditLogService } from '@/modules/audit-logs/services/audit-log.service';
import type { IAuthUser } from '@/modules/master/users/interface';

import { collectionName, FileEntity } from '../entity';
import type { IOtpRepository } from '../repositories/otp.repository';
import type { IRetrieveRepository } from '../repositories/retrieve.repository';

export interface IInput {
  authUser: IAuthUser
  userAgent: IUserAgent
  ip: string
  filter: {
    _id: string
  }
  data: {
    folder_id?: string
    name?: string
    reason?: string
    update_reason?: string
    is_archived?: boolean
  }
}

export interface IDeps {
  otpRepository: IOtpRepository
  retrieveRepository: IRetrieveRepository
  ablyService: IAblyService
  auditLogService: IAuditLogService
  authorizationService: IAuthorizationService
  uniqueValidationService: IUniqueValidationService
  emailService: IEmailService
}

export interface ISuccessData {
  matched_count: number
  modified_count: number
}

/**
 * Use case: Update File.
 *
 * Responsibilities:
 * - Check if the record exists
 * - Normalizes data (trim).
 * - Validate uniqueness: single unique name field.
 * - Reject update when no fields have changed
 * - Save the data to the database.
 * - Create an audit log entry for this operation.
 * - Publish realtime notification event to the recipient’s channel.
 * - Return a success response.
 */
export class OtpUseCase extends BaseUseCase<IInput, IDeps, ISuccessData> {
  async handle(input: IInput): Promise<IUseCaseOutputSuccess<ISuccessData> | IUseCaseOutputFailed> {
    // Check if the record exists.
    const retrieveResponse = await this.deps.retrieveRepository.raw(input.filter._id);
    if (!retrieveResponse) {
      return this.fail({ code: 404, message: 'Resource not found' });
    }

    const generateOtp = () => {
      return Math.floor(100000 + Math.random() * 900000).toString();
    };

    const otp = generateOtp();

    // Normalizes data (trim).
    const fileEntity = new FileEntity({
      status: 'rejected',
    });

    // Reject update when no fields have changed
    const changes = this.deps.auditLogService.buildChanges(
      retrieveResponse,
      this.deps.auditLogService.mergeDefined(retrieveResponse, fileEntity.data),
    );
    if (changes.summary.fields?.length === 0) {
      return this.fail({ code: 400, message: 'No changes detected. Please modify at least one field before saving.' });
    }

    // Save the data to the database.
    const response = await this.deps.otpRepository.handle(input.filter._id, input.authUser._id!, otp);

    // Create an audit log entry for this operation.
    const dataLog = {
      operation_id: this.deps.auditLogService.generateOperationId(),
      entity_type: collectionName,
      entity_id: input.filter._id,
      entity_ref: `${retrieveResponse.name}`,
      actor_type: 'user',
      actor_id: input.authUser._id,
      actor_name: input.authUser.username,
      action: 'update',
      module: 'file',
      system_reason: 'update data',
      user_reason: input.data?.update_reason,
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

    // Publish realtime notification event to the recipient’s channel.
    this.deps.ablyService.publish(`notifications:${input.authUser._id}`, 'logs:new', {
      type: 'files',
      actor_id: input.authUser._id,
      recipient_id: input.authUser._id,
      is_read: false,
      created_at: new Date(),
      entities: {
        files: input.filter._id,
      },
      data: dataLog,
    });

    // Send an email containing the verification link and code.
    await this.deps.emailService.send(
      {
        to: input.authUser.email!,
        subject: 'Gunakan OTP ini untuk tanda tangan dokumen anda',
        template: 'modules/files/emails/otp.hbs',
        context: {
          otp: otp,
        },
      },
    );


    // Return a success response.
    return this.success({
      matched_count: response.matched_count,
      modified_count: response.modified_count,
    });
  }
}
