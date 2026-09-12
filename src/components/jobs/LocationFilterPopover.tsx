import React, { useState, useMemo, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ChevronDown, Search, X, Check } from "lucide-react";

interface LocationFilterPopoverProps {
  label?: string;
  options: any; // Can be array of strings (flat) or object { countries: {}, all_countries: [] }
  selected: string[];
  onChange: (selected: string[]) => void;
  isLoading?: boolean;
  activeColorClass?: string;
}


export const LocationFilterPopover: React.FC<LocationFilterPopoverProps> = ({
  label = "Location",
  options,
  selected,
  onChange,
  isLoading = false,
  activeColorClass = "bg-blue-50 text-[#0d47a1] border-blue-200 font-extrabold shadow-2xs",
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRenderLoading, setIsRenderLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setIsRenderLoading(true);
      const timer = setTimeout(() => setIsRenderLoading(false), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const showSkeleton = isLoading || isRenderLoading;

  // Extract countries list and city mappings dynamically from backend options
  const parsedData = useMemo(() => {
    if (options && typeof options === "object" && !Array.isArray(options) && options.countries) {
      const countryNames = options.all_countries && options.all_countries.length > 0
        ? options.all_countries
        : Object.keys(options.countries);

      const cityMap: Record<string, string[]> = {};
      countryNames.forEach((c: string) => {
        cityMap[c] = options.countries[c]?.cities || [];
      });

      return {
        countries: countryNames,
        cityMap,
      };
    }

    // Flat array fallback - dynamically group locations
    const flatLocations = Array.isArray(options) ? options : [];
    const countryNames: string[] = [];
    const cityMap: Record<string, string[]> = {};

    flatLocations.forEach((loc) => {
      if (typeof loc === "string" && loc.trim()) {
        const parts = loc.split(",").map((p) => p.trim());
        const country = parts.length > 1 ? parts[parts.length - 1] : loc;
        if (!countryNames.includes(country)) {
          countryNames.push(country);
          cityMap[country] = [];
        }
        if (!cityMap[country].includes(loc)) {
          cityMap[country].push(loc);
        }
      }
    });

    return {
      countries: countryNames,
      cityMap,
    };
  }, [options]);

  const [activeCountry, setActiveCountry] = useState<string>("");
  const [allLocationsSwitch, setAllLocationsSwitch] = useState<boolean>(false);

  // Set initial active country dynamically when data loads
  useEffect(() => {
    if (parsedData.countries.length > 0 && (!activeCountry || !parsedData.countries.includes(activeCountry))) {
      setActiveCountry(parsedData.countries[0]);
    }
  }, [parsedData.countries, activeCountry]);

  // Sync active country with existing selected filters if any
  useEffect(() => {
    if (selected.length > 0 && parsedData.countries.length > 0) {
      const match = parsedData.countries.find((c) => selected.includes(c));
      if (match) {
        setActiveCountry(match);
        setAllLocationsSwitch(true);
      }
    }
  }, [selected, parsedData.countries]);

  const handleCountrySelect = (country: string) => {
    setActiveCountry(country);
    setSearchTerm("");
    setAllLocationsSwitch(selected.includes(country));
  };

  const handleToggleAllLocations = (checked: boolean) => {
    setAllLocationsSwitch(checked);
    if (checked) {
      const citiesOfCountry = parsedData.cityMap[activeCountry] || [];
      const updated = selected.filter((item) => item !== activeCountry && !citiesOfCountry.includes(item));
      onChange([...updated, activeCountry]);
    } else {
      onChange(selected.filter((item) => item !== activeCountry));
    }
  };

  const handleToggleCity = (city: string) => {
    if (allLocationsSwitch) {
      setAllLocationsSwitch(false);
    }

    const withoutCountry = selected.filter((item) => item !== activeCountry);
    if (withoutCountry.includes(city)) {
      onChange(withoutCountry.filter((item) => item !== city));
    } else {
      onChange([...withoutCountry, city]);
    }
  };

  const handleReset = () => {
    onChange([]);
    setAllLocationsSwitch(false);
    setSearchTerm("");
  };

  const isSelected = selected.length > 0;
  const displayLabel = useMemo(() => {
    if (selected.length === 0) return label;
    if (selected.length === 1) return selected[0];
    return `${selected[0]} (+${selected.length - 1})`;
  }, [selected, label]);

  // Available cities for currently selected active country
  const currentCities = useMemo(() => {
    const rawCities = parsedData.cityMap[activeCountry] || [];
    if (!searchTerm.trim()) return rawCities;
    const q = searchTerm.toLowerCase().trim();
    return rawCities.filter((city) => city.toLowerCase().includes(q));
  }, [parsedData.cityMap, activeCountry, searchTerm]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-2xs ${isSelected
              ? activeColorClass
              : "bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 border-slate-200 font-medium"
            }`}
        >
          <MapPin className="h-3 w-3 text-[#0d47a1]" />
          <span>{displayLabel}</span>
          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={6} className="w-[420px] max-w-[90vw] p-4 rounded-2xl bg-white shadow-2xl border border-slate-200 space-y-3.5 z-50">
        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h4 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1">
            <span className="text-rose-500 font-bold">*</span>
            <span>Country & Location</span>
          </h4>
          {selected.length > 0 && (
            <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {selected.length} selected
            </span>
          )}
        </div>

        {/* Selected Tags Container (4-column grid layout) */}
        {selected.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5 p-1.5 max-h-36 overflow-y-auto custom-scrollbar bg-slate-50/70 rounded-xl border border-slate-100">
            {selected.map((item) => (
              <span
                key={item}
                className="inline-flex items-center justify-between gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-blue-100/90 text-blue-900 border border-blue-200/80 hover:bg-blue-200/80 transition-colors shadow-2xs min-w-0"
              >
                <span className="truncate">{item}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item === activeCountry) {
                      handleToggleAllLocations(false);
                    } else {
                      handleToggleCity(item);
                    }
                  }}
                  className="hover:text-rose-600 font-bold p-0.5 rounded-full hover:bg-blue-200/60 transition-colors cursor-pointer shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {showSkeleton ? (
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-6 w-full rounded-xl" />
              <Skeleton className="h-6 w-full rounded-xl" />
              <Skeleton className="h-6 w-full rounded-xl" />
            </div>
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <Skeleton className="h-7 w-full rounded-xl" />
              <Skeleton className="h-6 w-full rounded-xl" />
              <Skeleton className="h-6 w-full rounded-xl" />
              <Skeleton className="h-6 w-full rounded-xl" />
            </div>
          </div>
        ) : (
          <>
            {/* SECTION 1: Country Radio Selection List */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-900 tracking-wide block">
                Country
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {parsedData.countries.map((c) => {
                  const isChecked = activeCountry === c;
                  return (
                    <div
                      key={c}
                      onClick={() => handleCountrySelect(c)}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${isChecked
                          ? "bg-blue-50/80 text-slate-900 font-semibold"
                          : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isChecked
                            ? "border-[#0d47a1] bg-[#0d47a1] text-white"
                            : "border-slate-300 bg-white"
                          }`}
                      >
                        {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="truncate">{c}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: Location Header + All locations switch */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-900">Location</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-600">
                    All locations within {activeCountry}
                  </span>
                  <Switch
                    checked={allLocationsSwitch}
                    onCheckedChange={handleToggleAllLocations}
                    className="data-[state=checked]:bg-[#0d47a1] h-5 w-9"
                  />
                </div>
              </div>

              {/* SECTION 3: Search Box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search city, state or area..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* SECTION 4: Scrollable Cities / States List */}
              <div className="max-h-44 overflow-y-auto space-y-1 my-1 pr-1 custom-scrollbar">
                {currentCities.length === 0 ? (
                  <div className="py-3 text-center text-xs text-slate-400 font-medium">
                    No locations match "{searchTerm}"
                  </div>
                ) : (
                  currentCities.map((city) => {
                    const isChecked = selected.includes(city);
                    return (
                      <div
                        key={city}
                        onClick={() => handleToggleCity(city)}
                        className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${isChecked
                            ? "bg-blue-50 text-blue-950 font-bold"
                            : "text-slate-700 hover:bg-slate-50"
                          }`}
                      >
                        <span className="truncate">{city}</span>
                        {isChecked && <Check className="h-3.5 w-3.5 text-blue-600 stroke-[3] shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {/* Action Buttons: Reset & Confirm */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleReset}
            disabled={selected.length === 0 && !allLocationsSwitch && !searchTerm}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors px-1 py-0.5"
          >
            Reset
          </button>
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
          >
            Confirm
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LocationFilterPopover;
