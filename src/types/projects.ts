export type Project = {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on-hold';
  progress: number;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  teamSize: number;
  client: {
    name: string;
    company: string;
  };
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee: string;
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
};

export type TimeEntry = {
  id: string;
  projectId: string;
  taskId: string;
  userId: string;
  date: string;
  hours: number;
  description: string;
};