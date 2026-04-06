import toast from 'react-hot-toast';
import { isDev } from '../config/environment';
import { logger } from './logger';
import type { LogLevel } from './logger';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  customMessage?: string;
  logData?: unknown;
  logLevel?: Exclude<LogLevel, 'info'>;
  silent?: boolean;
}

export function handleError(error: unknown, options: ErrorHandlerOptions = {}) {
  const { showToast = true, customMessage, logData, logLevel = 'error', silent = false } = options;
  
  let errorMessage = 'An error occurred';
  let errorDetails: unknown = error;

  if (error instanceof Error) {
    errorMessage = error.message;
    errorDetails = { message: error.message, name: error.name, stack: error.stack };
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object') {
    const anyError = error as Record<string, unknown>;
    errorMessage = anyError.message as string || anyError.msg as string || errorMessage;
    errorDetails = error;
  }

  const displayMessage = customMessage || errorMessage;

  if (silent) {
    if (showToast) {
      toast.error(displayMessage);
    }
    return;
  }

  const payload = { error: errorDetails, ...(logData && { additionalData: logData }) };

  if (logLevel === 'warn') {
    logger.warn(displayMessage, payload);
  } else if (logLevel === 'debug') {
    logger.debug(displayMessage, payload);
  } else {
    logger.error(displayMessage, payload);
  }

  if (!isDev && showToast) {
    toast.error(displayMessage);
  }
}

export function handleSuccess(message: string, options: ErrorHandlerOptions = {}) {
  const { showToast = true, logData } = options;
  
  if (isDev) {
    logger.info(message, logData);
  } else {
    logger.info(message, logData);
    
    if (showToast) {
      toast.success(message);
    }
  }
}
