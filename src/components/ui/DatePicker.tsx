"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: string
  onChange?: (date: string) => void
  placeholder?: string
  className?: string
  id?: string
}

export function DatePicker({ value, onChange, placeholder = "MM/DD/YYYY", className, id }: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (!value) return undefined;
    
    // Try multiple formats
    const formats = ["MM-dd-yyyy", "MM/dd/yyyy", "yyyy-MM-dd"];
    for (const f of formats) {
      try {
        const parsed = parse(value, f, new Date());
        if (!isNaN(parsed.getTime())) return parsed;
      } catch (e) {}
    }
    return undefined;
  });

  // Sync internal state when value prop changes
  React.useEffect(() => {
    if (!value) {
      setDate(undefined);
      return;
    }
    
    const formats = ["MM-dd-yyyy", "MM/dd/yyyy", "yyyy-MM-dd"];
    let found = false;
    for (const f of formats) {
      try {
        const parsed = parse(value, f, new Date());
        if (!isNaN(parsed.getTime())) {
          setDate(parsed);
          found = true;
          break;
        }
      } catch (e) {}
    }
    if (!found) setDate(undefined);
  }, [value]);

  const handleSelect = (newDate: Date | undefined) => {
    setDate(newDate);
    if (onChange) {
      if (newDate) {
        onChange(format(newDate, "MM-dd-yyyy"));
      } else {
        onChange("");
      }
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "MM-dd-yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div onPointerDown={(e) => e.stopPropagation()}>
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            initialFocus
            captionLayout="dropdown"
            fromYear={1950}
            toYear={2050}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
