import type { IApproval, ISignature } from './repositories/retrieve.repository';

export interface IFile {
  _id?: string
  folder_id?: string
  pdf_url?: string
  name?: string
  hash?: string
  certificate_id?: string
  approvals?: IApproval[]
  signatures?: ISignature[]
  status?: string
  is_archived?: boolean | null | undefined
  created_at?: Date
  created_by_id?: string
  voided_at?: Date
  voided_by_id?: string
  voided_reason?: string
}
