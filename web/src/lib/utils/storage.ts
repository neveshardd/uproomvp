// Utilitários para localStorage e sessionStorage
export const storage = {
  // localStorage
  local: {
    get: <T>(key: string, defaultValue?: T): T | null => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue || null;
      } catch (error) {
        console.error(`Erro ao ler do localStorage: ${key}`, error);
        return defaultValue || null;
      }
    },
    
    set: <T>(key: string, value: T): void => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Erro ao salvar no localStorage: ${key}`, error);
      }
    },
    
    remove: (key: string): void => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Erro ao remover do localStorage: ${key}`, error);
      }
    },
    
    clear: (): void => {
      try {
        localStorage.clear();
      } catch (error) {
        console.error('Erro ao limpar localStorage', error);
      }
    },
  },
  
  // sessionStorage
  session: {
    get: <T>(key: string, defaultValue?: T): T | null => {
      try {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue || null;
      } catch (error) {
        console.error(`Erro ao ler do sessionStorage: ${key}`, error);
        return defaultValue || null;
      }
    },
    
    set: <T>(key: string, value: T): void => {
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Erro ao salvar no sessionStorage: ${key}`, error);
      }
    },
    
    remove: (key: string): void => {
      try {
        sessionStorage.removeItem(key);
      } catch (error) {
        console.error(`Erro ao remover do sessionStorage: ${key}`, error);
      }
    },
    
    clear: (): void => {
      try {
        sessionStorage.clear();
      } catch (error) {
        console.error('Erro ao limpar sessionStorage', error);
      }
    },
  },
};

// Chaves de storage padronizadas
export const STORAGE_KEYS = {
  USER: 'user',
  TOKEN: 'token',
  COMPANY: 'currentCompany',
  THEME: 'theme',
  LANGUAGE: 'language',
  PREFERENCES: 'preferences',
} as const;

// Utilitários específicos para a aplicação
export const appStorage = {
  // Usuário
  getUser: () => storage.local.get(STORAGE_KEYS.USER),
  setUser: (user: any) => storage.local.set(STORAGE_KEYS.USER, user),
  removeUser: () => storage.local.remove(STORAGE_KEYS.USER),
  
  // Token
  getToken: () => storage.local.get(STORAGE_KEYS.TOKEN),
  setToken: (token: string) => storage.local.set(STORAGE_KEYS.TOKEN, token),
  removeToken: () => storage.local.remove(STORAGE_KEYS.TOKEN),
  
  // Empresa atual
  getCurrentCompany: () => storage.local.get(STORAGE_KEYS.COMPANY),
  setCurrentCompany: (company: any) => storage.local.set(STORAGE_KEYS.COMPANY, company),
  removeCurrentCompany: () => storage.local.remove(STORAGE_KEYS.COMPANY),
  
  // Tema
  getTheme: () => storage.local.get(STORAGE_KEYS.THEME, 'light'),
  setTheme: (theme: string) => storage.local.set(STORAGE_KEYS.THEME, theme),
  
  // Idioma
  getLanguage: () => storage.local.get(STORAGE_KEYS.LANGUAGE, 'pt-BR'),
  setLanguage: (language: string) => storage.local.set(STORAGE_KEYS.LANGUAGE, language),
  
  // Preferências
  getPreferences: () => storage.local.get(STORAGE_KEYS.PREFERENCES, {}),
  setPreferences: (preferences: any) => storage.local.set(STORAGE_KEYS.PREFERENCES, preferences),
  
  // Limpar dados do usuário
  clearUserData: () => {
    storage.local.remove(STORAGE_KEYS.USER);
    storage.local.remove(STORAGE_KEYS.TOKEN);
    storage.local.remove(STORAGE_KEYS.COMPANY);
  },
  
  // Limpar todos os dados
  clearAll: () => {
    storage.local.clear();
    storage.session.clear();
  },
};

// Hook para usar storage com React
export const useStorage = <T>(key: string, defaultValue: T) => {
  const getValue = (): T => {
    return storage.local.get(key, defaultValue) || defaultValue;
  };
  
  const setValue = (value: T): void => {
    storage.local.set(key, value);
  };
  
  const removeValue = (): void => {
    storage.local.remove(key);
  };
  
  return { getValue, setValue, removeValue };
};
