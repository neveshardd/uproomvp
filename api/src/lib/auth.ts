import 'dotenv/config';
import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from './database';
import { AuthService } from './auth-service';

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

    // Verificar token JWT
    const decoded = AuthService.verifyToken(token);
    
    if (!decoded) {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    // Buscar dados do usuário no banco local
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!dbUser) {
      return reply.status(404).send({ error: 'Usuário não encontrado' });
    }
    
    
    (request as AuthenticatedRequest).user = {
      id: dbUser.id,
      email: dbUser.email,
    };
    
  } catch (error) {
      if (error instanceof z.ZodError) {
      return reply.status(401).send({ error: 'Header de autorização inválido' });
    }
    
    return reply.status(401).send({ error: 'Token de autenticação inválido' });
  }
};
