import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Formatação de datas
export const formatDate = (date: Date | string, formatStr: string = 'dd/MM/yyyy'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: ptBR });
};

export const formatDateTime = (date: Date | string): string => {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
};

export const formatTime = (date: Date | string): string => {
  return formatDate(date, 'HH:mm');
};

export const formatRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { 
    addSuffix: true, 
    locale: ptBR 
  });
};

// Formatação de texto
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const capitalizeFirst = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const capitalizeWords = (text: string): string => {
  return text.split(' ').map(word => capitalizeFirst(word)).join(' ');
};

// Formatação de números
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('pt-BR').format(num);
};

export const formatCurrency = (amount: number, currency: string = 'BRL'): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

// Formatação de arquivos
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Formatação de status
export const formatPresenceStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    ONLINE: 'Online',
    AWAY: 'Ausente',
    BUSY: 'Ocupado',
    OFFLINE: 'Offline',
  };
  
  return statusMap[status] || status;
};

export const formatUserRole = (role: string): string => {
  const roleMap: Record<string, string> = {
    ADMIN: 'Administrador',
    MEMBER: 'Membro',
  };
  
  return roleMap[role] || role;
};

// Formatação de URLs
export const formatSubdomain = (subdomain: string): string => {
  return subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
};

export const formatEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

// Formatação de nomes
export const formatFullName = (firstName?: string, lastName?: string): string => {
  if (!firstName && !lastName) return '';
  if (!firstName) return lastName!;
  if (!lastName) return firstName;
  return `${firstName} ${lastName}`;
};

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
};

// Formatação de mensagens
export const formatMessagePreview = (content: string, maxLength: number = 50): string => {
  const cleanContent = content.replace(/<[^>]*>/g, ''); // Remove HTML tags
  return truncateText(cleanContent, maxLength);
};

// Formatação de tempo de digitação
export const formatTypingIndicator = (users: string[]): string => {
  if (users.length === 0) return '';
  if (users.length === 1) return `${users[0]} está digitando...`;
  if (users.length === 2) return `${users[0]} e ${users[1]} estão digitando...`;
  return `${users[0]} e ${users.length - 1} outros estão digitando...`;
};
