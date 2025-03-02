import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { MediaItem } from "@/types/media.types";

interface MediaCardProps {
  item: MediaItem;
  onSelect?: (item: MediaItem) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, onSelect }) => {
  // Handle missing URL by using a placeholder
  const imageUrl = item.url || "https://placehold.co/600x400?text=No+Image";

  // Extract title and description from item
  const title = item.title || item.bildnummer || "Untitled";
  const description = item.description || item.suchtext || "";

  return (
    <Card
      className="overflow-hidden transition-all hover:scale-[1.02] cursor-pointer"
      onClick={() => onSelect?.(item)}
    >
      <CardHeader className="p-0">
        <AspectRatio ratio={16 / 9}>
          <img
            src={imageUrl}
            alt={title}
            className="object-cover w-full h-full"
            loading="lazy"
            onError={(e) => {
              // Fallback to placeholder if image fails to load
              (e.target as HTMLImageElement).src =
                "https://placehold.co/600x400?text=Error+Loading";
            }}
          />
        </AspectRatio>
      </CardHeader>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg truncate">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <span className="text-xs text-muted-foreground">
          {item.type ? `Type: ${item.type.toUpperCase()}` : item.db || ""}
        </span>
      </CardFooter>
    </Card>
  );
};
