import { useMemo } from "react";
import conferencesData from "@/utils/conferenceLoader";
import { X, ChevronRight, Filter } from "lucide-react";
import { getAllRanks } from "@/utils/rankExtractor";
import { getAllFormats } from "@/utils/formatExtractor";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Conference } from "@/types/conference";

interface FilterBarProps {
  selectedTags: Set<string>;
  selectedCountries: Set<string>;
  selectedRanks: Set<string>;
  selectedFormats: Set<string>; // Add this
  onTagSelect: (tags: Set<string>) => void;
  onCountrySelect: (countries: Set<string>) => void;
  onRankSelect: (ranks: Set<string>) => void;
  onFormatSelect: (formats: Set<string>) => void; // Add this
}

const FilterBar = ({ 
  selectedTags = new Set(), 
  selectedCountries = new Set(),
  selectedRanks = new Set(),
  selectedFormats = new Set(),
  onTagSelect,
  onCountrySelect,
  onRankSelect,
  onFormatSelect
}: FilterBarProps) => {
  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    if (Array.isArray(conferencesData)) {
      conferencesData.forEach(conf => {
        if (Array.isArray(conf.tags)) {
          conf.tags.forEach(tag => tags.add(tag));
        }
      });
    }
    return Array.from(tags).map(tag => ({
      id: tag,
      label: tag.split("-").map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(" "),
      description: `${tag} Conferences`
    }));
  }, []);

  const ranks = useMemo(() => {
    if (Array.isArray(conferencesData)) {
      return getAllRanks(conferencesData);
    }
    return [];
  }, []);

  const formats = useMemo(() => {
    if (Array.isArray(conferencesData)) {
      return getAllFormats(conferencesData);
    }
    return [];
  }, []);

  const isTagSelected = (tagId: string) => {
    return selectedTags?.has(tagId) ?? false;
  };

  const handleTagChange = (tagId: string) => {
    const newSelectedTags = new Set(selectedTags);
    if (newSelectedTags.has(tagId)) {
      newSelectedTags.delete(tagId);
    } else {
      newSelectedTags.add(tagId);
    }
    onTagSelect(newSelectedTags);
  };

  const clearAllFilters = () => {
    onTagSelect(new Set());
    onCountrySelect(new Set());
    onRankSelect(new Set());
    onFormatSelect(new Set()); // Add this
  };

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className={`h-8 gap-1 ${selectedTags.size > 0 ? 'bg-blue-50 border-blue-200' : ''}`}
              >
                <Filter className="h-4 w-4" />
                Filter by Tag {selectedTags.size > 0 && `(${selectedTags.size})`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-800">Tags</h4>
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {uniqueTags.map(tag => (
                      <div key={tag.id} className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded">
                        <Checkbox 
                          id={`tag-${tag.id}`}
                          checked={isTagSelected(tag.id)}
                          onCheckedChange={() => handleTagChange(tag.id)}
                        />
                        <label 
                          htmlFor={`tag-${tag.id}`}
                          className="text-sm font-medium text-gray-700 cursor-pointer w-full py-1"
                        >
                          {tag.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Add Rank Filter Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Filter className="h-4 w-4" />
                Filter by Rank
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-800">Ranks</h4>
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {ranks.map(rank => (
                      <div key={rank} className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded">
                        <Checkbox 
                          id={`rank-${rank}`}
                          checked={selectedRanks.has(rank)}
                          onCheckedChange={() => {
                            const newSelectedRanks = new Set(selectedRanks);
                            if (newSelectedRanks.has(rank)) {
                              newSelectedRanks.delete(rank);
                            } else {
                              newSelectedRanks.add(rank);
                            }
                            onRankSelect(newSelectedRanks);
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

          {/* Add Format Filter Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Filter className="h-4 w-4" />
                Filter by Format
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4" align="start">
              <div className="space-y-4">
                <div>
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-800">Format</h4>
                  </div>
                  <div 
                    className="max-h-60 overflow-y-auto space-y-2 bg-white overscroll-contain touch-pan-y" 
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    {formats.map(format => (
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
                            onFormatSelect(newFormats);
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

          {/* Clear all filters button */}
          {(selectedTags.size > 0 || selectedCountries.size > 0 || 
            selectedRanks.size > 0 || selectedFormats.size > 0) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAllFilters}
              className="text-neutral-500 hover:text-neutral-700"
            >
              Clear all
            </Button>
          )}
          
          {/* Display selected tags */}
          {Array.from(selectedTags).map(tag => (
            <button
              key={tag}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 font-medium"
              onClick={() => handleTagChange(tag)}
            >
              {tag.split("-").map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(" ")}
              <X className="ml-1 h-3 w-3" />
            </button>
          ))}

          {/* Display selected ranks */}
          {Array.from(selectedRanks).map(rank => (
            <button
              key={rank}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 font-medium"
              onClick={() => {
                const newSelectedRanks = new Set(selectedRanks);
                newSelectedRanks.delete(rank);
                onRankSelect(newSelectedRanks);
              }}
            >
              {rank}
              <X className="ml-1 h-3 w-3" />
            </button>
          ))}

          {/* Display selected formats */}
          {Array.from(selectedFormats).map(format => (
            <button
              key={format}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 font-medium"
              onClick={() => {
                const newFormats = new Set(selectedFormats);
                newFormats.delete(format);
                onFormatSelect(newFormats);
              }}
            >
              {format}
              <X className="ml-1 h-3 w-3" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
