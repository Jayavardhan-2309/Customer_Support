export type Ticket = {
  id: number;
  status: string;
  priority: string;
  customer: string;
  customer_email: string;
  category: string;
  message: string;
  context?: string;
};

export type Message = {
  sender: string;
  message: string;
};
