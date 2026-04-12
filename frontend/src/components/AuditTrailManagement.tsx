import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, 
  ChevronRight,
  FileText, 
  Filter, 
  RefreshCw,
  X 
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import EmptyState from "./EmptyState";
import { 
  useAuditTrails, 
  useAuditTrailFilters, 
  useFilterOptions 
} from "@/features/audit_trails/audit_trails.hooks";
import DataTable from "@/features/audit_trails/ui/DataTable";
import FormDialog from "@/features/audit_trails/ui/FormDialog";
import { AuditTrail } from "@/features/audit_trails/audit_trails.types";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function AuditTrailManagement() {
  const { user } = useAuth();
  const { filters, updateFilters } = useAuditTrailFilters();
  const { data, isFetching, refetch } = useAuditTrails(filters);
  const { data: filterOptions } = useFilterOptions();

  const auditTrails = data?.audit_trails ?? [];
  const pagination = data?.pagination;

  const [searchText, setSearchText] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [userIdFilter, setUserIdFilter] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounce(searchText, 500);

  const [selectedAuditTrail, setSelectedAuditTrail] = useState<AuditTrail | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Update filters when debounced values change
  useEffect(() => {
    updateFilters({
      search: debouncedSearch,
      action: actionFilter,
      entity_type: entityTypeFilter,
      user_id: userIdFilter,
      start_date: startDate,
      end_date: endDate,
      page: 1, // Reset to page 1 when filters change
      limit: 10,
    });
  }, [
    debouncedSearch,
    actionFilter,
    entityTypeFilter,
    userIdFilter,
    startDate,
    endDate,
    updateFilters,
  ]);

  const handlePageChange = (page: number) => {
    if (!pagination) return;
    if (page >= 1 && page <= pagination.total_pages) {
      updateFilters({ page });
    }
  };

  const handleViewDetails = (auditTrail: AuditTrail) => {
    setSelectedAuditTrail(auditTrail);
    setShowDetailDialog(true);
  };

  const closeDetailDialog = () => {
    setShowDetailDialog(false);
    setTimeout(() => setSelectedAuditTrail(null), 150);
  };

  const clearFilters = () => {
    setSearchText("");
    setActionFilter("all");
    setEntityTypeFilter("all");
    setUserIdFilter("");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters = 
    searchText !== "" || 
    actionFilter !== "all" || 
    entityTypeFilter !== "all" || 
    userIdFilter !== "" || 
    startDate !== "" || 
    endDate !== "";

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+F to focus search
      if (event.ctrlKey && (event.key === 'f' || event.key === 'F')) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const getActionColor = (action: string) => {
    const colors = {
      CREATE: "text-green-600 bg-green-50",
      UPDATE: "text-blue-600 bg-blue-50",
      DELETE: "text-red-600 bg-red-50",
      LOGIN: "text-purple-600 bg-purple-50",
      LOGOUT: "text-gray-600 bg-gray-50",
      ACCESS: "text-cyan-600 bg-cyan-50",
      EXPORT: "text-orange-600 bg-orange-50",
      IMPORT: "text-indigo-600 bg-indigo-50",
      OTHER: "text-gray-600 bg-gray-50",
    };
    return colors[action as keyof typeof colors] || "text-gray-600 bg-gray-50";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1, duration: 0.25, type: "tween" }}
      className="space-y-4 p-0 sm:p-4"
    >
      {/* Header */}
      <div className="relative flex sm:flex-row flex-col justify-between items-start sm:items-center gap-4">
        <div className="-top-8 right-0 absolute font-mono text-[11px]">
          <span>
            Search: <strong className="font-extrabold">[Ctrl + F]</strong>
          </span>
        </div>
        <div>
          <h1 className="font-medium text-lg">Audit Trail</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            View system activity and changes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`mr-2 w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              ref={searchInputRef}
              placeholder="Search by user, entity, or description..."
              value={searchText}
              onChange={(e) => {
                const target = e.target;
                const cursorPosition = target.selectionStart;
                setSearchText(e.target.value);
                requestAnimationFrame(() => {
                  if (target) {
                    target.setSelectionRange(cursorPosition, cursorPosition);
                  }
                });
              }}
              className="bg-white py-1 border border-gray-300"
              autoComplete="off"
            />
            {isFetching && (
              <div className="top-1/2 right-3 absolute -translate-y-1/2">
                <div className="inline-block border-[#008ea2] border-t-2 border-r-2 border-b-transparent border-l-transparent rounded-full w-4 h-4 animate-spin"></div>
              </div>
            )}
          </div>

          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="mr-2 w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <span className="-top-1 -right-1 absolute bg-[#008ea2] rounded-full w-2 h-2"></span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="px-3 py-2">
              <SheetHeader>
                <SheetTitle>Filter Audit Trails</SheetTitle>
                <SheetDescription>
                  Narrow down the audit trail records
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 mt-6">
                {/* Action Filter */}
                <div className="space-y-2">
                  <Label htmlFor="action-filter">Action Type</Label>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger id="action-filter">
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      <SelectItem value="all">All actions</SelectItem>
                      {filterOptions?.actions?.map((action) => (
                        <SelectItem key={action} value={action}>
                          {action}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Entity Type Filter */}
                <div className="space-y-2">
                  <Label htmlFor="entity-filter">Entity Type</Label>
                  <Select
                    value={entityTypeFilter}
                    onValueChange={setEntityTypeFilter}
                  >
                    <SelectTrigger id="entity-filter">
                      <SelectValue placeholder="All entities" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      <SelectItem value="all">All entities</SelectItem>
                      {filterOptions?.entity_types?.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* User Filter */}
                <div className="space-y-2">
                  <Label htmlFor="user-filter">User</Label>
                  <Select
                    value={userIdFilter?.toString() || "all"}
                    onValueChange={(val) =>
                      setUserIdFilter(val === "all" ? "" : val)
                    }
                  >
                    <SelectTrigger id="user-filter">
                      <SelectValue placeholder="All users" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      <SelectItem value="all">All users</SelectItem>
                      {filterOptions?.users?.map((user) => (
                        <SelectItem
                          key={user.user_id}
                          value={user.user_id.toString()}
                        >
                          {user.user_name} ({user.user_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="w-full"
                  >
                    <X className="mr-2 w-4 h-4" />
                    Clear All Filters
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {searchText && (
              <span className="inline-flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md text-blue-700 text-xs">
                Search: {searchText}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => setSearchText("")}
                />
              </span>
            )}
            {actionFilter !== "all" && (
              <span className="inline-flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md text-blue-700 text-xs">
                Action: {actionFilter}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => setActionFilter("all")}
                />
              </span>
            )}
            {entityTypeFilter !== "all" && (
              <span className="inline-flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md text-blue-700 text-xs">
                Entity: {entityTypeFilter}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => setEntityTypeFilter("all")}
                />
              </span>
            )}
            {startDate && (
              <span className="inline-flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md text-blue-700 text-xs">
                From: {startDate}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => setStartDate("")}
                />
              </span>
            )}
            {endDate && (
              <span className="inline-flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md text-blue-700 text-xs">
                To: {endDate}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => setEndDate("")}
                />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Audit Trail Table */}
      {auditTrails.length > 0 || isFetching ? (
        <Card className={`${isFetching ? "opacity-60 pointer-events-none" : ""} sm:gap-4 gap-2`}>
          <CardHeader className="relative">
            {pagination && (
              <div className="sm:top-4 sm:right-6 sm:absolute flex items-center gap-2 text-sm">
                <span>
                  Page {pagination.current_page} of {pagination.total_pages} —{" "}
                  <strong>{pagination.total}</strong> records
                </span>

                <ChevronLeft
                  className={`w-6 h-6 ${
                    pagination.current_page === 1
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                />

                <ChevronRight
                  className={`w-6 h-6 ${
                    pagination.current_page === pagination.total_pages
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                />
              </div>
            )}
          </CardHeader>

          <CardContent className="px-3 sm:px-6 sm:[&:last-child]:pb-6 [&:last-child]:pb-0 overflow-x-auto">
            <DataTable
              auditTrails={auditTrails}
              onViewDetails={handleViewDetails}
              getActionColor={getActionColor}
            />
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={<FileText className="w-6 h-6" />}
          title="No audit trails found"
          description="Try adjusting your search or filters to find audit trail records."
        />
      )}

      {/* Detail Dialog */}
      <FormDialog
        open={showDetailDialog}
        onClose={closeDetailDialog}
        auditTrail={selectedAuditTrail}
        getActionColor={getActionColor}
      />
    </motion.div>
  );
}
