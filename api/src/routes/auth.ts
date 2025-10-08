import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/database';
import { AuthService } from '../lib/auth-service';
import { 
  signInSchema, 
  signUpSchema, 
  resetPasswordSchema, 
  updatePasswordSchema,
  validateData 
} from '../lib/validation';
import { 
  AuthenticationError, 
  withErrorHandling 
} from '../lib/errors';

export async function authRoutes(fastify: FastifyInstance) {
  // Login otimizado
  fastify.post('/signin', withErrorHandling(async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = validateData(signInSchema, request.body);

    const result = await AuthService.signIn(email, password);

    if (!result.success) {
      throw new AuthenticationError(result.error || 'Falha na autenticação');
    }

    if (!result.user || !result.token) {
      throw new AuthenticationError('Falha na autenticação');
    }

    return {
      user: result.user,
      session: {
        access_token: result.token,
        refresh_token: '', // We'll handle this if needed
        expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        user: result.user
      },
    };
  }));

  // Registro otimizado
  fastify.post('/signup', withErrorHandling(async (request: FastifyRequest, reply: FastifyReply) => {

    const { email, password, fullName } = validateData(signUpSchema, request.body);
    const result = await AuthService.signUp(email, password, fullName);

    if (!result.success) {
      throw new AuthenticationError(result.error || 'Falha ao criar usuário');
    }

    if (!result.user || !result.token) {
      throw new AuthenticationError('Falha ao criar usuário');
    }

    return {
      user: result.user,
      session: {
        access_token: result.token,
        refresh_token: '', // We'll handle this if needed
        expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        user: result.user
      },
      requiresConfirmation: false,
      message: 'Conta criada com sucesso',
    };
  }));

  // Logout otimizado
  fastify.post('/signout', withErrorHandling(async (request: FastifyRequest, reply: FastifyReply) => {
    // With JWT, logout is handled on the client side by removing the token
    // No server-side action needed for stateless JWT
    return { message: 'Logout realizado com sucesso' };
  }));

  // Reset de senha otimizado
  fastify.post('/reset-password', withErrorHandling(async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = validateData(resetPasswordSchema, request.body);

    const result = await AuthService.resetPassword(email);

    if (!result.success) {
      throw new AuthenticationError(result.error || 'Falha ao enviar email de recuperação');
    }

    return { message: 'Email de recuperação enviado' };
  }));

  // Atualizar senha otimizado
  fastify.post('/update-password', withErrorHandling(async (request: FastifyRequest, reply: FastifyReply) => {
    const { password } = validateData(updatePasswordSchema, request.body);
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      throw new AuthenticationError('Token não fornecido');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const decoded = AuthService.verifyToken(token);
    
    if (!decoded) {
      throw new AuthenticationError('Token inválido');
    }
    
    const result = await AuthService.updatePassword(decoded.userId, password);

    if (!result.success) {
      throw new AuthenticationError(result.error || 'Falha ao atualizar senha');
    }

    return { message: 'Senha atualizada com sucesso' };
  }));

  // Obter perfil do usuário otimizado
  fastify.get('/profile', withErrorHandling(async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new AuthenticationError('Token não fornecido');
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verificar token JWT
    const decoded = AuthService.verifyToken(token);
    
    if (!decoded) {
      throw new AuthenticationError('Token inválido');
    }

    // Buscar dados do usuário no banco local
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!dbUser) {
      return reply.status(404).send({ error: 'Usuário não encontrado' });
    }

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.fullName,
        avatar: dbUser.avatar,
        createdAt: dbUser.createdAt,
      },
    };
  }));

  // Verificar sessão otimizado
  fastify.get('/session', withErrorHandling(async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new AuthenticationError('Token não fornecido');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const decoded = AuthService.verifyToken(token);
    
    if (!decoded) {
      throw new AuthenticationError('Token inválido');
    }

    const user = await AuthService.getUserByToken(token);
    
    if (!user) {
      throw new AuthenticationError('Usuário não encontrado');
    }

    return { 
      session: {
        access_token: token,
        refresh_token: '',
        expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000),
        user: user
      }
    };
  }));

}
