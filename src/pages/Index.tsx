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
import { X, Globe, ChartNoAxesColumn } from "lucide-react";
import { getAllCountries } from "@/utils/countryExtractor";

import { getAllRanks } from "@/utils/rankExtractor";
import { getAllFormats } from "@/utils/formatExtractor";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getApiBaseUrl } from "@/utils/apiClient";

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

  // Construct the calendar API URL
  const calendarUrl = `${getApiBaseUrl()}/api/calendar/all.ics`;

  // Handle copying calendar URL to clipboard
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

  // Category buttons configuration
  const categoryButtons = [
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

  const filteredConferences = useMemo(() => {
    if (!Array.isArray(conferencesData)) {
      console.error("Conferences data is not an array:", conferencesData);
      return [];
    }

    const queryLower = searchQuery.toLowerCase();

    const filtered = conferencesData
      .filter((conf: Conference) => {
        // Use pre-computed cache lookup (O(1)) instead of re-running getAllDeadlines every render
        const meta = metaCache.get(conf.id);
        if (!showPastConferences && !meta?.hasUpcoming) return false;

        // Filter by tags
        const matchesTags = selectedTags.size === 0 ||
          (Array.isArray(conf.tags) && conf.tags.some(tag => selectedTags.has(tag)));

        // Filter by countries
        const matchesCountry = selectedCountries.size === 0 ||
          (conf.country && selectedCountries.has(conf.country));

        // Filter by search query — Index.tsx receives an already-debounced
        // value from Header, so this memo only runs when typing pauses.
        const matchesSearch = queryLower === "" ||
          conf.title.toLowerCase().includes(queryLower) ||
          (conf.full_name && conf.full_name.toLowerCase().includes(queryLower));

        // Add rank filter
        const matchesRank = selectedRanks.size === 0 ||
          (conf.rankings?.rank_name && selectedRanks.has(conf.rankings.rank_name));

        // Add format filter
        const matchesFormat = selectedFormats.size === 0 ||
          (conf.format && selectedFormats.has(conf.format));

        return matchesTags && matchesCountry && matchesRank && matchesFormat && matchesSearch;
      });

    // Cache-aware sort: O(N log N) with O(1) date lookups — avoids re-parsing
    // dates and re-running getAllDeadlines on every comparison.
    return [...filtered].sort((a, b) => {
      const aDate = metaCache.get(a.id)?.primaryDeadlineDate ?? null;
      const bDate = metaCache.get(b.id)?.primaryDeadlineDate ?? null;
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate.getTime() - bDate.getTime();
    });
  }, [conferencesData, metaCache, selectedTags, selectedCountries, selectedRanks, selectedFormats, searchQuery, showPastConferences]);

  // Use a stable ref for the callback to prevent re-attaching the event listener
  const handleFilterByTagRef = useRef((tag: string) => {});

  useEffect(() => {
    handleFilterByTagRef.current = (tag: string) => {
      const newTags = new Set(selectedTags);
      newTags.add(tag);
      handleTagsChange(newTags);
    };
  }, [selectedTags]); // handleTagsChange is stable (defined in component body, but we'll use it safely)

  // Add event listener for tag clicks
  useEffect(() => {
    const handleFilterByTag = (event: CustomEvent<{ tag: string }>) => {
      handleFilterByTagRef.current(event.detail.tag);
    };

    // Add event listener
    window.addEventListener('filterByTag', handleFilterByTag as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('filterByTag', handleFilterByTag as EventListener);
    };
  }, []); // Empty dependency array ensures listener is only bound once

  // Update handleTagsChange to handle multiple tags
  const handleTagsChange = (newTags: Set<string>) => {
    startTransition(() => {
      setSelectedTags(newTags);
    });
    const searchParams = new URLSearchParams(window.location.search);
    if (newTags.size > 0) {
      searchParams.set('tags', Array.from(newTags).join(','));
    } else {
      searchParams.delete('tags');
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${searchParams}`);
  };

  const handleCountriesChange = (newCountries: Set<string>) => {
    startTransition(() => {
      setSelectedCountries(newCountries);
    });
    const searchParams = new URLSearchParams(window.location.search);
    if (newCountries.size > 0) {
      searchParams.set('countries', Array.from(newCountries).join(','));
    } else {
      searchParams.delete('countries');
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${searchParams}`);
  };

  const handleRanksChange = (newRanks: Set<string>) => {
    startTransition(() => {
      setSelectedRanks(newRanks);
    });
    const searchParams = new URLSearchParams(window.location.search);
    if (newRanks.size > 0) {
      searchParams.set('ranks', Array.from(newRanks).join(','));
    } else {
      searchParams.delete('ranks');
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${searchParams}`);
  };

  const handleFormatsChange = (newFormats: Set<string>) => {
    startTransition(() => {
      setSelectedFormats(newFormats);
    });
    const searchParams = new URLSearchParams(window.location.search);
    if (newFormats.size > 0) {
      searchParams.set('formats', Array.from(newFormats).join(','));
    } else {
      searchParams.delete('formats');
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${searchParams}`);
  };

  // Toggle a single tag
  const toggleTag = (tag: string) => {
    const newTags = new Set(selectedTags);
    if (newTags.has(tag)) {
      newTags.delete(tag);
    } else {
      newTags.add(tag);
    }
    handleTagsChange(newTags);
  };


  const countries = useMemo(() => getAllCountries(conferencesData as Conference[]), [conferencesData]);
  const formats = useMemo(() => getAllFormats(conferencesData as Conference[]), [conferencesData]);
  const ranks = useMemo(() => getAllRanks(conferencesData as Conference[]), [conferencesData]);

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
        {/* Calendar subscription notification */}
        <Alert className="mt-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <AlertDescription className="space-y-3">
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
            <button
              onClick={handleCopyCalendarUrl}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white text-sm font-medium rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Copy Calendar URL
            </button>
          </AlertDescription>
        </Alert>
        <div className="space-y-4 py-4">
          {/* Category filter buttons */}
          <div className="bg-card dark:bg-card shadow rounded-lg p-4">
            <div className="flex flex-wrap gap-2">
              {categoryButtons.map(category => (
                <button
                  key={category.id}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${selectedTags.has(category.id)
                      ? 'bg-primary/10 text-primary dark:bg-iris/20 dark:text-iris hover:bg-primary/20 dark:hover:bg-iris/30'
                      : 'bg-muted dark:bg-muted text-foreground hover:bg-muted/80 dark:hover:bg-muted/80'
                    }`}
                  onClick={() => {
                    const newTags = new Set(selectedTags);
                    if (newTags.has(category.id)) {
                      newTags.delete(category.id);
                    } else {
                      newTags.add(category.id);
                    }
                    handleTagsChange(newTags);
                  }}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Controls row with past conferences toggle and country filter */}
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

            <div className="flex flex-wrap items-center gap-2 bg-card dark:bg-card p-2 rounded-md shadow-sm">
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
                              onCheckedChange={() => {
                                const newCountries = new Set(selectedCountries);
                                if (newCountries.has(country)) {
                                  newCountries.delete(country);
                                } else {
                                  newCountries.add(country);
                                }
                                handleCountriesChange(newCountries);
                              }}
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

              {/* Display selected countries */}
              {Array.from(selectedCountries).map(country => (
                <button
                  key={country}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary dark:bg-iris/20 dark:text-iris hover:bg-primary/20 dark:hover:bg-iris/30 font-medium"
                  onClick={() => {
                    const newCountries = new Set(selectedCountries);
                    newCountries.delete(country);
                    handleCountriesChange(newCountries);
                  }}
                >
                  {country}
                  <X className="ml-1 h-3 w-3" />
                </button>
              ))}


              {/* Format filter popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1 hover:bg-gray-200 hover:text-foreground dark:hover:bg-card dark:hover:text-foreground">
                    <Globe className="h-4 w-4" />
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
                              onCheckedChange={() => {
                                const newFormats = new Set(selectedFormats);
                                if (newFormats.has(format)) {
                                  newFormats.delete(format);
                                } else {
                                  newFormats.add(format);
                                }
                                handleFormatsChange(newFormats);
                              }}
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

              {/* Display selected formats */}
              {Array.from(selectedFormats).map(format => (
                <button
                  key={format}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary dark:bg-iris/20 dark:text-iris hover:bg-primary/20 dark:hover:bg-iris/30 font-medium"
                  onClick={() => {
                    const newFormats = new Set(selectedFormats);
                    newFormats.delete(format);
                    handleFormatsChange(newFormats);
                  }}
                >
                  {format}
                  <X className="ml-1 h-3 w-3" />
                </button>
              ))}

              {/* Rank filter popover */}
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
                              onCheckedChange={() => {
                                const newRanks = new Set(selectedRanks);
                                if (newRanks.has(rank)) {
                                  newRanks.delete(rank);
                                } else {
                                  newRanks.add(rank);
                                }
                                handleRanksChange(newRanks);
                              }}
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

              {/* Display selected ranks */}
              {Array.from(selectedRanks).map(rank => (
                <button
                  key={rank}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary dark:bg-iris/20 dark:text-iris hover:bg-primary/20 dark:hover:bg-iris/30 font-medium"
                  onClick={() => {
                    const newRanks = new Set(selectedRanks);
                    newRanks.delete(rank);
                    handleRanksChange(newRanks);
                  }}
                >
                  {rank}
                  <X className="ml-1 h-3 w-3" />
                </button>
              ))}

              {/* Clear all filters button */}
              {(selectedTags.size > 0 || selectedCountries.size > 0 || selectedRanks.size > 0 || selectedFormats.size > 0) ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    handleTagsChange(new Set());
                    handleCountriesChange(new Set());
                    handleRanksChange(new Set());
                    handleFormatsChange(new Set());
                  }}
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
