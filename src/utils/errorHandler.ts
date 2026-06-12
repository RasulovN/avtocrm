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

export function extractErrorMessage(error: unknown): string {
  if (!error) return 'An error occurred';

  const axiosError = error as { response?: { data?: unknown }; message?: string };
  const data = axiosError.response?.data;

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.msg === 'string') return obj.msg;
    if (typeof obj.detail === 'string') return obj.detail;

    if (Array.isArray(obj.non_field_errors) && obj.non_field_errors.length > 0) {
      return obj.non_field_errors.map(String).join('; ');
    }

    const fieldErrors: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'non_field_errors' || key === 'message' || key === 'msg' || key === 'detail') continue;
      if (Array.isArray(value)) {
        const label = key.replace(/_/g, ' ');
        fieldErrors.push(`${label}: ${value.map(String).join(', ')}`);
      } else if (typeof value === 'object' && value !== null) {
        const nested = value as Record<string, unknown>;
        for (const [nk, nv] of Object.entries(nested)) {
          if (Array.isArray(nv)) {
            fieldErrors.push(`${key}.${nk}: ${nv.map(String).join(', ')}`);
          }
        }
      }
    }
    if (fieldErrors.length > 0) return fieldErrors.join('; ');
  }

  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  return 'An error occurred';
}

export function handleError(error: unknown, options: ErrorHandlerOptions = {}) {
  const { showToast = true, customMessage, logData, logLevel = 'error', silent = false } = options;

  const errorMessage = extractErrorMessage(error);
  const displayMessage = customMessage || errorMessage;

  const errorDetails: unknown = error instanceof Error
    ? { message: error.message, name: error.name, stack: error.stack }
    : error;

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

  if (showToast) {
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
