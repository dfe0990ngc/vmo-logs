import { DocumentComboboxProps } from "@/types/types";
import { memo } from "react";
import { Label } from "./label";
import { Button } from "./button";
import { Check, ChevronsUpDown, Copy, Globe2, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
import { cn } from "./utils";

const DocumentCombobox = memo(({
  label,
  value,
  documents,
  isFetching,
  search,
  open,
  disabled,
  error,
  copiedId,
  isDownloading,
  onSearchChange,
  onOpenChange,
  onSelect,
  onCopyTitle,
  onDownload,
}: DocumentComboboxProps) => {
  const selectedDoc = documents.find((d) => d.id === value) ?? null;
  return (
    <div className="space-y-2 col-span-full">
      <div className="flex justify-between gap-4 mb-0 pb-0">
        <Label>{label}</Label>
        {selectedDoc && (
          <div className="flex justify-end items-center gap-x-2">
            {onCopyTitle && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="flex-shrink-0 hover:bg-muted"
                onClick={() => onCopyTitle(selectedDoc)}
                title={copiedId === selectedDoc.id ? "Copied!" : "Copy Document title"}
              >
                {copiedId === selectedDoc.id ? (
                  <Check className="w-3 h-3 text-green-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                Copy Title
              </Button>
            )}
            {onDownload && (
              <Button
                title="View Document in new tab"
                disabled={isDownloading}
                onClick={() => onDownload(selectedDoc.id)}
                type="button"
                variant="link"
                className="my-0 py-0 text-xs"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Globe2 className="w-6 h-6" />
                )}
                View Document
              </Button>
            )}
          </div>
        )}
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
            title={
              selectedDoc
                ? `${selectedDoc.document_number} - ${selectedDoc.title || "Untitled"}`
                : "Select document..."
            }
          >
            <span className="text-sm break-words whitespace-normal">
              {selectedDoc
                ? `${selectedDoc.document_number} - ${selectedDoc.title || "Untitled"}`
                : "Select document..."}
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
              placeholder="Search documents..."
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
                No document found.
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
                {documents.map((doc) => doc.title && (
                  <CommandItem
                    key={doc.id}
                    value={`${doc.document_number} ${doc.title}`}
                    onSelect={() => {
                      // Pass the full doc object — caller pins it synchronously,
                      // so the trigger label appears instantly, no async wait.
                      onSelect(doc.id, doc);
                      onOpenChange(false);
                      onSearchChange("");
                    }}
                    className="items-start py-3 rounded-md cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mt-1 mr-2 w-4 h-4 shrink-0",
                        value === doc.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1 gap-1 min-w-0">
                      <span className="font-medium text-sm">{doc.document_number}</span>
                      <span className="text-muted-foreground text-xs break-words line-clamp-2 leading-relaxed whitespace-normal">
                        {doc.title}
                      </span>
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

DocumentCombobox.displayName = "DocumentCombobox";

export default DocumentCombobox;