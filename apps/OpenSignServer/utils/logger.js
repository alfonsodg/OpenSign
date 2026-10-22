// Structured logger: one JSON object per line, with a level and an optional
// request id, so a single signing or mail flow can be followed in the logs.
const SENSITIVE_KEY = /pass(word)?|secret|token|key|authorization|cookie/i;

const redact = value => {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redact);
  return Object.fromEntries(
    Object.entries(value).map(([key, val]) => [
      key,
      SENSITIVE_KEY.test(key) && typeof val !== 'object' ? '[redacted]' : redact(val),
    ])
  );
};

const emit = (level, message, context = {}) => {
  const entry = {
    level,
    message: String(message),
    time: new Date().toISOString(),
    ...redact(context || {}),
  };
  let line;
  try {
    line = JSON.stringify(entry);
  } catch {
    // A non-serialisable context must never break the request.
    line = JSON.stringify({ level, message: String(message), time: entry.time });
  }
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
};

export const logger = {
  info: (message, context) => emit('info', message, context),
  warn: (message, context) => emit('warn', message, context),
  error: (message, context) => emit('error', message, context),
};

export default logger;
