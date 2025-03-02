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

  // Extract display text from item
  const displayTitle = item.bildnummer || "Untitled";
  const description = item.description || item.suchtext || "";

  // Format the date if available
  const formattedDate = item.datum
    ? new Date(item.datum).toLocaleDateString()
    : "";

  // Get dimensions if available
  const dimensions =
    item.breite && item.hoehe ? `${item.breite} × ${item.hoehe}` : "";

  return (
    <Card
      className="overflow-hidden transition-all hover:scale-[1.02] cursor-pointer"
      onClick={() => onSelect?.(item)}
    >
      <CardHeader className="p-0">
        <AspectRatio ratio={16 / 9}>
          <img
            src={imageUrl}
            alt={displayTitle}
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
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-semibold text-lg truncate">{displayTitle}</h3>
          {dimensions && (
            <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
              {dimensions}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
        {item.fotografen && (
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-medium">Photographer:</span> {item.fotografen}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          {item.type ? `Type: ${item.type.toUpperCase()}` : item.db || ""}
        </span>
        {formattedDate && (
          <span className="text-xs text-muted-foreground">{formattedDate}</span>
        )}
      </CardFooter>
    </Card>
  );
};
