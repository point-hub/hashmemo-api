import { BaseUseCase, type IUseCaseOutputFailed, type IUseCaseOutputSuccess } from '@point-hub/papi';

import type { IAuthorizationService } from '@/modules/_shared/services/authorization.service';
import type { IUniqueValidationService } from '@/modules/_shared/services/unique-validation.service';
import type { IUserAgent } from '@/modules/_shared/types/user-agent.type';
import type { IAblyService } from '@/modules/ably/services/ably.service';
import type { IAuditLogService } from '@/modules/audit-logs/services/audit-log.service';
import type { ICodeGeneratorService } from '@/modules/counters/services/code-generator.service';
import type { IAuthUser } from '@/modules/master/users/interface';

import { collectionName, FileEntity } from '../entity';
import type { ICreateRepository } from '../repositories/create.repository';
import type { IApproval, ISignature } from '../repositories/retrieve.repository';
import type { IRetrieveManyRepository } from '../repositories/retrieve-many.repository';

export interface IInput {
  authUser: IAuthUser
  userAgent: IUserAgent
  ip: string
  data: {
    folder_id: string
    pdf_url: string
    name: string
    hash: string
    certificate_id: string
    approvals: IApproval[]
    signatures: ISignature[]
    status: string
  }
}

export interface IDeps {
  createRepository: ICreateRepository
  retrieveManyRepository: IRetrieveManyRepository
  ablyService: IAblyService
  auditLogService: IAuditLogService
  authorizationService: IAuthorizationService
  codeGeneratorService: ICodeGeneratorService
  uniqueValidationService: IUniqueValidationService
}

export interface ISuccessData {
  inserted_id: string
}

/**
 * Use case: Create File.
 *
 * Responsibilities:
 * - Check whether the user is authorized to perform this action.
 * - Normalizes data (trim).
 * - Validate uniqueness: single unique name field.
 * - Save the data to the database.
 * - Increment the code counter.
 * - Create an audit log entry for this operation.
 * - Publish realtime notification event to the recipient’s channel.
 * - Return a success response.
 */
export class CreateUseCase extends BaseUseCase<IInput, IDeps, ISuccessData> {
  async handle(input: IInput): Promise<IUseCaseOutputSuccess<ISuccessData> | IUseCaseOutputFailed> {
    const result = await this.deps.retrieveManyRepository.raw({});

    // Normalizes data (trim).
    const fileEntity = new FileEntity({
      name: input.data.name,
      hash: input.data.hash,
      certificate_id: 'CERT' + String(Number(result.pagination.total_document) + 1).padStart(4, '0'),
      folder_id: input.data.folder_id,
      pdf_url: input.data.pdf_url,
      approvals: input.data.approvals,
      signatures: input.data.signatures,
      status: 'awaiting-signature',
      is_archived: false,
      created_at: new Date(),
      created_by_id: input.authUser._id,
    });

    // Save the data to the database.
    const createResponse = await this.deps.createRepository.handle(fileEntity.data);

    // Increment the code counter.
    await this.deps.codeGeneratorService.increment(collectionName);

    // Create an audit log entry for this operation.
    const changes = this.deps.auditLogService.buildChanges({}, fileEntity.data);
    const dataLog = {
      operation_id: this.deps.auditLogService.generateOperationId(),
      entity_type: collectionName,
      entity_id: createResponse.inserted_id,
      entity_ref: `${input.data.name}`,
      actor_type: 'user',
      actor_id: input.authUser._id,
      actor_name: input.authUser.username,
      action: 'create',
      module: 'file',
      system_reason: 'insert data',
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
        files: createResponse.inserted_id,
      },
      data: dataLog,
    });

    // Return a success response.
    return this.success({
      inserted_id: createResponse.inserted_id,
    });
  }
}
