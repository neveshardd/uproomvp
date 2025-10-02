import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/database';
import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { 
  signInSchema, 
  signUpSchema, 
  resetPasswordSchema, 
  updatePasswordSchema,
  validateData 
} from '../lib/validation';
import { 
  AuthenticationError, 
  ValidationError, 
  withErrorHandling 
} from '../lib/errors';

export async function authRoutes(fastify: FastifyInstance) {
  // Login otimizado
  fastify.post('/signin', withErrorHandling(async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = validateData(signInSchema, request.body);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new AuthenticationError(error.message);
    }

    if (!data.user || !data.session) {
      throw new AuthenticationError('Falha na autenticação');
    }

    // Criar ou atualizar usuário no banco local
    const user = await prisma.user.upsert({
      where: { id: data.user.id },
      update: { 
        email: data.user.email!,
        fullName: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
        avatar: data.user.user_metadata?.avatar_url,
        lastLoginAt: new Date(),
      },
      create: { 
        id: data.user.id,
        email: data.user.email!,
        fullName: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
        avatar: data.user.user_metadata?.avatar_url,
        password: '', // Não precisamos armazenar senha com Supabase
        lastLoginAt: new Date(),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
      },
      session: data.session,
    };
  }));

  // Registro otimizado
  fastify.post('/signup', withErrorHandling(async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password, fullName } = validateData(signUpSchema, request.body);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      throw new AuthenticationError(error.message);
    }

    if (!data.user) {
      throw new AuthenticationError('Falha ao criar usuário');
    }

    // Criar usuário no banco local
    const user = await prisma.user.create({
      data: {
        id: data.user.id,
        email: data.user.email!,
        fullName: fullName,
        password: '', // Não precisamos armazenar senha com Supabase
        createdAt: new Date(),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      requiresConfirmation: !data.session,
      message: data.session ? 'Conta criada com sucesso' : 'Verifique seu email para confirmar a conta',
    };
  }));

  // Logout otimizado
  fastify.post('/signout', withErrorHandling(async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new AuthenticationError('Token não fornecido');
    }

    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw new AuthenticationError(error.message);
    }

    return { message: 'Logout realizado com sucesso' };
  }));

  // Reset de senha otimizado
  fastify.post('/reset-password', withErrorHandling(async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = validateData(resetPasswordSchema, request.body);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${config.FRONTEND_URL}/reset-password`,
    });

    if (error) {
      throw new AuthenticationError(error.message);
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
    
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      throw new AuthenticationError(error.message);
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
    
    // Verificar token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      throw new AuthenticationError('Token inválido');
    }

    // Buscar dados do usuário no banco local
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      throw new NotFoundError('Usuário não encontrado');
    }

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.fullName,
        avatar: dbUser.avatar,
        lastLoginAt: dbUser.lastLoginAt,
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
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      throw new AuthenticationError('Sessão inválida');
    }

    return { session };
  }));
}
