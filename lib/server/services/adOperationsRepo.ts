import { query } from '../config/db';

export interface RecordOperationInput {
  accountId: string;
  metaUserId: string;
  operationType: string;
  level?: string;
  requestPayload?: unknown;
}

export async function recordOperation(input: RecordOperationInput): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO ad_operations (account_id, meta_user_id, operation_type, level, request_payload, status)
     VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id`,
    [
      input.accountId,
      input.metaUserId,
      input.operationType,
      input.level ?? null,
      JSON.stringify(input.requestPayload ?? null),
    ],
  );
  return rows[0].id;
}

export interface MarkOperationInput {
  status: 'success' | 'failed' | 'rolled_back';
  metaObjectId?: string;
  response?: unknown;
  errorMessage?: string;
}

export async function markOperation(id: string, input: MarkOperationInput): Promise<void> {
  await query(
    `UPDATE ad_operations
     SET status = $2, meta_object_id = COALESCE($3, meta_object_id),
         response = COALESCE($4, response), error_message = COALESCE($5, error_message)
     WHERE id = $1`,
    [
      id,
      input.status,
      input.metaObjectId ?? null,
      input.response ? JSON.stringify(input.response) : null,
      input.errorMessage ?? null,
    ],
  );
}
