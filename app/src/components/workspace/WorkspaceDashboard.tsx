'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useChat } from '@/contexts/ChatContext';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRoleBadge } from './UserRoleBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import WorkspaceHeader from './WorkspaceHeader';
import StatusSelector from './StatusSelector';
import MemberList from './MemberList';
import {
  Bell,
  Search,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Minimize2,
  X,
  Send,
  Pin,
  Plus,
  MessageCircle,
  Menu,
  Settings,
  UserPlus,
  LogOut,
  Building2,
  Mail,
  User
} from 'lucide-react';

export default function WorkspaceDashboard({ company }: { company: any }) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { currentCompany, inviteUser, userRole, loadWorkspaceData } = useCompany();
  const { toast } = useToast();
  const { 
    state: chatState, 
    sendMessage, 
    sendTyping, 
    selectConversation, 
    createConversation,
    pinMessage,
    unpinMessage,
    markAsRead,
    isConnected,
    isConnecting 
  } = useChat();
  const { canAccessSettings, canInviteUsers } = usePermissions();

  // Carregar dados da workspace quando o componente montar
  useEffect(() => {
    if (company && user && loadWorkspaceData) {
      console.log('🔍 WorkspaceDashboard: Loading workspace data for company:', company.id);
      loadWorkspaceData(company);
    }
  }, [company?.id, user?.id, loadWorkspaceData]);

  // Função temporária para corrigir membros faltantes
  const handleFixMembers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333').replace(/\/$/, '');
      
      const response = await fetch(`${apiUrl}/companies/fix-members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log('✅ Membros corrigidos:', data);
      
      toast({
        title: 'Sucesso!',
        description: `${data.fixed.length} empresa(s) corrigida(s)`,
      });

      // Recarregar dados da workspace
      if (company && loadWorkspaceData) {
        await loadWorkspaceData(company);
      }
    } catch (error) {
      console.error('❌ Erro ao corrigir membros:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao corrigir membros',
        variant: 'destructive',
      });
    }
  };

  // Debug logs para permissões
  useEffect(() => {
    console.log('🔍 WorkspaceDashboard: userRole:', userRole);
    console.log('🔍 WorkspaceDashboard: canInviteUsers:', canInviteUsers);
    console.log('🔍 WorkspaceDashboard: canAccessSettings:', canAccessSettings);
    console.log('🔍 WorkspaceDashboard: currentCompany:', currentCompany?.name);
    console.log('🔍 WorkspaceDashboard: company prop:', company?.name);
  }, [userRole, canInviteUsers, canAccessSettings, currentCompany, company]);

  // Chat state
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isDirectMessagesOpen, setIsDirectMessagesOpen] = useState(true);
  const [isGroupsOpen, setIsGroupsOpen] = useState(true);
  const [isChatExpanded, setIsChatExpanded] = useState(true);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);


  // Workspace popup states
  const [isWorkspacePopupOpen, setIsWorkspacePopupOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  // Create group modal states
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Member list modal state
  const [isMemberListOpen, setIsMemberListOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateInviteLink = async () => {
    setIsGenerating(true);
    try {
      console.log('🔍 Gerando link de convite:', {
        role: inviteRole,
        company: currentCompany?.name,
        userRole
      });
      
      const result = await inviteUser(inviteRole);
      
      console.log('🔍 Resultado do convite:', result);
      
      if (result.success) {
        const invitationUrl = result.data?.invitationUrl || result.data?.invitePath;
        
        if (invitationUrl) {
          setGeneratedLink(invitationUrl);
          
          // Copiar link para clipboard automaticamente
          if (navigator.clipboard) {
            navigator.clipboard.writeText(invitationUrl).then(() => {
              toast({
                title: 'Link Gerado!',
                description: 'Link de convite copiado para a área de transferência',
                duration: 5000,
              });
            }).catch(err => {
              console.log('❌ Erro ao copiar link:', err);
              toast({
                title: 'Link Gerado!',
                description: 'Link de convite gerado com sucesso',
                duration: 5000,
              });
            });
          } else {
            toast({
              title: 'Link Gerado!',
              description: 'Link de convite gerado com sucesso',
              duration: 5000,
            });
          }
        }
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Falha ao gerar link de convite',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao gerar convite:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao gerar link de convite',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (generatedLink && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(generatedLink);
        toast({
          title: 'Copiado!',
          description: 'Link copiado para a área de transferência',
        });
      } catch (err) {
        console.error('Erro ao copiar:', err);
      }
    }
  };

  const handleCloseInviteDialog = () => {
    setIsInviteDialogOpen(false);
    setGeneratedLink(null);
    setIsWorkspacePopupOpen(false);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a group name',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingGroup(true);
    try {
      const conversation = await createConversation(groupName, [], 'GROUP');
      if (conversation) {
        toast({
          title: 'Grupo criado',
          description: `Grupo "${groupName}" foi criado com sucesso`,
        });
        setGroupName('');
        setIsCreateGroupDialogOpen(false);
        // Selecionar o grupo recém-criado
        handleSelectChat(conversation.id);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create group',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const getCompanyInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'C';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUserInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUserDisplayName = () => {
    return user?.fullName || user?.email?.split('@')[0] || 'User';
  };

  // Separar conversas por tipo e remover duplicatas
  const directMessages = chatState.conversations
    .filter(conv => conv.type === 'DIRECT')
    .reduce((acc: any[], current: any) => {
      // Verificar se já existe uma conversa direta com os mesmos participantes
      const existingConv = acc.find(conv => {
        if (conv.type !== 'DIRECT') return false;
        const currentParticipants = current.participants?.map((p: any) => p.userId).sort() || [];
        const existingParticipants = conv.participants?.map((p: any) => p.userId).sort() || [];
        return JSON.stringify(currentParticipants) === JSON.stringify(existingParticipants);
      });
      
      if (!existingConv) {
        acc.push(current);
      }
      return acc;
    }, []);
    
  const groups = chatState.conversations.filter(conv => conv.type === 'GROUP');

  // Função para obter as mensagens do chat selecionado
  const getCurrentMessages = () => {
    if (!selectedChat) return [];
    const messages = chatState.messages[selectedChat] || [];
    
    // Remover duplicatas baseado no ID da mensagem
    const uniqueMessages = messages.reduce((acc: any[], current: any) => {
      const existingMessage = acc.find(msg => msg.id === current.id);
      if (!existingMessage) {
        acc.push(current);
      }
      return acc;
    }, []);
    
    return uniqueMessages;
  };

  // Função para obter mensagens fixadas
  const getPinnedMessages = () => {
    if (!selectedChat) return [];
    const messages = getCurrentMessages();
    const pinnedMessages = messages.filter(msg => msg.isPinned);
    console.log('🔍 Debug - Mensagens fixadas:', {
      totalMessages: messages.length,
      pinnedMessages: pinnedMessages.length,
      selectedChat,
      messages: messages.map(m => ({ id: m.id, isPinned: m.isPinned, content: m.content.substring(0, 20) }))
    });
    return pinnedMessages;
  };

  // Função para obter mensagens normais (não fixadas)
  const getNormalMessages = () => {
    if (!selectedChat) return [];
    return getCurrentMessages().filter(msg => !msg.isPinned);
  };

  // Função para contar mensagens fixadas
  const getPinnedCount = () => {
    return getPinnedMessages().length;
  };

  // Função para calcular mensagens não lidas baseada no estado do chat
  const getUnreadCount = (conversationId: string) => {
    const conversation = chatState.conversations.find(conv => conv.id === conversationId);
    if (!conversation) return 0;

    // Se o chat está aberto (selectedChat === conversationId), não há mensagens não lidas
    if (selectedChat === conversationId) {
      return 0;
    }

    // Se o chat está fechado, calcular baseado nas mensagens
    const messages = chatState.messages[conversationId] || [];
    const lastReadMessageId = (conversation as any).lastReadMessageId || null;
    
    if (!lastReadMessageId) {
      // Se nunca leu, todas as mensagens são não lidas
      return messages.length;
    }

    // Encontrar a posição da última mensagem lida
    const lastReadIndex = messages.findIndex(msg => msg.id === lastReadMessageId);
    if (lastReadIndex === -1) {
      // Se não encontrou a mensagem, todas são não lidas
      return messages.length;
    }

    // Retornar o número de mensagens após a última lida
    return messages.length - lastReadIndex - 1;
  };

  // Função para obter informações do chat selecionado
  const getCurrentChatInfo = () => {
    if (!selectedChat) return null;
    return chatState.conversations.find(conv => conv.id === selectedChat);
  };

  // Verificar se há conversas disponíveis
  const hasConversations = chatState.conversations.length > 0;
  
  // Chat deve estar fechado se não há conversas
  useEffect(() => {
    if (!hasConversations) {
      setIsChatExpanded(false);
      setSelectedChat(null);
    }
  }, [hasConversations]);

  // Função estável para marcar como lida
  const handleMarkAsRead = useCallback((conversationId: string, messageId: string) => {
    markAsRead(conversationId, messageId);
  }, [markAsRead]);

  // Marcar mensagens como lidas quando o chat é aberto
  useEffect(() => {
    if (selectedChat && chatState.messages[selectedChat]?.length > 0) {
      const messages = chatState.messages[selectedChat];
      const lastMessage = messages[messages.length - 1];
      
      // Marcar a última mensagem como lida (só se for de outro usuário)
      if (lastMessage && lastMessage.userId !== user?.id) {
        // Verificar se já foi marcada como lida para evitar loops
        const conversation = chatState.conversations.find(conv => conv.id === selectedChat);
        if (conversation && (conversation as any).lastReadMessageId !== lastMessage.id) {
          handleMarkAsRead(selectedChat, lastMessage.id);
        }
      }
    }
  }, [selectedChat, user?.id, chatState.messages, chatState.conversations, handleMarkAsRead]);

  // Função para enviar mensagem
  const handleSendMessage = () => {
    if (!message.trim() || !selectedChat) return;
    
    sendMessage(message, selectedChat);
    setMessage('');
    
    // Parar indicador de digitação
    if (isTyping) {
      sendTyping(selectedChat, false);
      setIsTyping(false);
    }
  };

  // Função para lidar com digitação
  const handleTyping = (value: string) => {
    setMessage(value);
    
    if (!selectedChat) return;
    
    if (value.trim() && !isTyping) {
      sendTyping(selectedChat, true);
      setIsTyping(true);
    } else if (!value.trim() && isTyping) {
      sendTyping(selectedChat, false);
      setIsTyping(false);
    }
    
    // Limpar timeout anterior
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Parar indicador de digitação após 3 segundos
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        sendTyping(selectedChat, false);
        setIsTyping(false);
      }
    }, 3000);
  };

  // Função para selecionar conversa
  const handleSelectChat = (conversationId: string) => {
    setSelectedChat(conversationId);
    selectConversation(conversationId);
    setIsChatExpanded(true);
    setIsChatCollapsed(false);
  };

  const teamMembers = [
    {
      id: 1,
      name: 'Michael Davis',
      title: 'System Admin',
      time: '2h',
      description: 'System administrator with expertise in Linux systems and...',
      status: 'Offline',
      statusColor: 'bg-background',
      avatar: 'MD',
      apps: ['Figma', 'Trello'],
      extraApps: 2
    },
    {
      id: 2,
      name: 'Laura Thompson',
      title: 'UX Researcher',
      time: '2h',
      description: 'UX researcher passionate about understanding user beha...',
      status: 'Offline',
      statusColor: 'bg-background',
      avatar: 'LT',
      apps: ['Trello', 'Google Drive'],
      extraApps: 2
    },
    {
      id: 3,
      name: 'Thomas Mitchell',
      title: 'Product Designer',
      time: '2h',
      description: 'Product designer focused on creating user-centered desi...',
      status: 'Offline',
      statusColor: 'bg-background',
      avatar: 'TM',
      apps: ['Jira'],
      extraApps: 0
    },
    {
      id: 4,
      name: 'Emma Johnson',
      title: 'Marketing Specialist',
      time: '2h',
      description: 'Marketing specialist focused on digital campaigns and bra...',
      status: 'Focus',
      statusColor: 'bg-purple-600',
      avatar: 'EJ',
      apps: ['Microsoft Teams'],
      extraApps: 0
    },
    {
      id: 5,
      name: 'Rachel Green',
      title: 'Content Writer',
      time: '2h',
      description: 'Creative content writer specializing in engaging copy and...',
      status: 'Available',
      statusColor: 'bg-green-600',
      avatar: 'RG',
      apps: ['Jira', 'Figma'],
      extraApps: 1,
      online: true
    },
    {
      id: 6,
      name: 'Maria Rodriguez',
      title: 'Data Analyst',
      time: '2h',
      description: 'Data analyst specializing in business intelligence and repo...',
      status: 'Available',
      statusColor: 'bg-green-600',
      avatar: 'MR',
      apps: ['Google Drive', 'Google Meet'],
      extraApps: 1,
      online: true
    },
    {
      id: 7,
      name: 'Emily Watson',
      title: 'Data Scientist',
      time: '2h',
      description: 'Building ML model for user behavior prediction',
      status: 'Offline',
      statusColor: 'bg-background',
      avatar: 'EW',
      apps: [],
      extraApps: 0
    },
    {
      id: 8,
      name: 'Olivia White',
      title: 'Graphic Designer',
      time: '2h',
      description: 'Graphic designer with a passion for creating visually com...',
      status: 'Offline',
      statusColor: 'bg-background',
      avatar: 'OW',
      apps: [],
      extraApps: 0
    },
    {
      id: 9,
      name: 'David Chen',
      title: 'Frontend Developer',
      time: '1h',
      description: 'Frontend developer specializing in React and modern web technologies...',
      status: 'Available',
      statusColor: 'bg-green-600',
      avatar: 'DC',
      apps: ['VS Code', 'GitHub'],
      extraApps: 1,
      online: true
    },
    {
      id: 10,
      name: 'Sarah Wilson',
      title: 'Backend Developer',
      time: '3h',
      description: 'Backend developer with expertise in Node.js and microservices...',
      status: 'Focus',
      statusColor: 'bg-purple-600',
      avatar: 'SW',
      apps: ['Docker', 'AWS'],
      extraApps: 0
    },
    {
      id: 11,
      name: 'James Brown',
      title: 'DevOps Engineer',
      time: '4h',
      description: 'DevOps engineer focused on automation and infrastructure...',
      status: 'Offline',
      statusColor: 'bg-background',
      avatar: 'JB',
      apps: ['Kubernetes', 'Jenkins'],
      extraApps: 1
    },
    {
      id: 12,
      name: 'Lisa Anderson',
      title: 'QA Engineer',
      time: '1h',
      description: 'QA engineer ensuring software quality and testing automation...',
      status: 'Available',
      statusColor: 'bg-green-600',
      avatar: 'LA',
      apps: ['Selenium', 'Postman'],
      extraApps: 2,
      online: true
    }
  ];

  return (
    <div className="h-screen bg-background text-white flex flex-col">
      {/* Workspace Header */}
      <WorkspaceHeader company={company || currentCompany} />
      
      {/* Top Header - User Info + Search/Sort/Create Group - Fixed */}
      <div className="bg-background border-b border-zinc-800 px-5 py-6 flex items-center justify-between fixed top-0 left-0 md:left-64 right-0 z-50">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="md:hidden text-gray-400 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Botão temporário para corrigir membros */}
        {!userRole && (
          <Button
            onClick={handleFixMembers}
            className="bg-red-600 hover:bg-red-700 text-white font-bold"
            size="sm"
          >
            🔧 Corrigir Permissões
          </Button>
        )}

        {/* Search/Sort/Create Group */}
        <div className="flex items-center space-x-4 justify-between w-full mx-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search team members..."
              className="pl-10 bg-background border-2 border-zinc-700 text-white h-full"
            />
          </div>
          <div className='flex items-center space-x-4'>
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white border">
              Sort <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
            <Button 
              size="sm" 
              className="bg-white hover:bg-white/80"
              onClick={() => setIsCreateGroupDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Create Group
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-background bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex relative">
        {/* Left Sidebar - Direct Messages, Groups, Status - Fixed */}
        <div className={`w-64 bg-background border-r border-zinc-800 flex flex-col fixed left-0 top-0 h-screen z-40 transition-transform duration-300 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}>
          {/* User Info */}
          <div className="flex justify-between items-center space-x-4 px-5 py-[14.5px] border-b border-zinc-800">
            <DropdownMenu open={isWorkspacePopupOpen} onOpenChange={setIsWorkspacePopupOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-auto hover:bg-background p-2">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-white/10 text-white">
                      {getUserInitials(user?.fullName || user?.email || 'User')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <span className="font-semibold text-sm">{getUserDisplayName()}</span>
                    <UserRoleBadge />
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <div className="px-2 py-1.5 text-xs text-gray-400">
                  <p className="font-semibold">{user?.email}</p>
                  <p className="text-xs">
                    {userRole === 'OWNER' ? 'Owner' : userRole === 'ADMIN' ? 'Admin' : 'Member'}
                  </p>
                </div>
                <DropdownMenuSeparator />
                {canInviteUsers ? (
                  <DropdownMenuItem onClick={() => setIsInviteDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span>Gerar Link de Convite</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled className="opacity-50">
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span>Gerar Link de Convite</span>
                  </DropdownMenuItem>
                )}
                {canAccessSettings ? (
                  <DropdownMenuItem onClick={() => router.push('/workspaces/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled className="opacity-50">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Bell className="w-5 h-5 text-gray-400" />
          </div>

          {/* Direct Messages */}
          <div className="flex-1 p-4">

            <div
              className="flex items-center justify-between cursor-pointer mb-4"
              onClick={() => setIsDirectMessagesOpen(!isDirectMessagesOpen)}
            >
              <span className="text-sm font-medium text-gray-300">Direct Messages</span>
              {isDirectMessagesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>

            {isDirectMessagesOpen && (
              <div className="space-y-2">
                {/* Botão para iniciar nova conversa */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMemberListOpen(true)}
                  className="w-full bg-transparent border-zinc-600 hover:bg-zinc-700 text-white mb-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Conversa
                </Button>
                
                {directMessages.length > 0 ? (
                  directMessages.map((dm) => {
                    const otherParticipant = dm.participants?.find((p: any) => p.userId !== user?.id);
                    const isOnline = chatState.onlineUsers.has(otherParticipant?.userId || '');
                    const unreadCount = getUnreadCount(dm.id);
                    const totalMessages = chatState.messages[dm.id]?.length || 0;
                    const pinnedCount = (chatState.messages[dm.id] || []).filter((msg: any) => msg.isPinned).length;
                    
                    return (
                      <div
                        key={dm.id}
                        className={`flex items-center justify-between p-2 rounded hover:bg-white/10 cursor-pointer ${selectedChat === dm.id ? 'bg-white/10' : ''
                          }`}
                        onClick={() => handleSelectChat(dm.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-background text-white text-xs">
                                {otherParticipant ? getUserInitials(otherParticipant.user.fullName) : 'U'}
                              </AvatarFallback>
                            </Avatar>
                            {isOnline && (
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                            )}
                          </div>
                          <span className="text-sm">
                            {otherParticipant ? 
                              (otherParticipant.user.fullName || otherParticipant.user.email?.split('@')[0] || 'Unknown User') : 
                              'Unknown User'
                            }
                          </span>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          {unreadCount > 0 && (
                            <Badge className="bg-red-500 text-white text-xs">
                              {unreadCount}
                            </Badge>
                          )}
                          
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-400">Nenhuma conversa direta</p>
                  </div>
                )}
              </div>
            )}

            {/* Groups */}
            <div className="mt-6">
              <div
                className="flex items-center justify-between cursor-pointer mb-4"
                onClick={() => setIsGroupsOpen(!isGroupsOpen)}
              >
                <span className="text-sm font-medium text-gray-300">Groups</span>
                {isGroupsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>

              {isGroupsOpen && (
                <div className="space-y-2">
                  {groups.length > 0 ? (
                    groups.map((group) => {
                      const unreadCount = group.unreadCount || 0;
                      const groupInitials = group.title.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2);
                      
                      return (
                        <div
                          key={group.id}
                          className={`flex items-center justify-between p-2 rounded hover:bg-white/10 cursor-pointer ${selectedChat === group.id ? 'bg-white/10' : ''
                            }`}
                          onClick={() => handleSelectChat(group.id)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-background rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">{groupInitials}</span>
                            </div>
                            <span className="text-sm">{group.title}</span>
                          </div>
                          {unreadCount > 0 && (
                            <Badge className="bg-red-500 text-white text-xs">
                              {unreadCount}
                            </Badge>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-400">Nenhum grupo</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Status Section */}
          <div className="p-4 border-t-2 border-zinc-800">
            <StatusSelector 
              companyId={company?.id || currentCompany?.id}
              className="bg-background border-zinc-700"
            />
          </div>
        </div>

        {/* Center Area - Team Members Grid */}
        <div className={`flex-1 bg-background p-6 overflow-y-auto transition-all duration-300 md:ml-64 ${!isChatExpanded ? '' : isChatCollapsed ? 'mr-96' : 'md:mr-2/5'
          }`} style={{
            marginTop: '0px'    // Sem margem superior
          }}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamMembers.map((member) => (
              <div key={member.id} className="bg-background rounded-lg p-4 hover:bg-background transition-colors border-2 border-zinc-800">
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-background text-white text-sm font-semibold">
                          {member.avatar}
                        </AvatarFallback>
                      </Avatar>
                      {member.online && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-700"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{member.name}</h3>
                      <p className="text-sm text-gray-300">{member.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">{member.time}</span>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-300 mb-3 line-clamp-2">{member.description}</p>

                {/* Status and Apps */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${member.statusColor} text-white`}>
                      {member.status}
                    </span>
                    {member.online && (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    {member.apps.slice(0, 2).map((app, index) => (
                      <div key={index} className="w-6 h-6 bg-background rounded flex items-center justify-center">
                        <span className="text-xs text-white font-semibold">
                          {app.charAt(0)}
                        </span>
                      </div>
                    ))}
                    {member.extraApps > 0 && (
                      <div className="w-6 h-6 bg-background rounded flex items-center justify-center">
                        <span className="text-xs text-white font-semibold">
                          +{member.extraApps}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar - Chat Conversation - Fixed and Overlay */}
        <div className={`bg-background border-l-2 pt-20 border-stone-800 transition-all duration-300 fixed right-0 top-0 h-screen z-30 ${!isChatExpanded ? 'w-0 overflow-hidden' : isChatCollapsed ? 'w-96' : 'w-full md:w-6/12'
          }`}>
          {!isChatExpanded && (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsChatExpanded(true);
                  setIsChatCollapsed(false);
                }}
                className="text-gray-400 hover:text-white"
                title="Abrir chat"
              >
                <MessageCircle className="w-6 h-6" />
              </Button>
            </div>
          )}
          {isChatExpanded && (
            <div className="flex-1 flex flex-col h-full">
              {!selectedChat ? (
                // Estado quando nenhuma conversa está selecionada
                <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-8">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Nenhuma conversa selecionada</h3>
                    <p className="text-gray-400 mb-6">
                      {hasConversations 
                        ? 'Selecione uma conversa na barra lateral para começar a conversar'
                        : 'Crie uma conversa ou grupo para começar a conversar'
                      }
                    </p>
                    {!hasConversations && (
                      <Button 
                        onClick={() => setIsCreateGroupDialogOpen(true)}
                        className="bg-white hover:bg-white/90 text-black"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Primeiro Grupo
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-white/10 text-white text-xs">
                          {getCurrentChatInfo()?.type === 'DIRECT' 
                            ? (() => {
                                const otherParticipant = getCurrentChatInfo()?.participants?.find(p => p.userId !== user?.id);
                                return otherParticipant ? getUserInitials(otherParticipant.user.fullName) : 'U';
                              })()
                            : (() => {
                                const title = getCurrentChatInfo()?.title || '';
                                return title.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2);
                              })()
                          }
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {getCurrentChatInfo()?.type === 'DIRECT' 
                          ? (() => {
                              const otherParticipant = getCurrentChatInfo()?.participants?.find(p => p.userId !== user?.id);
                              return otherParticipant ? 
                                (otherParticipant.user.fullName || otherParticipant.user.email?.split('@')[0] || 'Unknown User') : 
                                'Unknown User';
                            })()
                          : getCurrentChatInfo()?.title || 'Unknown'
                        }
                      </span>
                    </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                    title={isChatCollapsed ? "Expandir chat" : "Colapsar chat"}
                  >
                    <Minimize2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsChatExpanded(false)}
                    title="Fechar chat"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Pinned Messages */}
              {getPinnedCount() > 0 && (
                <div className="p-4 border bg-white/5 border-zinc-700">
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Pin className="w-4 h-4" />
                    <span className="text-sm">
                      {getPinnedCount()} {getPinnedCount() === 1 ? 'mensagem fixada' : 'mensagens fixadas'}
                    </span>
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {/* Mensagens Fixadas */}
                {getPinnedMessages().length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center space-x-2 mb-3 px-2">
                      <span className="text-yellow-400 text-sm font-medium">📌 Mensagens Fixadas ({getPinnedCount()})</span>
                    </div>
                    <div className="space-y-2">
                      {getPinnedMessages().map((msg: any, index: number) => {
                        const isOwn = msg.userId === user?.id;
                        const senderInitials = getUserInitials(msg.user.fullName);
                        
                        return (
                          <div key={`pinned-${msg.id}-${index}-${msg.createdAt}`} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex space-x-2 max-w-xs ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                              {!isOwn && (
                                <Avatar className="w-6 h-6">
                                  <AvatarFallback className="bg-white/5 text-white text-xs">
                                    {senderInitials}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div className={`${isOwn ? 'flex-row-reverse space-x-reverse' : ''} flex space-x-2`}>
                                <div className={`px-3 py-2 rounded-lg border-2 border-yellow-400/30 ${isOwn
                                  ? 'bg-yellow-400/20 text-black'
                                  : 'bg-yellow-400/20 text-white'
                                  }`}>
                                  <p className="text-sm">{msg.content}</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs opacity-70">
                                      {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { 
                                        hour: '2-digit', minute: '2-digit' 
                                      })}
                                    </span>
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs opacity-70">📌</span>
                                      {msg.pinnedBy && (
                                        <span className="text-xs opacity-70">
                                          por {msg.pinnedBy === user?.id ? 'você' : 'outro usuário'}
                                        </span>
                                      )}
                                      <button
                                        onClick={() => unpinMessage(selectedChat!, msg.id)}
                                        className="text-xs opacity-70 hover:opacity-100 transition-opacity"
                                        title="Desfixar mensagem"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Mensagens Normais */}
                {getNormalMessages().map((msg: any, index: number) => {
                  const isOwn = msg.userId === user?.id;
                  const senderInitials = getUserInitials(msg.user.fullName);
                  
                  return (
                    <div key={`${msg.id}-${index}-${msg.createdAt}`} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex space-x-2 max-w-xs ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        {!isOwn && (
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="bg-white/5 text-white text-xs">
                              {senderInitials}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`${isOwn ? 'flex-row-reverse space-x-reverse' : ''} flex space-x-2`}>
                          <div className={`px-3 py-2 rounded-lg ${isOwn
                            ? 'bg-white/90 text-black'
                            : 'bg-white/10 text-white'
                            }`}>
                            <p className="text-sm">{msg.content}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs opacity-70">
                                {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { 
                                  hour: '2-digit', minute: '2-digit' 
                                })}
                              </span>
                              <button
                                onClick={() => pinMessage(selectedChat!, msg.id)}
                                className="text-xs opacity-70 hover:opacity-100 transition-opacity"
                                title="Fixar mensagem"
                              >
                                📌
                              </button>
                            </div>
                          </div>
                          {isOwn && (
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-white/5 text-white text-xs">
                                {getUserInitials(user?.fullName || 'U')}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Indicador de digitação */}
                {selectedChat && chatState.typingUsers[selectedChat] && chatState.typingUsers[selectedChat].length > 0 && (
                  <div className="flex justify-start">
                    <div className="flex items-center space-x-2 bg-white/5 rounded-lg px-3 py-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {chatState.typingUsers[selectedChat].map(u => {
                          // Buscar o nome do usuário que está digitando
                          const currentChat = getCurrentChatInfo();
                          const participant = currentChat?.participants?.find((p: any) => p.userId === u.userId);
                          return participant?.user?.fullName || participant?.user?.email?.split('@')[0] || 'Alguém';
                        }).join(', ')} está digitando...
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t-2 border-zinc-800">
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => handleTyping(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 bg-background border-zinc-700 text-white"
                    disabled={!selectedChat || !isConnected}
                  />
                  <Button 
                    size="sm" 
                    className="bg-white hover:bg-white/90"
                    onClick={handleSendMessage}
                    disabled={!message.trim() || !selectedChat || !isConnected}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Status de conexão */}
                <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center space-x-2">
                    {isConnecting && (
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    )}
                    {isConnected && (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                    {!isConnected && !isConnecting && (
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    )}
                    <span>
                      {isConnecting ? 'Conectando...' : isConnected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                </div>
              </div>
                </>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Create Group Dialog */}
      <Dialog open={isCreateGroupDialogOpen} onOpenChange={setIsCreateGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Grupo</DialogTitle>
            <DialogDescription>
              Crie um novo grupo para conversar com sua equipe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Nome do Grupo</Label>
              <Input
                id="groupName"
                placeholder="Digite o nome do grupo"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateGroup();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateGroupDialogOpen(false);
              setGroupName('');
            }}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGroup} disabled={isCreatingGroup || !groupName.trim()}>
              {isCreatingGroup ? 'Criando...' : 'Criar Grupo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={handleCloseInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Link de Convite</DialogTitle>
            <DialogDescription>
              Gere um link de convite para compartilhar com novos membros.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role do Membro</Label>
              <Select value={inviteRole} onValueChange={(value: 'MEMBER' | 'ADMIN') => setInviteRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>Member</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="ADMIN">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4" />
                      <span>Admin</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {generatedLink ? (
              <div className="space-y-3">
                <Label>Link de Convite Gerado</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={generatedLink}
                    readOnly
                    className="bg-gray-100 text-gray-800"
                  />
                  <Button
                    onClick={handleCopyLink}
                    size="sm"
                    variant="outline"
                  >
                    Copiar
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Compartilhe este link com quem você quer convidar para a workspace.
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">
                  Clique em "Gerar Link" para criar um link de convite.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseInviteDialog}>
              {generatedLink ? 'Fechar' : 'Cancelar'}
            </Button>
            {!generatedLink && (
              <Button onClick={handleGenerateInviteLink} disabled={isGenerating}>
                {isGenerating ? 'Gerando...' : 'Gerar Link'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member List Dialog */}
      <Dialog open={isMemberListOpen} onOpenChange={setIsMemberListOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar Conversa</DialogTitle>
            <DialogDescription>
              Escolha um membro para iniciar uma conversa.
            </DialogDescription>
          </DialogHeader>
          <MemberList 
            companyId={company.id} 
            onClose={() => setIsMemberListOpen(false)} 
          />
        </DialogContent>
      </Dialog>

    </div>
  );
}