import Header from "@/components/Header";
import BackToTop from "@/components/BackToTop";
import { useConferences } from "@/hooks/useConferences";
import LoadingScreen from "@/components/LoadingScreen";
import VirtualConferenceGrid from "@/components/VirtualConferenceGrid";
import { Conference } from "@/types/conference";
import { useState, useMemo, useEffect, startTransition, useRef } from "react";
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Globe, ChartNoAxesColumn, Tag, Monitor } from "lucide-react";
// Extractors optimized directly within component to avoid O(N) repetition
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getApiBaseUrl } from "@/utils/apiClient";

// 9.8 - rendering-hoist-jsx / module const
const CATEGORY_BUTTONS = [
  { id: "machine-learning", label: "Machine Learning" },
  { id: "multimedia", label: "Multimedia" }, 
  { id: "robotics", label: "Robotics" },
  { id: "computer-vision", label: "Computer Vision" },
  { id: "data-mining", label: "Data Mining" },
  { id: "natural-language-processing", label: "Natural Language Processing" },
  { id: "signal-processing", label: "Signal Processing" },
  { id: "speech-processing", label: "Speech Processing" },
  { id: "human-computer-interaction", label: "Human Computer Interaction" },
  { id: "information-theory", label: "Information Theory" },
  { id: "information-retrieval", label: "Information Retrieval" },
  { id: "cryptography", label: "Cryptography" },
  { id: "security-and-privacy", label: "Security & Privacy" },
];

// Pre-compute map for O(1) lookups to avoid .find() in render (js-index-maps)
const CATEGORY_MAP = new Map(CATEGORY_BUTTONS.map(c => [c.id, c.label]));

// 9.9 - rendering-hoist-jsx: Static Alert JSX recreated every render
const CALENDAR_ALERT_CONTENT = (
  <div>
    <p className="text-blue-900 dark:text-blue-200 font-semibold mb-2">
      📅 Update: Subscribe to AI Deadlines Calendar
    </p>
    <p className="text-blue-800 dark:text-blue-300 text-sm mb-3">
      Never miss an important deadline! Copy the URL below and add it to your favorite calendar app:
    </p>
    <ul className="text-blue-800 dark:text-blue-300 text-sm space-y-1 ml-4 mb-3">
      <li><strong>Google Calendar:</strong> Click "+" → "From URL" → Paste the URL</li>
      <li><strong>Apple Calendar:</strong> File → "New Calendar Subscription" → Paste the URL</li>
      <li><strong>Other Apps:</strong> Look for "Add calendar by URL" or "Subscribe to calendar" option</li>
    </ul>
  </div>
);

// 9.7 / 9.10 - Unified URL synchronization
const syncFiltersToUrl = (key: string, values: Set<string>) => {
  const searchParams = new URLSearchParams(window.location.search);
  if (values.size > 0) {
    searchParams.set(key, Array.from(values).join(','));
  } else {
    searchParams.delete(key);
  }
  window.history.replaceState({}, '', `${window.location.pathname}?${searchParams}`);
};

const clearAllUrlFilters = () => {
  const searchParams = new URLSearchParams(window.location.search);
  searchParams.delete('tags');
  searchParams.delete('countries');
  searchParams.delete('ranks');
  searchParams.delete('formats');
  window.history.replaceState({}, '', `${window.location.pathname}?${searchParams}`);
};

const Index = () => {
  const { data: conferencesData, isLoading, metaCache } = useConferences();
  const { toast } = useToast();
  const [selectedTags, setSelectedTags] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const param = new URLSearchParams(window.location.search).get('tags');
    return param ? new Set(param.split(',')) : new Set();
  });
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const param = new URLSearchParams(window.location.search).get('countries');
    return param ? new Set(param.split(',')) : new Set();
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showPastConferences, setShowPastConferences] = useState(false);
  const [showAcceptingSubmissions, setShowAcceptingSubmissions] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('accepting_submissions') === 'true';
  });
  const [selectedRanks, setSelectedRanks] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const param = new URLSearchParams(window.location.search).get('ranks');
    return param ? new Set(param.split(',')) : new Set();
  });
  const [selectedFormats, setSelectedFormats] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const param = new URLSearchParams(window.location.search).get('formats');
    return param ? new Set(param.split(',')) : new Set();
  });

  const calendarUrl = `${getApiBaseUrl()}/api/calendar/all.ics`;

  const handleCopyCalendarUrl = () => {
    navigator.clipboard.writeText(calendarUrl).then(() => {
      toast({
        description: "Calendar URL copied to clipboard!",
      });
    }).catch(() => {
      toast({
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    });
  };

  const filteredConferences = useMemo(() => {
    if (!Array.isArray(conferencesData)) {
      console.error("Conferences data is not an array:", conferencesData);
      return [];
    }
    const queryLower = searchQuery.toLowerCase();
    const filtered = conferencesData
      .filter((conf: Conference) => {
        const meta = metaCache.get(conf.id);
        if (!showPastConferences && !meta?.hasUpcoming) return false;
        if (showAcceptingSubmissions && !meta?.hasUpcomingSubmission) return false;
        const matchesTags = selectedTags.size === 0 ||
          (Array.isArray(conf.tags) && conf.tags.length > 0 && conf.tags.some(tag => selectedTags.has(tag)));
        const matchesCountry = selectedCountries.size === 0 ||
          (conf.country && selectedCountries.has(conf.country));
        const matchesSearch = queryLower === "" ||
          conf.title.toLowerCase().includes(queryLower) ||
          (conf.full_name && conf.full_name.toLowerCase().includes(queryLower));
        const matchesRank = selectedRanks.size === 0 ||
          (conf.rankings?.rank_name && selectedRanks.has(conf.rankings.rank_name));
        const matchesFormat = selectedFormats.size === 0 ||
          (conf.format && selectedFormats.has(conf.format));
        return matchesTags && matchesCountry && matchesRank && matchesFormat && matchesSearch;
      });

    return [...filtered].sort((a, b) => {
      const aDate = metaCache.get(a.id)?.primaryDeadlineDate ?? null;
      const bDate = metaCache.get(b.id)?.primaryDeadlineDate ?? null;
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate.getTime() - bDate.getTime();
    });
  }, [conferencesData, metaCache, selectedTags, selectedCountries, selectedRanks, selectedFormats, searchQuery, showPastConferences, showAcceptingSubmissions]);

  // Unified filter toggle helper that updates state functionally and syncs URL
  const toggleFilter = (
    setState: React.Dispatch<React.SetStateAction<Set<string>>>,
    key: string,
    value: string,
    forceAdd: boolean = false,
    forceRemove: boolean = false
  ) => {
    startTransition(() => {
      setState(prev => {
        const next = new Set(prev);
        if (forceAdd) {
          next.add(value);
        } else if (forceRemove) {
          next.delete(value);
        } else {
          if (next.has(value)) next.delete(value);
          else next.add(value);
        }
        syncFiltersToUrl(key, next);
        return next;
      });
    });
  };

  const handleFilterByTagRef = useRef((tag: string) => {});
  useEffect(() => {
    handleFilterByTagRef.current = (tag: string) => {
      toggleFilter(setSelectedTags, 'tags', tag, true);
    };
  }, []);

  useEffect(() => {
    const handleFilterByTag = (event: CustomEvent<{ tag: string }>) => {
      handleFilterByTagRef.current(event.detail.tag);
    };
    window.addEventListener('filterByTag', handleFilterByTag as EventListener, { passive: true });
    return () => {
      window.removeEventListener('filterByTag', handleFilterByTag as EventListener);
    };
  }, []);

  const clearAllFilters = () => {
    startTransition(() => {
      setSelectedTags(new Set());
      setSelectedCountries(new Set());
      setSelectedRanks(new Set());
      setSelectedFormats(new Set());
    });
    clearAllUrlFilters();
  };

  const { countries, formats, ranks } = useMemo(() => {
    if (!Array.isArray(conferencesData)) return { countries: [], formats: [], ranks: [] };
    const countrySet = new Set<string>();
    const formatSet = new Set<string>();
    const rankSet = new Set<string>();
    for (let i = 0; i < conferencesData.length; i++) {
      const conf = conferencesData[i] as Conference;
      if (conf.country) countrySet.add(conf.country);
      if (conf.format) formatSet.add(conf.format);
      if (conf.rankings?.rank_name) rankSet.add(conf.rankings.rank_name);
    }
    return {
      countries: Array.from(countrySet).sort(),
      formats: Array.from(formatSet).sort(),
      ranks: Array.from(rankSet).sort()
    };
  }, [conferencesData]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  const handleSearch = (query: string) => {
    startTransition(() => {
      setSearchQuery(query);
    });
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      <Header onSearch={handleSearch} showEmptyMessage={false} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Alert className="mt-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <AlertDescription className="space-y-3">
            {CALENDAR_ALERT_CONTENT}
            <button
              onClick={handleCopyCalendarUrl}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white text-sm font-medium rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Copy Calendar URL
            </button>
          </AlertDescription>
        </Alert>
        <div className="space-y-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-card dark:bg-card p-2 rounded-md shadow-sm">
              <label htmlFor="show-past" className="text-sm text-muted-foreground dark:text-muted-foreground">
                Show past conferences
              </label>
              <Switch
                id="show-past"
                checked={showPastConferences}
                onCheckedChange={(checked) => {
                  startTransition(() => {
                    setShowPastConferences(checked);
                  });
                }}
              />
            </div>

            <div className="flex items-center gap-2 bg-card dark:bg-card p-2 rounded-md shadow-sm">
              <label htmlFor="show-accepting" className="text-sm text-muted-foreground dark:text-muted-foreground">
                Still accepting papers
              </label>
              <Switch
                id="show-accepting"
                checked={showAcceptingSubmissions}
                onCheckedChange={(checked) => {
                  startTransition(() => {
                    setShowAcceptingSubmissions(checked);
                    const searchParams = new URLSearchParams(window.location.search);
                    if (checked) {
                      searchParams.set('accepting_submissions', 'true');
                    } else {
                      searchParams.delete('accepting_submissions');
                    }
                    window.history.replaceState({}, '', `${window.location.pathname}?${searchParams}`);
                  });
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 bg-card dark:bg-card p-2 rounded-md shadow-sm">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1 focus:outline-none hover:bg-gray-200 hover:text-foreground dark:hover:bg-card dark:hover:text-foreground">
                    <Tag className="h-4 w-4" />
                    Filter by Tag
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4 bg-card dark:bg-card" align="start">
                  <div className="space-y-4">
                    <div>
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-foreground dark:text-foreground">Tag</h4>
                      </div>
                      <div
                        className="max-h-60 overflow-y-auto space-y-2 bg-card dark:bg-card overscroll-contain touch-pan-y"
                        style={{ WebkitOverflowScrolling: "touch" }}
                      >
                        {CATEGORY_BUTTONS.map(category => (
                          <div key={category.id} className="flex items-center space-x-2 hover:bg-gray-200 hover:text-foreground dark:hover:bg-muted p-1 rounded">
                            <Checkbox
                              id={`tag-${category.id}`}
                              checked={selectedTags.has(category.id)}
                              onCheckedChange={() => toggleFilter(setSelectedTags, 'tags', category.id)}
                            />
                            <label
                              htmlFor={`tag-${category.id}`}
                              className="text-sm font-medium text-foreground dark:text-foreground cursor-pointer w-full py-1"
                            >
                              {category.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {Array.from(selectedTags).map(tag => {
                const label = CATEGORY_MAP.get(tag) || tag;
                return (
                  <button
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary dark:bg-iris/20 dark:text-iris hover:bg-primary/20 dark:hover:bg-iris/30 font-medium"
                    onClick={() => toggleFilter(setSelectedTags, 'tags', tag, false, true)}
                  >
                    {label}
                    <X className="ml-1 h-3 w-3" />
                  </button>
                );
              })}

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1 focus:outline-none hover:bg-gray-200 hover:text-foreground dark:hover:bg-card dark:hover:text-foreground">
                    <Globe className="h-4 w-4" />
                    Filter by Country
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4 bg-card dark:bg-card" align="start">
                  <div className="space-y-4">
                    <div>
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-foreground dark:text-foreground">Country</h4>
                      </div>
                      <div
                        className="max-h-60 overflow-y-auto space-y-2 bg-card dark:bg-card overscroll-contain touch-pan-y"
                        style={{ WebkitOverflowScrolling: "touch" }}
                      >
                        {countries.map(country => (
                          <div key={country} className="flex items-center space-x-2 hover:bg-gray-200 hover:text-foreground dark:hover:bg-muted p-1 rounded">
                            <Checkbox
                              id={`country-${country}`}
                              checked={selectedCountries.has(country)}
                              onCheckedChange={() => toggleFilter(setSelectedCountries, 'countries', country)}
                            />
                            <label
                              htmlFor={`country-${country}`}
                              className="text-sm font-medium text-foreground dark:text-foreground cursor-pointer w-full py-1"
                            >
                              {country}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {Array.from(selectedCountries).map(country => (
                <button
                  key={country}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary dark:bg-iris/20 dark:text-iris hover:bg-primary/20 dark:hover:bg-iris/30 font-medium"
                  onClick={() => toggleFilter(setSelectedCountries, 'countries', country, false, true)}
                >
                  {country}
                  <X className="ml-1 h-3 w-3" />
                </button>
              ))}

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1 hover:bg-gray-200 hover:text-foreground dark:hover:bg-card dark:hover:text-foreground">
                    <Monitor className="h-4 w-4" />
                    Filter by Format
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4 bg-card dark:bg-card" align="start">
                  <div className="space-y-4">
                    <div>
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-foreground dark:text-foreground">Format</h4>
                      </div>
                      <div
                        className="max-h-60 overflow-y-auto space-y-2 bg-card dark:bg-card overscroll-contain touch-pan-y"
                        style={{ WebkitOverflowScrolling: "touch" }}
                      >
                        {formats.map(format => (
                          <div key={format} className="flex items-center space-x-2 hover:bg-gray-200 hover:text-foreground dark:hover:bg-muted p-1 rounded">
                            <Checkbox
                              id={`format-${format}`}
                              checked={selectedFormats.has(format)}
                              onCheckedChange={() => toggleFilter(setSelectedFormats, 'formats', format)}
                            />
                            <label
                              htmlFor={`format-${format}`}
                              className="text-sm font-medium text-foreground dark:text-foreground cursor-pointer w-full py-1"
                            >
                              {format}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {Array.from(selectedFormats).map(format => (
                <button
                  key={format}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary dark:bg-iris/20 dark:text-iris hover:bg-primary/20 dark:hover:bg-iris/30 font-medium"
                  onClick={() => toggleFilter(setSelectedFormats, 'formats', format, false, true)}
                >
                  {format}
                  <X className="ml-1 h-3 w-3" />
                </button>
              ))}

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1 hover:bg-gray-200 hover:text-foreground dark:hover:bg-card dark:hover:text-foreground">
                    <ChartNoAxesColumn className="h-4 w-4" />
                    Filter by Rank
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4 bg-card dark:bg-card" align="start">
                  <div className="space-y-4">
                    <div>
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-foreground dark:text-foreground">Rank</h4>
                      </div>
                      <div
                        className="max-h-60 overflow-y-auto space-y-2 bg-card dark:bg-card overscroll-contain touch-pan-y"
                        style={{ WebkitOverflowScrolling: "touch" }}
                      >
                        {ranks.map(rank => (
                          <div key={rank} className="flex items-center space-x-2 hover:bg-gray-200 hover:text-foreground dark:hover:bg-muted p-1 rounded">
                            <Checkbox
                              id={`rank-${rank}`}
                              checked={selectedRanks.has(rank)}
                              onCheckedChange={() => toggleFilter(setSelectedRanks, 'ranks', rank)}
                            />
                            <label
                              htmlFor={`rank-${rank}`}
                              className="text-sm font-medium text-foreground dark:text-foreground cursor-pointer w-full py-1"
                            >
                              {rank}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {Array.from(selectedRanks).map(rank => (
                <button
                  key={rank}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary dark:bg-iris/20 dark:text-iris hover:bg-primary/20 dark:hover:bg-iris/30 font-medium"
                  onClick={() => toggleFilter(setSelectedRanks, 'ranks', rank, false, true)}
                >
                  {rank}
                  <X className="ml-1 h-3 w-3" />
                </button>
              ))}

              {(selectedTags.size > 0 || selectedCountries.size > 0 || selectedRanks.size > 0 || selectedFormats.size > 0) ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-muted-foreground dark:text-muted-foreground hover:bg-gray-200 hover:text-foreground dark:hover:bg-muted dark:hover:text-foreground"
                >
                  Clear all filters
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredConferences.length === 0 ? (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-md p-4 mb-6">
            <p className="text-center">
              There are no upcoming conferences for the selected categories - enable "Show past conferences" to see previous ones
            </p>
          </div>
        ) : null}

        <VirtualConferenceGrid conferences={filteredConferences} />
      </main>
      <BackToTop />
    </div>
  );
};

export default Index;
