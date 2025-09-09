import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import ConferenceCard from "@/components/ConferenceCard";
import conferencesData from "@/data/conferences.yml";
import { Conference } from "@/types/conference";
import { useState, useMemo, useEffect } from "react";
import { Switch } from "@/components/ui/switch"
import { parseISO, isValid, isPast } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Globe, ChartNoAxesColumn } from "lucide-react";
import { getAllCountries } from "@/utils/countryExtractor";
import { getDeadlineInLocalTime } from "@/utils/dateUtils";
import { getAllRanks } from "@/utils/rankExtractor";
import { getAllFormats } from "@/utils/formatExtractor";

const Index = () => {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [showPastConferences, setShowPastConferences] = useState(false);
  const [selectedRanks, setSelectedRanks] = useState<Set<string>>(new Set());
  const [selectedFormats, setSelectedFormats] = useState<Set<string>>(new Set());

  // Category buttons configuration
  const categoryButtons = [
    { id: "machine-learning", label: "Machine Learning" },
    { id: "robotics", label: "Robotics" },
    { id: "computer-vision", label: "Computer Vision" },
    { id: "data-mining", label: "Data Mining" },
    { id: "natural-language-processing", label: "Natural Language Processing" },
    { id: "signal-processing", label: "Signal Processing" },
    { id: "speech-processing", label: "Speech Processing" },
    { id: "human-computer-interaction", label: "Human Computer Interaction" },
  ];

  const filteredConferences = useMemo(() => {
    if (!Array.isArray(conferencesData)) {
      console.error("Conferences data is not an array:", conferencesData);
      return [];
    }

    return conferencesData
      .filter((conf: Conference) => {
        // Filter by deadline (past/future)
        const deadlineDate = conf.deadline && conf.deadline !== 'TBD' ? parseISO(conf.deadline) : null;
        const isUpcoming = !deadlineDate || !isValid(deadlineDate) || !isPast(deadlineDate);
        if (!showPastConferences && !isUpcoming) return false;

        // Filter by tags
        const matchesTags = selectedTags.size === 0 || 
          (Array.isArray(conf.tags) && conf.tags.some(tag => selectedTags.has(tag)));
        
        // Filter by countries
        const matchesCountry = selectedCountries.size === 0 || 
          (conf.country && selectedCountries.has(conf.country));
        
        // Filter by search query
        const matchesSearch = searchQuery === "" || 
          conf.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (conf.full_name && conf.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
        
        // Add rank filter
        const matchesRank = selectedRanks.size === 0 || 
          (conf.rankings?.rank_name && selectedRanks.has(conf.rankings.rank_name));
        
        // Add format filter
        const matchesFormat = selectedFormats.size === 0 || 
          (conf.format && selectedFormats.has(conf.format));
        
        return matchesTags && matchesCountry && matchesRank && matchesFormat && matchesSearch;
      })
      .sort((a: Conference, b: Conference) => {
        const aDeadline = getDeadlineInLocalTime(a.deadline, a.timezone);
        const bDeadline = getDeadlineInLocalTime(b.deadline, b.timezone);
        
        if (aDeadline && bDeadline) {
          return aDeadline.getTime() - bDeadline.getTime();
        }
        
        // Handle cases where one or both deadlines are invalid
        if (!aDeadline && !bDeadline) return 0;
        if (!aDeadline) return 1;
        if (!bDeadline) return -1;
        
        return 0;
      });
  }, [selectedTags, selectedCountries, selectedRanks, selectedFormats, searchQuery, showPastConferences]);

  // Add event listener for tag clicks
  useEffect(() => {
    const handleFilterByTag = (event: CustomEvent<{ tag: string }>) => {
      const tag = event.detail.tag;
      // Create new set with existing tags and add the new one
      const newTags = new Set(selectedTags);
      newTags.add(tag);
      handleTagsChange(newTags);
    };

    // Add event listener
    window.addEventListener('filterByTag', handleFilterByTag as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('filterByTag', handleFilterByTag as EventListener);
    };
  }, [selectedTags]); // Add selectedTags to dependency array

  // Update handleTagsChange to handle multiple tags
  const handleTagsChange = (newTags: Set<string>) => {
    setSelectedTags(newTags);
    const searchParams = new URLSearchParams(window.location.search);
    if (newTags.size > 0) {
      searchParams.set('tags', Array.from(newTags).join(','));
    } else {
      searchParams.delete('tags');
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${searchParams}`);
  };

  const handleCountriesChange = (newCountries: Set<string>) => {
    setSelectedCountries(newCountries);
    const searchParams = new URLSearchParams(window.location.search);
    if (newCountries.size > 0) {
      searchParams.set('countries', Array.from(newCountries).join(','));
    } else {
      searchParams.delete('countries');
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${searchParams}`);
  };

  const handleRanksChange = (newRanks: Set<string>) => {
    setSelectedRanks(newRanks);
    const searchParams = new URLSearchParams(window.location.search);
    if (newRanks.size > 0) {
      searchParams.set('ranks', Array.from(newRanks).join(','));
    } else {
      searchParams.delete('ranks');
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${searchParams}`);
  };

  const handleFormatsChange = (newFormats: Set<string>) => {
    setSelectedFormats(newFormats);
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

  // Load filters from URL on initial render
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tagsParam = searchParams.get('tags');
    const countriesParam = searchParams.get('countries');
    const ranksParam = searchParams.get('ranks');
    const formatsParam = searchParams.get('formats');

    if (tagsParam) {
      const tags = tagsParam.split(',');
      setSelectedTags(new Set(tags));
    }
    
    if (countriesParam) {
      const countries = countriesParam.split(',');
      setSelectedCountries(new Set(countries));
    }

    if (ranksParam) {
      const ranks = ranksParam.split(',');
      setSelectedRanks(new Set(ranks));
    }

    if (formatsParam) {
      const formats = formatsParam.split(',');
      setSelectedFormats(new Set(formats));
    }
  }, []);

  if (!Array.isArray(conferencesData)) {
    return <div>Loading conferences...</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-light">
      <Header onSearch={setSearchQuery} showEmptyMessage={false} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 py-4">
          {/* Category filter buttons */}
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex flex-wrap gap-2">
              {categoryButtons.map(category => (
                <button
                  key={category.id}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedTags.has(category.id) 
                      ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
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
            <div className="flex items-center gap-2 bg-white p-2 rounded-md shadow-sm">
              <label htmlFor="show-past" className="text-sm text-neutral-600">
                Show past conferences
              </label>
              <Switch
                id="show-past"
                checked={showPastConferences}
                onCheckedChange={setShowPastConferences}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-md shadow-sm">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <Globe className="h-4 w-4" />
                    Filter by Country
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4 bg-white" align="start">
                  <div className="space-y-4">
                    <div>
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-800">Country</h4>
                      </div>
                      <div 
                        className="max-h-60 overflow-y-auto space-y-2 bg-white overscroll-contain touch-pan-y" 
                        style={{ WebkitOverflowScrolling: "touch" }}
                      >
                        {getAllCountries(conferencesData as Conference[]).map(country => (
                          <div key={country} className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded">
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
                              className="text-sm font-medium text-gray-700 cursor-pointer w-full py-1"
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
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 font-medium"
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
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <Globe className="h-4 w-4" />
                    Filter by Format
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4 bg-white" align="start">
                  <div className="space-y-4">
                    <div>
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-800">Format</h4>
                      </div>
                      <div 
                        className="max-h-60 overflow-y-auto space-y-2 bg-white overscroll-contain touch-pan-y" 
                        style={{ WebkitOverflowScrolling: "touch" }}
                      >
                        {getAllFormats(conferencesData as Conference[]).map(format => (
                          <div key={format} className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded">
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
                              className="text-sm font-medium text-gray-700 cursor-pointer w-full py-1"
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
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 font-medium"
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
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <ChartNoAxesColumn className="h-4 w-4" />
                    Filter by Rank
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4 bg-white" align="start">
                  <div className="space-y-4">
                    <div>
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-800">Rank</h4>
                      </div>
                      <div 
                        className="max-h-60 overflow-y-auto space-y-2 bg-white overscroll-contain touch-pan-y" 
                        style={{ WebkitOverflowScrolling: "touch" }}
                      >
                        {getAllRanks(conferencesData as Conference[]).map(rank => (
                          <div key={rank} className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded">
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
                              className="text-sm font-medium text-gray-700 cursor-pointer w-full py-1"
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
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 font-medium"
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
              {(selectedTags.size > 0 || selectedCountries.size > 0 || selectedRanks.size > 0 || selectedFormats.size > 0) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    handleTagsChange(new Set());
                    handleCountriesChange(new Set());
                    handleRanksChange(new Set());
                    handleFormatsChange(new Set());
                  }}
                  className="text-neutral-500 hover:text-neutral-700"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredConferences.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-4 mb-6">
            <p className="text-center">
              There are no upcoming conferences for the selected categories - enable "Show past conferences" to see previous ones
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConferences.map((conference: Conference) => (
            <ConferenceCard key={conference.id} {...conference} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
