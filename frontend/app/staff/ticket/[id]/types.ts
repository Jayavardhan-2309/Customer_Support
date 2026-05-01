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
  created_at: string;
};

export type PaginatedMessagesResponse = {
  results: Message[];
  count: number;
  total_pages: number;
  current_page: number;
  has_next: boolean;
  has_previous: boolean;
  next_page: number | null;
  previous_page: number | null;
};
