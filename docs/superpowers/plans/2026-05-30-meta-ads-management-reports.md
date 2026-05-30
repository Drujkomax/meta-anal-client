# Управление рекламой Meta — План C: отчёты и экспорт

> Реализовано инлайн. Верификация: юнит-тесты чистых функций (shapeReportRow, reportColumns,
> reportToCsv, reportToXlsx) + `npm run build`.

**Goal:** Страница отчётов с фильтрами (аккаунт, период, уровень) и экспорт в CSV/XLSX на уровне
кампаний/групп/объявлений, на основе уже синхронизированных `daily_ad_metrics`.

**Architecture:** `reportService.buildReport` агрегирует `daily_ad_metrics` по выбранному уровню.
`reportColumns(level)` — общий список колонок для CSV/XLSX и UI. Экспортёры — чистые функции.
API: `GET /api/reports` (превью JSON), `GET /api/reports/export?format=csv|xlsx` (файл).

## Файлы
- `lib/server/services/reportService.ts` — buildReport (SQL по уровню), shapeReportRow, reportColumns
- `lib/server/services/exporters/csv.ts`, `exporters/xlsx.ts` (exceljs)
- `lib/server/api/handlers/reportHandlers.ts` — reportsHandler + reportsExportHandler
- `pages/api/reports/index.ts`, `pages/api/reports/export.ts`
- `pages/reports/index.tsx` — фильтры + таблица + кнопки экспорта
- `lib/types.ts` (ReportRow), `lib/api.ts` (getReport, reportExportUrl)
- Тест: `lib/server/services/__tests__/report.test.ts`

## Заметки
- Уровень (`level`) приходит из фикс-списка (валидируется хендлером) — интерполяция в SQL безопасна.
- CSV отдаётся с UTF-8 BOM (корректная кириллица в Excel).
- Бюджеты/деньги в отчётах — из синхронизированных метрик (валюта аккаунта).
