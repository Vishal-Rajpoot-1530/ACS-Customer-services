import { DocumentStatus } from '../constants/documentStatus.constant';
import { PrintOptions } from '../types/document.types';

export interface IDocument {
  id: string;
  _id?: string;
  userId: string;
  originalName: string;
  storedName: string;
  s3Bucket: string;
  s3Key: string;
  mimeType: string;
  extension: string;
  size: number;
  status: DocumentStatus;
  category: string;
  notes?: string;
  importedBy: string;
  userEmail: string;
  importedAt: string;
  printOptions?: PrintOptions;
  createdAt: Date;
  updatedAt: Date;
}

export const documentId = (document: { id?: string; _id?: string }): string => {
  const id = document.id || document._id;
  if (!id) throw new Error('Document has no identifier');
  return id.toString();
};
