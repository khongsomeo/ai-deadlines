import { Search, Moon, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface HeaderProps {
  onSearch: (query: string) => void;
  showEmptyMessage?: boolean;
}

const Header = ({ onSearch, showEmptyMessage = false }: HeaderProps) => {
  const { theme, toggleTheme } = useTheme();

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
                  onChange={(e) => onSearch(e.target.value)}
                />
              </div>
            </div>
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
        {showEmptyMessage && (
          <div className="max-w-4xl mx-auto mt-2 mb-0 text-center">
            <p className="text-sm bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 py-2 px-4 rounded-md inline-block">
              There are no upcoming conferences for the selected categories - enable "Show past conferences" to see previous ones
            </p>
          </div>
        )}
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-muted-foreground py-4">
            A dỏm, yếu kém, phản cảm countdowns to <span className="line-through">top</span> CV/NLP/ML/Robotics/AI conference deadlines.
<br/>
Due to my incompetent in science, these conferences are mostly CORE-B/non-ranked.
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
