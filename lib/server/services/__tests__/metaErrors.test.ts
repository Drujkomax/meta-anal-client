import { describe, it, expect } from 'vitest';
import { MetaApiError, mapMetaError } from '../metaErrors';

describe('mapMetaError', () => {
  it('переводит ошибку прав (#200) в понятный текст', () => {
    const err = new MetaApiError({ code: 200, message: 'Permissions error' });
    expect(mapMetaError(err)).toMatch(/прав/i);
  });

  it('переводит отсутствие special_ad_category (#2635)', () => {
    const err = new MetaApiError({ code: 2635, message: 'x' });
    expect(mapMetaError(err)).toMatch(/категори/i);
  });

  it('предпочитает error_user_msg, если он есть', () => {
    const err = new MetaApiError({ code: 200, message: 'x', error_user_msg: 'Понятно для юзера' });
    expect(mapMetaError(err)).toBe('Понятно для юзера');
  });

  it('для неизвестного кода отдаёт исходное сообщение', () => {
    const err = new MetaApiError({ code: 999999, message: 'Weird thing' });
    expect(mapMetaError(err)).toContain('Weird thing');
  });

  it('обрабатывает не-Meta ошибку', () => {
    expect(mapMetaError(new Error('boom'))).toContain('boom');
  });
});
