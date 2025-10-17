/**
 * CachedImage Component
 *
 * Automatically uses cached image URLs when available, falls back to S3 URLs
 */

import { useState, useEffect } from "react";
import { imageCache } from "../utils/imageCache";

interface CachedImageProps {
  s3_url: string;
  alt: string;
  style?: React.CSSProperties;
  loading?: "lazy" | "eager";
  onClick?: () => void;
}

export function CachedImage({
  s3_url,
  alt,
  style,
  loading = "lazy",
  onClick,
}: CachedImageProps) {
  const [imageUrl, setImageUrl] = useState<string>(s3_url);

  useEffect(() => {
    let mounted = true;

    async function loadCachedUrl() {
      try {
        const cachedUrl = await imageCache.getCachedUrl(s3_url);
        if (mounted) {
          setImageUrl(cachedUrl);
        }
      } catch (error) {
        console.error("Failed to get cached URL:", error);
        // Fall back to S3 URL
        if (mounted) {
          setImageUrl(s3_url);
        }
      }
    }

    loadCachedUrl();

    return () => {
      mounted = false;
    };
  }, [s3_url]);

  return (
    <img
      src={imageUrl}
      alt={alt}
      loading={loading}
      style={style}
      onClick={onClick}
      onError={() => {
        // If cached image fails, fall back to S3 URL
        if (imageUrl !== s3_url) {
          console.warn("Cached image failed, falling back to S3:", s3_url);
          setImageUrl(s3_url);
        }
      }}
    />
  );
}
