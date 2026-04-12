import { OrdinanceComboboxProps } from "@/types/types";
import { memo } from "react";
import { Label } from "./label";
import { Button } from "./button";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
import { cn } from "./utils";

const OrdinanceCombobox = memo(({
  label,
  value,
  ordinances,
  isFetching,
  search,
  open,
  disabled,
  error,
  onSearchChange,
  onOpenChange,
  onSelect
}: OrdinanceComboboxProps) => {
  const selectedOrdinance = ordinances.find((d) => Number(d.id) === value) ?? null;

  return (
    <div className="space-y-2 w-full">
      <div className="flex justify-between gap-4 mb-0 pb-0">
        <Label>{label}</Label>
      </div>

      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild className="py-2 h-auto">
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            aria-expanded={open}
            className={cn(
              "justify-between w-full font-normal text-left",
              error && "border-red-500"
            )}
            title={selectedOrdinance ? selectedOrdinance.title : 'Select ordinance...'}
          >
            <span className="text-sm break-words whitespace-normal">
              {selectedOrdinance
                ? (<><strong>{selectedOrdinance.ordinance_number}</strong> -{" "}{selectedOrdinance.title}</>)
                : "Select ordinance..."}
            </span>
            <ChevronsUpDown className="opacity-50 ml-2 w-4 h-4 shrink-0" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="p-0 w-[min(calc(100vw-2rem),650px)]"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          align="start"
        >
          <Command>
            <CommandInput
              placeholder="Search ordinance..."
              value={search}
              onValueChange={onSearchChange}
              className="border-b text-sm"
            />
            <CommandList className="max-h-[300px]">
              {isFetching && (
                <div className="flex justify-center items-center py-2">
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                </div>
              )}
              <CommandEmpty className={cn("py-6 text-sm text-center", isFetching && "hidden")}>
                No member found.
              </CommandEmpty>
              <CommandGroup className="p-2">
                <CommandItem
                  value="none"
                  onSelect={() => {
                    onSelect(0, null);
                    onOpenChange(false);
                    onSearchChange("");
                  }}
                  className="rounded-md cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 w-4 h-4 shrink-0",
                      value === 0 ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-muted-foreground text-sm">None</span>
                </CommandItem>
                {ordinances.map((ordinance) => (
                  <CommandItem
                    key={ordinance.id}
                    value={ordinance.title}
                    onSelect={() => {
                      onSelect(Number(ordinance.id), ordinance);
                      onOpenChange(false);
                      onSearchChange("");
                    }}
                    className="items-start py-3 rounded-md cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mt-1 mr-2 w-4 h-4 shrink-0",
                        value === Number(ordinance.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1 gap-1 min-w-0">
                      <span className="font-medium text-slate-900 text-sm">
                        {ordinance.ordinance_number}
                      </span>
                      {ordinance.title && (
                        <span className="text-slate-600 text-xs break-words leading-relaxed">
                          {ordinance.title}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {error && <p className="text-red-500 text-xs sm:text-sm">{error}</p>}
    </div>
  );
});

OrdinanceCombobox.displayName = "OrdinanceCombobox";

export default OrdinanceCombobox;