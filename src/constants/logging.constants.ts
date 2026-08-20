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
