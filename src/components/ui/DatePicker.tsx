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
    // Try to parse MM/dd/yyyy
    try {
      const formatString = value.includes("/") ? "MM/dd/yyyy" : "MM-dd-yyyy";
      const parsed = parse(value, formatString, new Date());
      return isNaN(parsed.getTime()) ? undefined : parsed;
    } catch {
      return undefined;
    }
  });

  const handleSelect = (newDate: Date | undefined) => {
    setDate(newDate);
    if (onChange && newDate) {
      onChange(format(newDate, "MM/dd/yyyy"));
    } else if (onChange && !newDate) {
      onChange("");
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
          {date ? format(date, "MM/dd/yyyy") : <span>{placeholder}</span>}
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
