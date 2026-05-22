import * as React from "react"
import { format, parse } from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface MonthYearPickerProps {
  value?: string
  onChange?: (date: string) => void
  placeholder?: string
  className?: string
  id?: string
  disabled?: boolean
}

const MONTHS = [
  { label: "Jan", value: 0 },
  { label: "Feb", value: 1 },
  { label: "Mar", value: 2 },
  { label: "Apr", value: 3 },
  { label: "May", value: 4 },
  { label: "Jun", value: 5 },
  { label: "Jul", value: 6 },
  { label: "Aug", value: 7 },
  { label: "Sep", value: 8 },
  { label: "Oct", value: 9 },
  { label: "Nov", value: 10 },
  { label: "Dec", value: 11 },
]

export function MonthYearPicker({ value, onChange, placeholder = "Select Month & Year", className, id, disabled }: MonthYearPickerProps) {
  const [open, setOpen] = React.useState(false);
  
  // Parse date from "MM-dd-yyyy", "MM/dd/yyyy", or "yyyy-MM-dd"
  const parsedDate = React.useMemo(() => {
    if (!value) return undefined;
    const formats = ["MM-dd-yyyy", "MM/dd/yyyy", "yyyy-MM-dd"];
    for (const f of formats) {
      try {
        const parsed = parse(value, f, new Date());
        if (!isNaN(parsed.getTime())) return parsed;
      } catch (e) {}
    }
    return undefined;
  }, [value]);

  const [currentYear, setCurrentYear] = React.useState<number>(() => {
    return parsedDate ? parsedDate.getFullYear() : new Date().getFullYear();
  });

  // Sync year state when value changes
  React.useEffect(() => {
    if (parsedDate) {
      setCurrentYear(parsedDate.getFullYear());
    }
  }, [parsedDate]);

  const handleMonthSelect = (monthIndex: number) => {
    if (onChange) {
      const newDate = new Date(currentYear, monthIndex, 1);
      onChange(format(newDate, "MM-dd-yyyy"));
      setOpen(false);
    }
  };

  const years = React.useMemo(() => {
    const current = new Date().getFullYear();
    const result = [];
    for (let y = current - 50; y <= current + 15; y++) {
      result.push(y);
    }
    return result.reverse(); // Newest first
  }, []);

  const displayLabel = React.useMemo(() => {
    if (!parsedDate) return placeholder;
    return format(parsedDate, "MMMM yyyy"); // e.g. "May 2024"
  }, [parsedDate, placeholder]);

  return (
    <Popover open={disabled ? false : open} onOpenChange={disabled ? () => {} : setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-medium h-10 rounded-lg bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 transition-colors",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-neutral-500 shrink-0" />
          <span className="truncate">{displayLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 bg-white border border-neutral-200 shadow-xl rounded-xl" align="start">
        <div onPointerDown={(e) => e.stopPropagation()} className="space-y-4">
          {/* Year selector header */}
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setCurrentYear(prev => prev - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Select 
              value={currentYear.toString()} 
              onValueChange={(val) => setCurrentYear(parseInt(val))}
            >
              <SelectTrigger className="h-8 flex-1 text-xs font-semibold rounded-lg bg-white">
                <SelectValue>{currentYear}</SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-48 overflow-y-auto bg-white">
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()} className="text-xs">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setCurrentYear(prev => prev + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Month selector grid */}
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((m) => {
              const isSelected = parsedDate && parsedDate.getMonth() === m.value && parsedDate.getFullYear() === currentYear;
              return (
                <Button
                  key={m.value}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "h-9 text-xs rounded-lg font-medium",
                    !isSelected && "hover:bg-neutral-50 hover:text-primary bg-white"
                  )}
                  onClick={() => handleMonthSelect(m.value)}
                >
                  {m.label}
                </Button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
