
export type AccentColor = 'cyan' | 'purple' | 'pink' | 'green' | 'amber' | 'blue' | 'gray' | 'yellow' | 'indigo';

export interface BaseControlProps {
  label?: string;
  className?: string;
  accent?: AccentColor;
  disabled?: boolean;
}
