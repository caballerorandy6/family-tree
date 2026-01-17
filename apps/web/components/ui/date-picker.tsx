'use client';

import * as React from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DatePickerProps {
  value?: number;
  onChange: (year: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  fromYear?: number;
  toYear?: number;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select year',
  disabled = false,
  fromYear = 1800,
  toYear = new Date().getFullYear(),
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [decade, setDecade] = React.useState(() => {
    if (value) {
      return Math.floor(value / 10) * 10;
    }
    return Math.floor((toYear - 30) / 10) * 10;
  });

  // Generate years for the current decade view
  const years = (() => {
    const result: number[] = [];
    const startYear = decade;
    const endYear = decade + 9;

    for (let year = startYear; year <= endYear; year++) {
      if (year >= fromYear && year <= toYear) {
        result.push(year);
      }
    }
    return result;
  })();

  // Generate decades for quick navigation
  const decades = (() => {
    const result: number[] = [];
    const startDecade = Math.floor(fromYear / 10) * 10;
    const endDecade = Math.floor(toYear / 10) * 10;

    for (let d = endDecade; d >= startDecade; d -= 10) {
      result.push(d);
    }
    return result;
  })();

  const handleSelectYear = (year: number) => {
    onChange(year);
    setOpen(false);
  };

  const handlePrevDecade = () => {
    const newDecade = decade - 10;
    if (newDecade >= Math.floor(fromYear / 10) * 10) {
      setDecade(newDecade);
    }
  };

  const handleNextDecade = () => {
    const newDecade = decade + 10;
    if (newDecade <= Math.floor(toYear / 10) * 10) {
      setDecade(newDecade);
    }
  };

  const canGoPrev = decade > Math.floor(fromYear / 10) * 10;
  const canGoNext = decade < Math.floor(toYear / 10) * 10;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? value.toString() : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-3">
          {/* Decade Navigation */}
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handlePrevDecade}
              disabled={!canGoPrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {decade} - {decade + 9}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleNextDecade}
              disabled={!canGoNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Year Grid */}
          <div className="grid grid-cols-5 gap-1 mb-3">
            {years.map((year) => (
              <Button
                key={year}
                variant={value === year ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'h-9 w-full',
                  value === year && 'bg-primary text-primary-foreground'
                )}
                onClick={() => handleSelectYear(year)}
              >
                {year}
              </Button>
            ))}
          </div>

          {/* Quick Jump to Decade */}
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2">Jump to decade:</p>
            <ScrollArea className="h-[100px]">
              <div className="grid grid-cols-4 gap-1">
                {decades.map((d) => (
                  <Button
                    key={d}
                    variant={decade === d ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDecade(d)}
                  >
                    {d}s
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Clear Button */}
          {value && (
            <div className="border-t pt-3 mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
