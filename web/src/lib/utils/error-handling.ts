import { toast } from 'sonner';

// Tipos de erro
export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  SERVER = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

// Classe de erro customizada
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode?: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    statusCode?: number,
    isOperational: boolean = true
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Mapeamento de erros HTTP para tipos de erro
export const getErrorType = (statusCode: number): ErrorType => {
  switch (statusCode) {
    case 400:
      return ErrorType.VALIDATION;
    case 401:
      return ErrorType.AUTHENTICATION;
    case 403:
      return ErrorType.AUTHORIZATION;
    case 404:
      return ErrorType.NOT_FOUND;
    case 500:
    case 502:
    case 503:
    case 504:
      return ErrorType.SERVER;
    default:
      return ErrorType.UNKNOWN;
  }
};

// Mensagens de erro amigáveis
export const getErrorMessage = (error: Error | AppError): string => {
  if (error instanceof AppError) {
    switch (error.type) {
      case ErrorType.NETWORK:
        return 'Erro de conexão. Verifique sua internet e tente novamente.';
      case ErrorType.VALIDATION:
        return error.message || 'Dados inválidos. Verifique os campos preenchidos.';
      case ErrorType.AUTHENTICATION:
        return 'Sessão expirada. Faça login novamente.';
      case ErrorType.AUTHORIZATION:
        return 'Você não tem permissão para realizar esta ação.';
      case ErrorType.NOT_FOUND:
        return 'Recurso não encontrado.';
      case ErrorType.SERVER:
        return 'Erro interno do servidor. Tente novamente mais tarde.';
      default:
        return error.message || 'Ocorreu um erro inesperado.';
    }
  }

  // Erros de rede
  if (error.message.includes('fetch')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }

  // Erros de timeout
  if (error.message.includes('timeout')) {
    return 'Tempo limite excedido. Tente novamente.';
  }

  return error.message || 'Ocorreu um erro inesperado.';
};

// Handler global de erros
export const handleError = (error: unknown, showToast: boolean = true): AppError => {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Error) {
    appError = new AppError(error.message);
  } else {
    appError = new AppError('Erro desconhecido');
  }

  // Log do erro para debugging
  console.error('🚨 Erro capturado:', {
    message: appError.message,
    type: appError.type,
    statusCode: appError.statusCode,
    stack: appError.stack,
  });

  // Mostrar toast se solicitado
  if (showToast) {
    const message = getErrorMessage(appError);
    toast.error(message);
  }

  return appError;
};

// Hook para tratamento de erros em componentes
export const useErrorHandler = () => {
  const handleErrorCallback = useCallback((error: unknown, showToast: boolean = true) => {
    return handleError(error, showToast);
  }, []);

  return { handleError: handleErrorCallback };
};

// Wrapper para funções assíncronas
export const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  showToast: boolean = true
): T => {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw handleError(error, showToast);
    }
  }) as T;
};

// Retry com backoff exponencial
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

// Validação de resposta da API
export const validateApiResponse = (response: any): boolean => {
  if (!response) return false;
  if (response.error) return false;
  if (response.statusCode && response.statusCode >= 400) return false;
  
  return true;
};

// Error boundary para React
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
    handleError(error, false);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Oops! Algo deu errado
            </h2>
            <p className="text-gray-600 mb-4">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
