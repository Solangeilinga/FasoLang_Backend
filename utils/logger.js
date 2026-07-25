// ✅ Logger conditionnel : actif seulement hors production
const isDev = process.env.NODE_ENV !== 'production';

const logger = {
  log: (...args) => { if (isDev) console.log(...args); },
  warn: (...args) => { if (isDev) console.warn(...args); },
  error: (...args) => console.error(...args), // erreurs toujours loguées
  info: (...args) => { if (isDev) console.log('[INFO]', ...args); },
};

export default logger;