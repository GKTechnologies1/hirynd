"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"

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
  disabled?: boolean
  formatStr?: string
}

export function DatePicker({ value, onChange, placeholder = "MM/DD/YYYY", className, id, disabled, formatStr = "MM/dd/yyyy" }: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (!value) return undefined;

    // Try multiple formats
    const formats = ["MM-dd-yyyy", "MM/dd/yyyy", "yyyy-MM-dd"];
    for (const f of formats) {
      try {
        const parsed = parse(value, f, new Date());
        if (!isNaN(parsed.getTime())) return parsed;
      } catch (e) { }
    }
    return undefined;
  });

  const [open, setOpen] = React.useState(false);

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
      } catch (e) { }
    }
    if (!found) setDate(undefined);
  }, [value]);

  const handleSelect = (newDate: Date | undefined) => {
    setDate(newDate);
    if (onChange) {
      if (newDate) {
        onChange(format(newDate, formatStr));
        setOpen(false); // Close the calendar after selection
      } else {
        onChange("");
      }
    }
  };

  return (
    <Popover open={disabled ? false : open} onOpenChange={disabled ? () => { } : setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant={"outline"}
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-bold h-14 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors flex items-center",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{date ? format(date, formatStr) : placeholder}</span>
          {date && !disabled && (
            <div
              role="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(undefined);
              }}
              className="ml-auto hover:bg-slate-200 p-0.5 rounded transition-colors text-neutral-500 hover:text-neutral-900 flex items-center justify-center cursor-pointer shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </div>
          )}
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
