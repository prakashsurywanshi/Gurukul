import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '../Pages/ui/button';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      className={`relative h-9 w-9 rounded-xl border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-sm transition-all hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] ${className}`}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-blue-500" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
