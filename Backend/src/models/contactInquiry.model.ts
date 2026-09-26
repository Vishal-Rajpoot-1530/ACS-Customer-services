export interface IContactInquiry {
  id: string;
  _id?: string;
  name: string;
  mobile: string;
  email: string;
  message: string;
  status: 'new' | 'in_progress' | 'responded';
  createdAt: Date;
}

