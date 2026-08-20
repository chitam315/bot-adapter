// Paths into the pino-http request/response log object (not raw env var
// names) — see https://getpino.io/#/docs/redaction for the path syntax.
export const PINO_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["ocp-apim-subscription-key"]',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',
];

export const PINO_REDACT_CENSOR = '[Redacted]';

// pino-roll options (file path is joined with process.cwd() at call site,
// since it can't be a static constant). See
// https://github.com/mcollina/pino-roll for option semantics.
export const PINO_ROLL_OPTIONS = {
  frequency: 'daily' as const,
  size: '100m',
  limit: { count: 30 },
  mkdir: true,
  extension: '.log',
  dateFormat: 'yyyy-MM-dd',
  symlink: false,
};
