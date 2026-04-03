import toast from 'react-hot-toast';
import { isDev } from '../config/environment';
import { logger } from './logger';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  customMessage?: string;
  logData?: unknown;
}

export function handleError(error: unknown, options: ErrorHandlerOptions = {}) {
  const { showToast = true, customMessage, logData } = options;
  
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

  if (isDev) {
    logger.error(displayMessage, { error: errorDetails, ...(logData && { additionalData: logData }) });
  } else {
    logger.error(displayMessage, { error: errorDetails, ...(logData && { additionalData: logData }) });
    
    if (showToast) {
      toast.error(displayMessage);
    }
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