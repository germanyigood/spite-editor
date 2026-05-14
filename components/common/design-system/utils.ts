
import { AccentColor } from './types';

export const getAccentColors = (color: AccentColor) => {
  // Logic: 
  // Text: Darker in Light mode (600), Lighter in Dark mode (400)
  // Bg: Consistent (500)
  // Border/Ring: Consistent
  const map: Record<AccentColor, { text: string; bg: string; border: string; ring: string; thumb: string; knob: string }> = {
    cyan:   { text: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500', border: 'focus:border-cyan-500/50', ring: 'focus:ring-cyan-500/20', thumb: 'accent-cyan-500', knob: 'bg-cyan-400' },
    purple: { text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500', border: 'focus:border-purple-500/50', ring: 'focus:ring-purple-500/20', thumb: 'accent-purple-500', knob: 'bg-purple-400' },
    pink:   { text: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500', border: 'focus:border-pink-500/50', ring: 'focus:ring-pink-500/20', thumb: 'accent-pink-500', knob: 'bg-pink-400' },
    green:  { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500', border: 'focus:border-green-500/50', ring: 'focus:ring-green-500/20', thumb: 'accent-green-500', knob: 'bg-green-400' },
    amber:  { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', border: 'focus:border-amber-500/50', ring: 'focus:ring-amber-500/20', thumb: 'accent-amber-500', knob: 'bg-amber-400' },
    blue:   { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500', border: 'focus:border-blue-500/50', ring: 'focus:ring-blue-500/20', thumb: 'accent-blue-500', knob: 'bg-blue-400' },
    gray:   { text: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500', border: 'focus:border-gray-500/50', ring: 'focus:ring-gray-500/20', thumb: 'accent-gray-500', knob: 'bg-gray-400' },
    yellow: { text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500', border: 'focus:border-yellow-500/50', ring: 'focus:ring-yellow-500/20', thumb: 'accent-yellow-500', knob: 'bg-yellow-400' },
    indigo: { text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500', border: 'focus:border-indigo-500/50', ring: 'focus:ring-indigo-500/20', thumb: 'accent-indigo-500', knob: 'bg-indigo-400' },
  };
  return map[color] || map.gray;
};
