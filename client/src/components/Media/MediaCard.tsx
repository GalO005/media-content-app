import React from 'react'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { MediaItem } from '@/types/media.types'

interface MediaCardProps {
  item: MediaItem
  onSelect?: (item: MediaItem) => void
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, onSelect }) => {
  return (
    <Card 
      className="overflow-hidden transition-all hover:scale-[1.02]"
      onClick={() => onSelect?.(item)}
    >
      <CardHeader className="p-0">
        <AspectRatio ratio={16 / 9}>
          <img
            src={item.url}
            alt={item.title || 'Media item'}
            className="object-cover w-full h-full"
            loading="lazy"
          />
        </AspectRatio>
      </CardHeader>
      <CardContent className="p-4">
        {item.title && (
          <h3 className="font-semibold text-lg truncate">
            {item.title}
          </h3>
        )}
        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {item.description}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <span className="text-xs text-muted-foreground">
          Type: {item.type.toUpperCase()}
        </span>
      </CardFooter>
    </Card>
  )
}