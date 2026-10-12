export type Theme = "dark" | "light";
export type Role = "student" | "teacher" | "admin";

export interface Profile {
  id: string;
  role: Role;
  student_id: string | null;
  username: string | null;
  name: string;
  email: string;
  class_section: string | null;
  avatar_key: string;
  profile_image: string | null;
  theme_preference: Theme;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  active: boolean;
  created_at: string;
}

export interface Lesson {
  id: number;
  title: string;
  description: string;
  learning_objective: string;
  content: string;
  order_number: number;
  active: boolean;
}

export interface Level {
  id: number;
  lesson_id: number;
  level_number: number;
  order_in_lesson: number;
  title: string;
  description: string;
  difficulty: string;
  xp_reward: number;
  build_available?: boolean;
  active: boolean;
  starter_code_enabled: boolean;
  starter_code_template: string;
  starter_code_locked: boolean;
}

export interface LevelProgress {
  student_id: string;
  level_id: number;
  completed: boolean;
  attempts: number;
  mistakes: number;
  play_time_seconds: number;
  lines_used: number | null;
  best_time_seconds: number | null;
  best_lines_used: number | null;
  xp_earned: number;
  completed_at: string | null;
  updated_at: string;
}

export interface Assignment {
  id: number;
  teacher_id: string;
  class_id: number | null;
  student_id: string | null;
  lesson_id: number | null;
  level_id: number | null;
  title: string;
  instructions: string | null;
  due_date: string | null;
  created_at: string;
}

export interface Notification {
  id: number;
  student_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
  earned_at?: string | null;
}
