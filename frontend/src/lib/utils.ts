import { triggerDocumentDownload, triggerDocumentPublicDownload } from "@/features/documents/documents.api";
import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

export const appVersion: string = '2.0.0';
export const appName: string = import.meta.env.VITE_APP_NAME || 'SMART-SB';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const lpad = (value: number | string, pad = '0', len = 2) => {
  const v = value+'';
  const l = len - v.length;
  if(l > 0){
    return pad.repeat(l)+v;
  }else{
    return v;
  }
}

export const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (dateString: string) => {
  if (!dateString) return 'N/A';
  return format(new Date(dateString), 'MMM d, yyyy h:mm a');
};

export const handleDocumentDownload = async (docId: string) => {
  try {
    await triggerDocumentDownload(Number(docId));
  } catch (error) {
    console.error('Download failed:', error);
    // Show error toast/notification
  }
};

export const handleDocumentPublicDownload = async (docId: string) => {
  try {
    await triggerDocumentPublicDownload(Number(docId));
  } catch (error) {
    console.error('Download failed:', error);
    // Show error toast/notification
  }
};

export const handleTextAreaResizeOnFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
  e.target.style.height = 'auto';
  e.target.style.height = `${e.target.scrollHeight}px`;
};

export const handleTextAreaResize = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};



export const getTypeBadgeVariant = (type: string) => {
  switch (type) {
    case 'ordinance':
    case 'resolution':
    case 'report':
      return 'secondary';
    case 'minutes':
    case 'session':
      return 'outline';
    default:
      return 'outline';
  }
};

// Format member name
export const formatMemberName = (member: any) => {
  return `${member.prefix ? member.prefix + ". " : ""}${
    member.first_name
  }${member.middle_name ? " " + member.middle_name[0] + "." : ""} ${
    member.last_name
  }${member.suffix ? ", " + member.suffix : ""}`;
};

export const base_filename = (filePath: string) =>  filePath ? filePath.split("/").pop() : filePath;