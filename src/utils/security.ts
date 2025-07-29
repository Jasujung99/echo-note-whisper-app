/**
 * Security utility functions for input validation and sanitization
 */

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length >= 5 && email.length <= 320;
};

export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  return { valid: true };
};

export const validateUsername = (username: string): { valid: boolean; message?: string } => {
  if (!username || username.length < 2) {
    return { valid: false, message: 'Username must be at least 2 characters long' };
  }
  
  if (username.length > 50) {
    return { valid: false, message: 'Username must be less than 50 characters' };
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { valid: false, message: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  return { valid: true };
};

export const validateAudioFile = (blob: Blob, maxSizeBytes: number = 10 * 1024 * 1024): { valid: boolean; message?: string } => {
  if (blob.size > maxSizeBytes) {
    return { valid: false, message: `File size must be less than ${Math.round(maxSizeBytes / 1024 / 1024)}MB` };
  }
  
  const allowedTypes = ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];
  if (!allowedTypes.includes(blob.type)) {
    return { valid: false, message: 'Only audio files are allowed' };
  }
  
  return { valid: true };
};

export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Encode HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    // Remove potentially dangerous characters
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    // Remove javascript: and data: protocols
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    // Remove SQL injection patterns
    .replace(/union\s+select/gi, '')
    .replace(/drop\s+table/gi, '')
    .replace(/delete\s+from/gi, '')
    .replace(/insert\s+into/gi, '')
    .replace(/update\s+set/gi, '');
};

export const validateAndSanitizeInput = (input: string, maxLength: number = 1000): { valid: boolean; sanitized: string; error?: string } => {
  if (!input || typeof input !== 'string') {
    return { valid: false, sanitized: '', error: 'Input must be a non-empty string' };
  }
  
  if (input.length > maxLength) {
    return { valid: false, sanitized: '', error: `Input exceeds maximum length of ${maxLength} characters` };
  }
  
  const sanitized = sanitizeInput(input);
  
  // Additional validation checks
  const suspiciousPatterns = [
    /\bjavascript:/i,
    /\bdata:/i,
    /\bon\w+\s*=/i, // Event handlers like onclick=
    /\beval\s*\(/i,
    /\bexec\s*\(/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<link/i,
    /<meta/i,
  ];
  
  const hasSuspiciousContent = suspiciousPatterns.some(pattern => pattern.test(input));
  if (hasSuspiciousContent) {
    return { valid: false, sanitized: '', error: 'Input contains potentially malicious content' };
  }
  
  return { valid: true, sanitized };
};

export const generateSecureFileName = (extension: string = 'webm'): string => {
  const timestamp = Date.now();
  const randomId = crypto.randomUUID();
  return `${randomId}_${timestamp}.${extension}`;
};