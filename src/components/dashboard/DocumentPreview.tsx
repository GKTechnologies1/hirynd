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
  const fileUrl = getFileUrl(url);

  if (!url) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Check if file exists before opening
      const response = await fetch(fileUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error('File not found');
      }

      const isDoc = fileUrl.toLowerCase().endsWith('.docx') || fileUrl.toLowerCase().endsWith('.doc');
      const finalUrl = isDoc 
        ? `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`
        : fileUrl;
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast({
        title: "Document unavailable",
        description: "The requested file could not be found or is currently inaccessible.",
        variant: "destructive"
      });
    }
  };

  if (variant === 'button') {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className={cn("h-8 gap-2 text-xs font-semibold rounded-xl", className)}
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
        className={cn("h-8 w-8 rounded-full", className)}
        onClick={handleClick}
        title={typeof label === 'string' ? label : undefined}
      >
        {React.isValidElement(label) ? label : <ExternalLink className={cn("h-4 w-4 text-secondary", iconClassName)} />}
      </Button>
    );
  }

    const isDoc = fileUrl.toLowerCase().endsWith('.docx') || fileUrl.toLowerCase().endsWith('.doc');
    const finalUrl = isDoc 
      ? `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`
      : fileUrl;

    return (
      <a 
        href={finalUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-1.5 text-secondary hover:text-secondary/80 underline underline-offset-4 decoration-secondary/30 transition-all font-medium",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <FileText className={cn("h-3.5 w-3.5", iconClassName)} />
        {showLabel && label}
      </a>
    );
};

export default DocumentPreview;
