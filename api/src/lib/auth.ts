import 'dotenv/config';
import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from './prisma';
import { supabase } from './supabase';

const authHeaderSchema = z.object({
  authorization: z.string().regex(/^Bearer .+$/),
});

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
  };
}

export const authenticateUser = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { authorization } = authHeaderSchema.parse(request.headers);
    const token = authorization.replace('Bearer ', '');

    console.log('Token recebido:', token.substring(0, 20) + '...');
    
    // Verificar token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.log('Token inválido ou usuário não encontrado:', error?.message);
      return reply.status(401).send({ error: 'Token inválido' });
    }

    // Buscar dados do usuário no banco local
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      console.log('Usuário não encontrado no banco local:', user.id);
      return reply.status(404).send({ error: 'Usuário não encontrado' });
    }
    
    console.log('Usuário autenticado:', { id: dbUser.id, email: dbUser.email });
    
    (request as AuthenticatedRequest).user = {
      id: dbUser.id,
      email: dbUser.email,
    };
    
  } catch (error) {
    console.error('Authentication error:', error);
    return reply.status(401).send({ error: 'Token de autenticação inválido' });
  }
};
