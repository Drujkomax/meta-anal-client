// Подставляем безопасные тестовые переменные окружения ДО импорта модулей,
// которые читают process.env на верхнем уровне (lib/server/config/env.ts
// вызывает process.exit(1) при отсутствии обязательных переменных).
process.env.NODE_ENV ||= 'test';
process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test';
process.env.META_APP_ID ||= 'test_app_id';
process.env.META_APP_SECRET ||= 'test_app_secret';
process.env.META_REDIRECT_URI ||= 'http://localhost:3000/api/auth/meta/callback';
process.env.JWT_SECRET ||= 'test_jwt_secret_value_1234567890';
