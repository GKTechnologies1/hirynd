import React from 'react';
import { FileText, Download, ExternalLink, Eye } from 'lucide-react';
import { getFileUrl } from '@/services/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";

interface DocumentPreviewProps {
  url: string | null | undefined;
  label?: React.ReactNode;
  className?: string;
  iconClassName?: string;
  variant?: 'link' | 'button' | 'icon';
  showLabel?: boolean;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  url,
  label = "Preview Document",
  className,
  iconClassName,
  variant = 'link',
  showLabel = true
}) => {
  const { toast } = useToast();

  if (!url || typeof url !== 'string') return null;

  const fileUrl = getFileUrl(url);
  const previewUrl = `/preview?url=${encodeURIComponent(url)}`;
  const isPreviewable = fileUrl.toLowerCase().match(/\.(doc|docx|xls|xlsx|ppt|pptx|pdf|png|jpg|jpeg|gif|bmp|webp|txt|csv)$/i);
  const targetUrl = isPreviewable ? previewUrl : fileUrl;


  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn("h-8 gap-2 text-xs font-semibold rounded-xl pointer-events-auto", className)}
        onClick={handleClick}
      >
        <Eye className={cn("h-3.5 w-3.5", iconClassName)} />
        {showLabel && label}
      </Button>
    );
  }

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 rounded-full pointer-events-auto", className)}
        onClick={handleClick}
        title={typeof label === 'string' ? label : undefined}
      >
        {React.isValidElement(label) ? label : <ExternalLink className={cn("h-4 w-4 text-secondary", iconClassName)} />}
      </Button>
    );
  }

  return (
    <a
      href={targetUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 text-secondary hover:text-secondary/80 underline underline-offset-4 decoration-secondary/30 transition-all font-medium pointer-events-auto",
        className
      )}
      onClick={handleClick}
    >
      <FileText className={cn("h-3.5 w-3.5", iconClassName)} />
      {showLabel && label}
    </a>
  );
};

export default DocumentPreview;
