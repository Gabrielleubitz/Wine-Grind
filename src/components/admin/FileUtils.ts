/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file type label
 */
export const getFileTypeLabel = (fileType: string): string => {
  if (fileType.includes('pdf')) return 'PDF Document';
  if (fileType.includes('image/jpeg')) return 'JPEG Image';
  if (fileType.includes('image/png')) return 'PNG Image';
  if (fileType.includes('image/gif')) return 'GIF Image';
  if (fileType.includes('powerpoint')) return 'PowerPoint Presentation';
  if (fileType.includes('word')) return 'Word Document';
  if (fileType.includes('text/plain')) return 'Text Document';
  
  return fileType.split('/')[1]?.toUpperCase() || 'Unknown File Type';
};

/**
 * Format timestamp for display
 */
export const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return 'N/A';
  
  let date;
  if (timestamp?.toDate) {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};