export const DocumentStatuses = {
  READY: 'ready',
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
} as const;

export type DocumentStatus = (typeof DocumentStatuses)[keyof typeof DocumentStatuses];

export const SupportedCategories = [
  'Print Job',
  'Document Scanning',
  'Online Application',
  'Utility Bill',
  'Govt ID Service',
  'Cyber Cafe Service',
  'Other',
] as const;

export type SupportedCategory = (typeof SupportedCategories)[number];
