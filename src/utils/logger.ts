// Polkadot Password Manager
// Logging utilities for password management

export function createLogger(service: string) {
  return {
    info: (message: string, meta?: any) => {
      console.log(`[${service}] ${message}`, meta || '');
    },
    error: (message: string, meta?: any) => {
      console.error(`[${service}] ${message}`, meta || '');
    },
    warn: (message: string, meta?: any) => {
      console.warn(`[${service}] ${message}`, meta || '');
    },
    debug: (message: string, meta?: any) => {
      console.debug(`[${service}] ${message}`, meta || '');
    }
  };
}
