import { useState, useMemo, startTransition, useCallback } from "react";
import { useConferences } from "@/hooks/useConferences";
import { Conference } from "@/types/conference";
import { Tag, X, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { parseISO, format, isValid } from "date-fns";
import Header from "@/components/Header";
import LoadingScreen from "@/components/LoadingScreen";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const categoryColors: Record<string, string> = {
  "machine-learning": "bg-purple-500",
  "multimedia": "bg-stone-500",
  "computer-vision": "bg-orange-500",
  "natural-language-processing": "bg-blue-500",
  "robotics": "bg-green-500",
  "speech-processing": "bg-yellow-500",
  "signal-processing": "bg-cyan-500",
  "data-mining": "bg-pink-500",
  "information-theory": "bg-red-500",
  "information-retrieval": "bg-amber-500",
  "cryptography": "bg-indigo-500",
  "security-and-privacy": "bg-teal-500",
  "other": "bg-gray-500"
};

const categoryNames: Record<string, string> = {
  "machine-learning": "Machine Learning",
  "multimedia": "Multimedia",
  "computer-vision": "Computer Vision",
  "natural-language-processing": "NLP",
  "robotics": "Robotics",
  "speech-processing": "Speech Processing",
  "signal-processing": "Signal Processing",
  "data-mining": "Data Mining",
  "information-theory": "Information Theory",
  "information-retrieval": "Information Retrieval",
  "cryptography": "Cryptography",
  "security-and-privacy": "Security & Privacy",
  "other": "Other"
};

// Add this array to maintain the exact order we want
const orderedCategories = [
  "machine-learning",
  "multimedia",
  "computer-vision",
  "natural-language-processing",
  "robotics",
  "speech-processing",
  "signal-processing",
  "data-mining",
  "information-theory",
  "information-retrieval",
  "cryptography",
  "security-and-privacy",
  "other"
] as const;

const mapLegacyTag = (tag: string): string => {
  const legacyTagMapping: Record<string, string> = {
    "human-computer-interaction": "other",
    // reinforcement-learning is already a proper tag, so no mapping needed
    // Add any other legacy mappings here
  };
  return legacyTagMapping[tag] || tag;
};

const checkCategoryMatch = (tags: string[] | undefined, selectedCategories: Set<string>): boolean => {
  if (selectedCategories.size === 0) return true;
  if (!Array.isArray(tags) || tags.length === 0) return false;
  return tags.some(tag => selectedCategories.has(mapLegacyTag(tag)));
};

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isYearView, setIsYearView] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: Date | null, events: { deadlines: Conference[], conferences: Conference[] } }>({
    date: null,
    events: { deadlines: [], conferences: [] }
  });
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(orderedCategories)
  );
  const [showDeadlines, setShowDeadlines] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const { data: conferencesData, isLoading, isError, error } = useConferences();

  const safeParseISO = (dateString: string | undefined | number): Date | null => {
    if (!dateString) return null;
    if (dateString === 'TBD') return null;

    const isDate = (value: any): value is Date => {
      return value && Object.prototype.toString.call(value) === '[object Date]';
    };

    if (isDate(dateString)) return dateString;

    try {
      if (typeof dateString === 'object') {
        return null;
      }

      const dateStr = typeof dateString === 'number' ? dateString.toString() : dateString;

      let normalizedDate = dateStr;
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        normalizedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }

      const parsedDate = parseISO(normalizedDate);
      return isValid(parsedDate) ? parsedDate : null;
    } catch (error) {
      console.error("Error parsing date:", dateString);
      return null;
    }
  };

  const getEvents = useCallback(() => {
    if (!conferencesData) return [];

    const query = searchQuery.toLowerCase();
    return conferencesData.filter((conf: Conference) => {
      const matchesSearch = query === "" ||
        conf.title.toLowerCase().includes(query) ||
        (conf.full_name && conf.full_name.toLowerCase().includes(query));

      const matchesCategory = checkCategoryMatch(conf.tags, selectedCategories);

      const deadlineDate = safeParseISO(conf.deadline);
      const startDate = safeParseISO(conf.start);
      const endDate = safeParseISO(conf.end);

      const isInCurrentYear = (date: Date | null) => {
        return date && date.getFullYear() === currentYear;
      };

      if (showDeadlines && selectedCategories.size === 0) {
        return deadlineDate && isInCurrentYear(deadlineDate) && matchesSearch;
      }

      if (!matchesSearch || (!matchesCategory && selectedCategories.size > 0)) return false;

      const deadlineInYear = showDeadlines && deadlineDate && isInCurrentYear(deadlineDate);
      const conferenceInYear = (startDate && isInCurrentYear(startDate)) ||
        (endDate && isInCurrentYear(endDate)) ||
        (startDate && endDate &&
          startDate.getFullYear() <= currentYear &&
          endDate.getFullYear() >= currentYear);

      return deadlineInYear || (selectedCategories.size > 0 && conferenceInYear);
    });
  }, [conferencesData, searchQuery, selectedCategories, showDeadlines, currentYear]);

  const eventsMap = useMemo(() => {
    const map = new Map<string, { deadlines: Conference[], conferences: Conference[] }>();
    const query = searchQuery.toLowerCase();

    conferencesData.forEach((conf: Conference) => {
      const matchesSearch = query === "" || 
        conf.title.toLowerCase().includes(query) || 
        (conf.full_name && conf.full_name.toLowerCase().includes(query));
        
      if (!matchesSearch) return;

      const matchesCategory = checkCategoryMatch(conf.tags, selectedCategories);

      if (showDeadlines) {
        const deadlineDate = safeParseISO(conf.deadline);
        if (deadlineDate && deadlineDate.getFullYear() === currentYear && matchesCategory) {
          const dateStr = format(deadlineDate, 'yyyy-MM-dd');
          if (!map.has(dateStr)) map.set(dateStr, { deadlines: [], conferences: [] });
          map.get(dateStr)!.deadlines.push(conf);
        }
      }

      if (selectedCategories.size > 0 && matchesCategory) {
        const startDate = safeParseISO(conf.start);
        const endDate = safeParseISO(conf.end);
        
        if (startDate && endDate) {
          if (startDate.getFullYear() <= currentYear && endDate.getFullYear() >= currentYear) {
            const endLimit = new Date(currentYear, 11, 31);
            const actualEnd = endDate > endLimit ? endLimit : endDate;
            
            let current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const end = new Date(actualEnd.getFullYear(), actualEnd.getMonth(), actualEnd.getDate());
            
            while (current <= end) {
              if (current.getFullYear() === currentYear) {
                const dateStr = format(current, 'yyyy-MM-dd');
                if (!map.has(dateStr)) map.set(dateStr, { deadlines: [], conferences: [] });
                map.get(dateStr)!.conferences.push(conf);
              }
              current.setDate(current.getDate() + 1);
            }
          }
        } else if (startDate) {
          if (startDate.getFullYear() === currentYear) {
            const dateStr = format(startDate, 'yyyy-MM-dd');
            if (!map.has(dateStr)) map.set(dateStr, { deadlines: [], conferences: [] });
            map.get(dateStr)!.conferences.push(conf);
          }
        }
      }
    });

    return map;
  }, [conferencesData, searchQuery, selectedCategories, showDeadlines, currentYear]);

  const getDayEvents = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return eventsMap.get(dateStr) || { deadlines: [], conferences: [] };
  };

  const renderEventPreview = (events: { deadlines: Conference[], conferences: Conference[] }) => {
    if (events.deadlines.length === 0 && events.conferences.length === 0) return null;

    return (
      <div className="p-2 max-w-[200px]">
        {events.deadlines.length > 0 ? (
          <div className="mb-2">
            <p className="font-semibold text-red-500">Deadlines:</p>
            {events.deadlines.map(conf => (
              <div key={conf.id} className="text-sm">{conf.title}</div>
            ))}
          </div>
        ) : null}
        {events.conferences.length > 0 ? (
          <div>
            <p className="font-semibold text-purple-600">Conferences:</p>
            {events.conferences.map(conf => (
              <div key={conf.id} className="text-sm">{conf.title}</div>
            ))}
          </div>
        ) : null}
      </div>
    );
  };


  const getConferenceLineStyle = (dateStr: string, dayConferences: Conference[]) => {
    // If only showing deadlines and no categories are selected, don't show any conference lines
    if (selectedCategories.size === 0 && showDeadlines) {
      return [];
    }

    return dayConferences.map(conf => {
      let style = "w-[calc(100%+1rem)] -left-2 relative";

      const normalize = (d: string | number | undefined) => {
        if (!d || d === 'TBD' || typeof d === 'object') return null;
        const parts = d.toString().split('-');
        if (parts.length === 3) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        return d.toString();
      };

      const startStr = normalize(conf.start);
      const endStr = normalize(conf.end);

      if (startStr === dateStr) {
        style += " rounded-l-sm";
      }
      if (endStr === dateStr) {
        style += " rounded-r-sm";
      }

      const color = conf.tags && conf.tags[0] ? categoryColors[conf.tags[0]] : "bg-gray-500";

      return { style, color };
    });
  };

  const renderDayContent = (date: Date) => {
    const dayEvents = getDayEvents(date);
    const hasEvents = dayEvents.deadlines.length > 0 || dayEvents.conferences.length > 0;

    const dateStr = format(date, 'yyyy-MM-dd');
    const conferenceStyles = getConferenceLineStyle(dateStr, dayEvents.conferences);

    const hasDeadline = showDeadlines && dayEvents.deadlines.length > 0;

    const handleDayClick = (e: React.MouseEvent) => {
      e.preventDefault(); // Prevent default calendar behavior
      e.stopPropagation(); // Stop event propagation
      setSelectedDayEvents({
        date,
        events: dayEvents
      });
    };

    return (
      <div
        className="relative w-full h-full flex flex-col"
        onClick={handleDayClick}
      >
        <div className="h-10 flex items-center justify-center">
          <span>{format(date, 'd')}</span>
        </div>

        <div className="absolute bottom-2 left-0 right-0 flex flex-col-reverse gap-[1px]">
          {conferenceStyles.map((style, index) => (
            <div
              key={`conf-${index}`}
              className={`h-[2px] ${style.style} ${style.color}`}
            />
          ))}
          {hasDeadline ? (
            <div className="h-[2px] w-[calc(100%+1rem)] -left-2 relative bg-red-500" />
          ) : null}
        </div>

        {hasEvents ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="absolute inset-0" />
              <TooltipContent>
                {renderEventPreview(dayEvents)}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
    );
  };

  const renderEventDetails = (conf: Conference) => {
    const deadlineDate = safeParseISO(conf.deadline);
    const startDate = safeParseISO(conf.start);
    const endDate = safeParseISO(conf.end);

    return (
      <div className="border-b last:border-b-0 pb-4 last:pb-0 mb-4 last:mb-0">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg text-neutral-900">{conf.title}</h3>
            {conf.full_name ? (
              <p className="text-sm text-neutral-600 mb-2">{conf.full_name}</p>
            ) : null}
          </div>
          {conf.link ? (
            <a
              href={conf.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-sm"
            >
              Website
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          ) : null}
        </div>

        <div className="space-y-2 mt-3">
          {deadlineDate ? (
            <div className="flex items-start gap-2">
              <span className="font-medium text-sm text-foreground dark:text-foreground">Deadline:</span>
              <div className="text-sm text-foreground dark:text-foreground">
                <div>{format(deadlineDate, 'MMMM d, yyyy')}</div>
                {conf.timezone ? (
                  <div className="text-muted-foreground dark:text-muted-foreground text-xs">
                    Timezone: {conf.timezone}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {startDate ? (
            <div className="flex items-start gap-2">
              <span className="font-medium text-sm text-foreground dark:text-foreground">Date:</span>
              <div className="text-sm text-foreground dark:text-foreground">
                <div>
                  {format(startDate, 'MMMM d')}
                  {endDate ? ` - ${format(endDate, 'MMMM d, yyyy')}` :
                    `, ${format(startDate, 'yyyy')}`}
                </div>
              </div>
            </div>
          ) : null}

          {conf.place ? (
            <div className="flex items-start gap-2">
              <span className="font-medium text-sm text-foreground dark:text-foreground">Location:</span>
              <span className="text-sm text-foreground dark:text-foreground">{conf.place}</span>
            </div>
          ) : null}

          {conf.note ? (
            <div className="flex items-start gap-2 mt-2">
              <span className="font-medium text-sm text-foreground dark:text-foreground">Note:</span>
              <div className="text-sm text-neutral-900"
                dangerouslySetInnerHTML={{ __html: conf.note }}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {Array.isArray(conf.tags) && conf.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-neutral-100 text-neutral-900"
            >
              <Tag className="h-3 w-3 mr-1" />
              {categoryNames[tag] || tag}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const availableCategories = useMemo(() => {
    const categoriesSet = new Set<string>();
    if (!conferencesData) return categoriesSet;
    for (let i = 0; i < conferencesData.length; i++) {
      const tags = conferencesData[i].tags;
      if (Array.isArray(tags)) {
        for (let j = 0; j < tags.length; j++) {
          categoriesSet.add(tags[j]);
        }
      }
    }
    return categoriesSet;
  }, [conferencesData]);

  const categories = useMemo(() => {
    return orderedCategories.flatMap(category =>
      availableCategories.has(category)
        ? [[category, categoryColors[category]]]
        : []
    );
  }, [availableCategories]);

  const renderLegend = () => {
    return (
      <div className="flex flex-wrap gap-3 justify-center items-center mb-4">
        <div className="flex gap-3 items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowDeadlines(!showDeadlines)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 
                    rounded-lg border border-red-200 dark:border-red-800
                    bg-card dark:bg-card hover:bg-red-50 dark:hover:bg-red-950
                    transition-all duration-200
                    cursor-pointer
                    ${showDeadlines ? 'ring-2 ring-primary dark:ring-iris ring-offset-2' : ''}
                  `}
                >
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-sm">Submission Deadlines</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to toggle submission deadlines</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="h-6 w-px bg-neutral-200" /> {/* Divider */}

        {categories.map(([tag, color]) => (
          <TooltipProvider key={tag}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    const newCategories = new Set(selectedCategories);
                    if (newCategories.has(tag)) {
                      newCategories.delete(tag);
                    } else {
                      newCategories.add(tag);
                    }
                    setSelectedCategories(newCategories);
                  }}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 
                    rounded-lg border border-border dark:border-border
                    bg-card dark:bg-card hover:bg-muted dark:hover:bg-muted
                    transition-all duration-200
                    cursor-pointer
                    ${selectedCategories.has(tag) ? 'ring-2 ring-primary dark:ring-iris ring-offset-2' : ''}
                  `}
                >
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <span className="text-sm">{categoryNames[tag] || tag}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to toggle {categoryNames[tag] || tag}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}

        {selectedCategories.size < Object.keys(categoryColors).length ? (
          <button
            onClick={() => {
              setSelectedCategories(new Set(orderedCategories));
              setShowDeadlines(true);
            }}
            className="text-sm text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-700
              px-3 py-1.5 rounded-lg border border-green-200
              transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Select All
          </button>
        ) : null}

        {selectedCategories.size > 0 ? (
          <button
            onClick={() => {
              setSelectedCategories(new Set());
              setShowDeadlines(false);
            }}
            className="text-sm text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700
              px-3 py-1.5 rounded-lg border border-red-200
              transition-colors flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Deselect All
          </button>
        ) : null}
      </div>
    );
  };

  const renderViewToggle = () => {
    return (
      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="bg-muted dark:bg-muted rounded-lg p-1 inline-flex">
          <button
            onClick={() => setIsYearView(false)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${!isYearView
                ? 'bg-card dark:bg-card shadow-sm text-primary dark:text-iris'
                : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground'
              }`}
          >
            Month View
          </button>
          <button
            onClick={() => setIsYearView(true)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${isYearView
                ? 'bg-card dark:bg-card shadow-sm text-primary dark:text-iris'
                : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground'
              }`}
          >
            Year View
          </button>
        </div>

        {isYearView ? (
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                const newYear = currentYear - 1;
                setCurrentYear(newYear);
                setSelectedDate(new Date(newYear, 0, 1)); // Set to January 1st of the new year
              }}
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              aria-label="Previous year"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="text-lg font-semibold">{currentYear}</span>
            <button
              onClick={() => {
                const newYear = currentYear + 1;
                setCurrentYear(newYear);
                setSelectedDate(new Date(newYear, 0, 1)); // Set to January 1st of the new year
              }}
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              aria-label="Next year"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
    setSelectedDate(month);
  };

  const currentEvents = useMemo(() => {
    return getEvents();
  }, [getEvents]);

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-foreground">Failed to load conferences</h2>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? 'An unexpected error occurred while loading conference data.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingScreen layout="calendar" />;
  }

  const handleSearch = (query: string) => {
    startTransition(() => {
      setSearchQuery(query);
    });
  };

  return (
      <div className="min-h-screen bg-background dark:bg-background">
      <Header onSearch={handleSearch} />

      {searchQuery ? (
        <div className="p-6 bg-card dark:bg-card border-b border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold mb-4">
              Search Results for "{searchQuery}"
            </h2>
            <div className="space-y-4">
              {currentEvents.map((conf: Conference) => (
                <div
                  key={conf.id || conf.title}
                  className="p-4 border rounded-lg hover:bg-neutral-50 cursor-pointer"
                  onClick={() => {
                    const deadlineDate = safeParseISO(conf.deadline);
                    const startDate = safeParseISO(conf.start);

                    if (deadlineDate) {
                      setSelectedDate(deadlineDate);
                      setSelectedDayEvents({
                        date: deadlineDate,
                        events: getDayEvents(deadlineDate)
                      });
                    } else if (startDate) {
                      setSelectedDate(startDate);
                      setSelectedDayEvents({
                        date: startDate,
                        events: getDayEvents(startDate)
                      });
                    }
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{conf.title}</h3>
                      {conf.full_name ? (
                        <p className="text-sm text-neutral-600">{conf.full_name}</p>
                      ) : null}
                    </div>
                    {conf.deadline && conf.deadline !== 'TBD' ? (
                      <span className="text-sm text-red-500">
                        Deadline: {format(safeParseISO(conf.deadline)!, 'MMM d, yyyy')}
                      </span>
                    ) : null}
                  </div>
                  {Array.isArray(conf.tags) && conf.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {conf.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-neutral-100"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {categoryNames[tag] || tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              {currentEvents.length === 0 ? (
                <p className="text-neutral-600">No conferences found matching your search.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {renderViewToggle()}
          {renderLegend()}

          <div className="grid grid-cols-1 gap-8">
            <div className="mx-auto w-full max-w-4xl">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                numberOfMonths={isYearView ? 12 : 1}
                showOutsideDays={false}
                defaultMonth={new Date(currentYear, 0)}
                month={isYearView ? new Date(currentYear, 0) : currentMonth}
                onMonthChange={handleMonthChange}
                fromMonth={isYearView ? new Date(currentYear, 0) : undefined}
                toMonth={isYearView ? new Date(currentYear, 11) : undefined}
                className="bg-card dark:bg-card rounded-lg p-6 shadow-sm mx-auto w-full"
                components={{
                  Day: ({ date, displayMonth, ...props }) => {
                    const isOutsideDay = date.getMonth() !== displayMonth.getMonth();
                    if (isOutsideDay) {
                      return null;
                    }
                    return (
                      <div
                        role="button"
                        tabIndex={0}
                        {...props}
                        className="w-full h-full p-2 cursor-pointer"
                      >
                        {renderDayContent(date)}
                      </div>
                    );
                  },
                }}
                classNames={{
                  months: `grid ${isYearView ? 'grid-cols-3 gap-4' : ''} justify-center`,
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center mb-4",
                  caption_label: "text-lg font-semibold",
                  head_row: "flex",
                  head_cell: "text-muted-foreground rounded-md w-10 font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: "h-16 w-10 text-center text-sm p-0 relative focus-within:relative focus-within:z-20 hover:bg-neutral-50",
                  day: "h-16 w-10 p-0 font-normal hover:bg-neutral-100 rounded-lg transition-colors",
                  day_today: "bg-neutral-100 text-primary font-semibold",
                  day_outside: "hidden",
                  nav: "space-x-1 flex items-center",
                  nav_button: isYearView ? "hidden" : "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1"
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={selectedDayEvents.date !== null}
        onOpenChange={() => setSelectedDayEvents({ date: null, events: { deadlines: [], conferences: [] } })}
      >
        <DialogContent
          className="max-w-2xl max-h-[80vh] overflow-y-auto"
          aria-describedby="dialog-description"
        >
          <DialogHeader>
            <DialogTitle>
              Events for {selectedDayEvents.date ? format(selectedDayEvents.date, 'MMMM d, yyyy') : ''}
            </DialogTitle>
            <div id="dialog-description" className="text-sm text-neutral-600">
              View conference details and deadlines for this date.
            </div>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDayEvents.events.deadlines.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold text-red-500 mb-3">Submission Deadlines</h3>
                <div className="space-y-4">
                  {selectedDayEvents.events.deadlines.map(conf => (
                    <div key={conf.id || conf.title}>
                      {renderEventDetails(conf)}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {selectedDayEvents.events.conferences.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold text-purple-600 mb-3">Conferences</h3>
                <div className="space-y-4">
                  {selectedDayEvents.events.conferences.map(conf => (
                    <div key={conf.id || conf.title}>
                      {renderEventDetails(conf)}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;
