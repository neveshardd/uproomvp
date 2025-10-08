import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { config } from './config';

// Singleton pattern para Prisma Client
declare global {
  var __prisma: PrismaClient | undefined;
}

// Configuração otimizada do Prisma Client
const createPrismaClient = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: config.DATABASE_URL,
      },
    },
    log: config.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
    errorFormat: 'pretty',
  });
};

// Reutilizar instância em desenvolvimento para evitar múltiplas conexões
export const prisma = globalThis.__prisma || createPrismaClient();

if (config.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// Graceful shutdown
export const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    console.log('Conexão com banco de dados encerrada');
  } catch (error) {
    console.error('Erro ao desconectar do banco:', error);
  }
};

// Health check do banco
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Erro na conexão com banco:', error);
    return false;
  }
};
