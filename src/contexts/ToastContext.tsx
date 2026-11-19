import React, {
  createContext,
  useContext,
  useCallback,
  ReactNode,
} from 'react';
import { Alert } from 'react-native';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration: number;
}

interface ToastContextData {
  addToast: (
    type: ToastType,
    message: string,
    title?: string,
    duration?: number
  ) => void;
  removeToast: (id: string) => void;
  toasts: ToastMessage[];
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }

  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const addToast = useCallback(
    (type: ToastType, message: string, title?: string, duration = 3000) => {
      const alertTitle =
        title ||
        (() => {
          switch (type) {
            case 'success':
              return 'Sucesso';
            case 'error':
              return 'Erro';
            case 'warning':
              return 'Atenção';
            case 'info':
              return 'Informação';
            default:
              return 'Aviso';
          }
        })();

      Alert.alert(alertTitle, message);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    // Alert não precisa ser removido explicitamente
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toasts: [] }}>
      {children}
    </ToastContext.Provider>
  );
};
