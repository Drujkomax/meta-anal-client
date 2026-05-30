export interface MetaErrorBody {
  code?: number;
  error_subcode?: number;
  message?: string;
  error_user_title?: string;
  error_user_msg?: string;
}

export class MetaApiError extends Error {
  readonly code?: number;
  readonly subcode?: number;
  readonly userMsg?: string;

  constructor(body: MetaErrorBody | undefined, cause?: unknown) {
    super(body?.message || 'Meta API error');
    this.name = 'MetaApiError';
    this.code = body?.code;
    this.subcode = body?.error_subcode;
    this.userMsg = body?.error_user_msg;
    if (cause) (this as { cause?: unknown }).cause = cause;
  }
}

const CODE_MESSAGES: Record<number, string> = {
  200: 'Недостаточно прав. Проверьте разрешение ads_management и доступ к рекламному аккаунту.',
  10: 'Недостаточно прав для этого действия.',
  2635: 'Не указана категория рекламы (special ad category). Укажите её на шаге кампании.',
  100: 'Некорректные параметры запроса. Проверьте заполненные поля.',
  1487006: 'Слишком маленький бюджет для выбранной оптимизации.',
  2490: 'Выбранный пиксель недоступен для этого рекламного аккаунта.',
};

export function mapMetaError(error: unknown): string {
  if (error instanceof MetaApiError) {
    if (error.userMsg) return error.userMsg;
    if (error.code && CODE_MESSAGES[error.code]) return CODE_MESSAGES[error.code];
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Неизвестная ошибка при обращении к Meta.';
}
