/**
 * Format time in seconds to MM:SS format
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format date to relative time (Korean)
 */
export const formatRelativeDate = (date: Date | string): string => {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - targetDate.getTime();
  const diffMinutes = Math.floor(diff / (1000 * 60));
  const diffHours = Math.floor(diff / (1000 * 60 * 60));
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return '방금 전';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  } else if (diffHours < 24) {
    return `${diffHours}시간 전`;
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  } else {
    return targetDate.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

/**
 * Validate audio file constraints
 */
export const validateAudioFile = (blob: Blob, duration: number) => {
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  const maxDuration = 600; // 10 minutes

  if (blob.size > maxFileSize) {
    throw new Error('파일 크기는 10MB를 초과할 수 없습니다.');
  }

  if (duration > maxDuration) {
    throw new Error('녹음 시간은 10분을 초과할 수 없습니다.');
  }

  // Check if it's an audio file
  if (!blob.type.startsWith('audio/')) {
    throw new Error('오디오 파일만 업로드할 수 있습니다.');
  }

  return true;
};

/**
 * Create a secure filename for audio uploads
 */
export const createSecureFileName = (userId: string, extension: string = 'webm'): string => {
  const timestamp = Date.now();
  const randomId = crypto.randomUUID();
  return `${userId}/${randomId}_${timestamp}.${extension}`;
};

/**
 * Download audio file
 */
export const downloadAudioFile = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Share audio file using Web Share API or fallback to download
 */
export const shareAudioFile = async (blob: Blob, title: string): Promise<void> => {
  try {
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], `${title}.webm`, {
        type: blob.type
      });
      
      await navigator.share({
        title,
        files: [file]
      });
    } else {
      // Fallback to download
      downloadAudioFile(blob, `${title}.webm`);
      throw new Error('FALLBACK_DOWNLOAD');
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'FALLBACK_DOWNLOAD') {
      // This is expected for the fallback case
      return;
    }
    throw error;
  }
};