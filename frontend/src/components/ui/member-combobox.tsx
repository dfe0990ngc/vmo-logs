import { MemberComboboxProps } from "@/types/types";
import { memo } from "react";
import { Label } from "./label";
import { Button } from "./button";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
import { cn } from "./utils";

const MemberCombobox = memo(({
  label,
  value,
  members,
  isFetching,
  search,
  open,
  disabled,
  error,
  onSearchChange,
  onOpenChange,
  onSelect
}: MemberComboboxProps) => {
  const selectedMember = members.find((d) => d.id === value) ?? null;

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
            title={selectedMember ? `${selectedMember?.prefix ? selectedMember?.prefix + ". " : ""}${
                selectedMember?.first_name
              }${selectedMember?.middle_name ? " " + selectedMember?.middle_name[0] + "." : ""} ${
                selectedMember?.last_name
              }${selectedMember?.suffix ? ", " + selectedMember?.suffix : ""}` : 'Select member...'}
          >
            <span className="text-sm break-words whitespace-normal">
              {selectedMember
                ? `${selectedMember?.prefix ? selectedMember?.prefix + ". " : ""}${
                    selectedMember?.first_name
                  }${selectedMember?.middle_name ? " " + selectedMember?.middle_name[0] + "." : ""} ${
                    selectedMember?.last_name
                  }${selectedMember?.suffix ? ", " + selectedMember?.suffix : ""}`
                : "Select member..."}
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
              placeholder="Search members..."
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
                {members.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={`${member?.prefix ? member?.prefix + ". " : ""}${
                          member?.first_name
                        }${member?.middle_name ? " " + member?.middle_name[0] + "." : ""} ${
                          member?.last_name
                        }${member?.suffix ? ", " + member?.suffix : ""}`}
                    onSelect={() => {
                      onSelect(member.id, member);
                      onOpenChange(false);
                      onSearchChange("");
                    }}
                    className="items-start py-3 rounded-md cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mt-1 mr-2 w-4 h-4 shrink-0",
                        value === member.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1 gap-1 min-w-0">
                      <span className="font-medium text-sm">{
                        `${member?.prefix ? member?.prefix + ". " : ""}${
                          member?.first_name
                        }${member?.middle_name ? " " + member?.middle_name[0] + "." : ""} ${
                          member?.last_name
                        }${member?.suffix ? ", " + member?.suffix : ""}`
                      }</span>
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

MemberCombobox.displayName = "MemberCombobox";

export default MemberCombobox;