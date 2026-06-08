import { Search, Moon, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";

interface HeaderProps {
  onSearch: (query: string) => void;
  showEmptyMessage?: boolean;
}

const Clock = () => {
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const month = monthNames[now.getMonth()];
      const day = now.getDate();
      const year = now.getFullYear();

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      setCurrentTime(
        `${hours}:${minutes}:${seconds} ${month} ${day}, ${year} (${timezone})`
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return <>{currentTime}</>;
};

const Header = ({ onSearch, showEmptyMessage = false }: HeaderProps) => {
  const { theme, toggleTheme } = useTheme();
  
  // Own the raw input value so keystrokes only re-render Header (lightweight),
  // not Index.tsx (520 lines, 10+ hooks). The debounced copy is propagated to
  // the parent via onSearch — Index.tsx only re-renders every 250ms at most.
  const [inputValue, setInputValue] = useState("");
  const debouncedInputValue = useDebounce(inputValue, 250);

  useEffect(() => {
    onSearch(debouncedInputValue);
  }, [debouncedInputValue]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between md:h-16 py-4 md:py-0 gap-4 md:gap-0">
          <div className="flex items-center justify-center md:justify-start w-full md:w-auto gap-8">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src="/image.jpg" 
                alt="Dom, Yeu Kem, Phan Cam Logo!" 
                className="h-8 w-8"
              />
              <span className="text-2xl font-bold text-primary">
                <span className="hidden md:inline">(Submit-able) AI Conference Deadlines</span>
                <span className="md:hidden">AI Deadlines</span>
              </span>
            </Link>
            <nav className="hidden md:flex space-x-4">
              <Link
                to="/calendar"
                className="text-muted-foreground hover:text-primary flex items-center gap-2 transition-colors"
              >
                <CalendarDays className="h-5 w-5" />
                Calendar
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex-1 md:flex-none md:max-w-lg lg:max-w-xs">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  type="search"
                  placeholder="Search conferences..."
                  className="pl-10 w-full"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 md:hidden"
              asChild
              title="Calendar"
              aria-label="View Calendar"
            >
              <Link to="/calendar">
                <CalendarDays className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              onClick={toggleTheme}
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
        {showEmptyMessage ? (
          <div className="max-w-4xl mx-auto mt-2 mb-0 text-center">
            <p className="text-sm bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 py-2 px-4 rounded-md inline-block">
              There are no upcoming conferences for the selected categories - enable "Show past conferences" to see previous ones
            </p>
          </div>
        ) : null}
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-muted-foreground py-4">
            A dỏm, yếu kém, phản cảm countdowns to <span className="line-through">top</span> CV/NLP/ML/Robotics/AI conference deadlines.
<br/>
Due to my incompetent in science, these conferences are mostly CORE-B/non-ranked.
          </p>
          <p className="text-base md:text-lg font-semibold bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100 py-3 px-4 rounded-md inline-block mb-4">
            Current time: <Clock />
          </p>
          <p className="text-sm text-muted-foreground py-4">
            <b>Important:</b> Please give the original <a className="text-primary hover:underline" href="https://huggingface.co/spaces/huggingface/ai-deadlines">space</a> a <b>like</b> and <a className="text-primary hover:underline" href="https://github.com/huggingface/ai-deadlines">repository</a> a <b>star</b> for their awesome work!
</p>
        </div>
      </div>
    </header>
  );
};

export default Header;
