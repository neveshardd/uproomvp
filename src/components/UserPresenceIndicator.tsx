import React from 'react'
import { Badge } from './ui/badge'
import { Circle } from 'lucide-react'
import { UserPresence } from '../hooks/usePresence'

interface UserPresenceIndicatorProps {
  status: UserPresence['status']
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

const UserPresenceIndicator: React.FC<UserPresenceIndicatorProps> = ({
  status,
  size = 'sm',
  showText = false,
  className = ''
}) => {
  const getStatusConfig = (status: UserPresence['status']) => {
    switch (status) {
      case 'available':
        return {
          color: 'bg-green-500',
          text: 'Available',
          textColor: 'text-green-600'
        }
      case 'focus':
        return {
          color: 'bg-purple-500',
          text: 'Focus',
          textColor: 'text-purple-600'
        }
      case 'meeting':
        return {
          color: 'bg-blue-500',
          text: 'Meeting',
          textColor: 'text-blue-600'
        }
      case 'away':
        return {
          color: 'bg-yellow-500',
          text: 'Away',
          textColor: 'text-yellow-600'
        }
      case 'break':
        return {
          color: 'bg-orange-500',
          text: 'Break',
          textColor: 'text-orange-600'
        }
      case 'emergency':
        return {
          color: 'bg-red-500',
          text: 'Emergency',
          textColor: 'text-red-600'
        }
      case 'offline':
      default:
        return {
          color: 'bg-gray-400',
          text: 'Offline',
          textColor: 'text-gray-500'
        }
    }
  }

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'lg':
        return 'w-4 h-4'
      case 'md':
        return 'w-3 h-3'
      case 'sm':
      default:
        return 'w-2 h-2'
    }
  }

  const config = getStatusConfig(status)
  const sizeClasses = getSizeClasses(size)

  if (showText) {
    return (
      <Badge variant="outline" className={`${config.textColor} ${className}`}>
        <Circle className={`${sizeClasses} ${config.color} mr-1 fill-current`} />
        {config.text}
      </Badge>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <Circle className={`${sizeClasses} ${config.color} fill-current`} />
    </div>
  )
}

export default UserPresenceIndicator