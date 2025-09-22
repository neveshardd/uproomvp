import React, { useEffect, useRef } from 'react'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { 
  FileText, 
  Image as ImageIcon, 
  File,
  Download,
  Clock
} from 'lucide-react'

interface MessageAttachment {
  id: string
  name: string
  size: number
  type: string
  url: string
}

interface Message {
  id: string
  content: string
  user_id: string
  user_name: string
  user_avatar?: string
  created_at: string
  attachments?: MessageAttachment[]
  is_system?: boolean
}

interface MessageListProps {
  messages: Message[]
  currentUserId?: string
  loading?: boolean
  className?: string
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  loading = false,
  className = ""
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />
    } else if (type.includes('text') || type.includes('document')) {
      return <FileText className="h-4 w-4" />
    } else {
      return <File className="h-4 w-4" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const isOwnMessage = (userId: string) => {
    return currentUserId === userId
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-gray-500">Loading messages...</p>
          </div>
        </div>
      </Card>
    )
  }

  if (messages.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <div className="mb-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">No messages yet</h3>
            <p className="text-sm">Start the conversation by sending a message below.</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`${className}`}>
      <div className="p-4 max-h-96 overflow-y-auto space-y-4">
        {messages.map((message, index) => {
          const isOwn = isOwnMessage(message.user_id)
          const showAvatar = !isOwn && (index === 0 || messages[index - 1].user_id !== message.user_id)
          
          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${
                message.is_system ? 'justify-center' : ''
              }`}
            >
              {/* System Message */}
              {message.is_system ? (
                <div className="text-center">
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {message.content}
                  </Badge>
                </div>
              ) : (
                <div className={`flex max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  {!isOwn && (
                    <div className="flex-shrink-0 mr-3">
                      {showAvatar ? (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={message.user_avatar} />
                          <AvatarFallback className="text-xs">
                            {getUserInitials(message.user_name)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-8 w-8" />
                      )}
                    </div>
                  )}

                  {/* Message Content */}
                  <div className={`${isOwn ? 'mr-3' : ''}`}>
                    {/* User Name & Time */}
                    {showAvatar && !isOwn && (
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {message.user_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        isOwn
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {/* Text Content */}
                      {message.content && (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      )}

                      {/* Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className={`${message.content ? 'mt-2' : ''} space-y-2`}>
                          {message.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className={`flex items-center space-x-2 p-2 rounded ${
                                isOwn ? 'bg-blue-700' : 'bg-white border'
                              }`}
                            >
                              {getFileIcon(attachment.type)}
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium truncate ${
                                  isOwn ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {attachment.name}
                                </p>
                                <p className={`text-xs ${
                                  isOwn ? 'text-blue-200' : 'text-gray-500'
                                }`}>
                                  {formatFileSize(attachment.size)}
                                </p>
                              </div>
                              <a
                                href={attachment.url}
                                download={attachment.name}
                                className={`p-1 rounded hover:bg-opacity-80 ${
                                  isOwn ? 'hover:bg-blue-800' : 'hover:bg-gray-100'
                                }`}
                              >
                                <Download className="h-3 w-3" />
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Own Message Time */}
                    {isOwn && (
                      <div className="text-xs text-gray-500 text-right mt-1">
                        {formatTime(message.created_at)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
    </Card>
  )
}

export default MessageList