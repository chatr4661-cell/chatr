import React, { useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { POPULAR_COUNTRIES, ALL_COUNTRIES, type Country } from "@/utils/countryCodeUtil";

interface CountryCodeSelectorProps {
  value: string;
  onChange: (dialCode: string) => void;
  disabled?: boolean;
}

export const CountryCodeSelector = ({ value, onChange, disabled }: CountryCodeSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedCountry = ALL_COUNTRIES.find(c => c.dialCode === value) || POPULAR_COUNTRIES[0];

  const filteredCountries = search
    ? ALL_COUNTRIES.filter(
        country =>
          country.name.toLowerCase().includes(search.toLowerCase()) ||
          country.dialCode.includes(search)
      )
    : ALL_COUNTRIES;

  const handleSelect = (country: Country) => {
    onChange(country.dialCode);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[110px] justify-between"
          disabled={disabled}
        >
          <span className="flex items-center gap-1.5">
            <span className="text-lg">{selectedCountry.flag}</span>
            <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
          </span>
          <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="border-b px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search countries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          {!search && (
            <div className="px-2 py-2">
              <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                Popular Countries
              </div>
              {POPULAR_COUNTRIES.map((country) => (
                <div
                  key={country.code}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-sm px-2 py-2 text-sm hover:bg-accent",
                    selectedCountry.code === country.code && "bg-accent"
                  )}
                  onClick={() => handleSelect(country)}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{country.flag}</span>
                    <span>{country.name}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{country.dialCode}</span>
                    {selectedCountry.code === country.code && (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                </div>
              ))}
              <div className="my-2 border-t" />
              <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                All Countries
              </div>
            </div>
          )}
          <div className="px-2 pb-2">
            {filteredCountries.map((country) => (
              <div
                key={country.code}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-sm px-2 py-2 text-sm hover:bg-accent",
                  selectedCountry.code === country.code && "bg-accent"
                )}
                onClick={() => handleSelect(country)}
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">{country.flag}</span>
                  <span>{country.name}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{country.dialCode}</span>
                  {selectedCountry.code === country.code && (
                    <Check className="h-4 w-4" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
