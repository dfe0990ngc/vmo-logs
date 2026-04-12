import { useEffect, useRef, useCallback, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

import { useAuth } from "@/context/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";

import EmptyState from "./EmptyState";
import { useCreateUser, useDeleteUser, useUpdateUser, useUserFilters, useUsers } from "@/features/users/users.hooks";
import { CreateUserDTO, UpdateUserDTO, User } from "@/features/users/users.types";
import DataTable from "@/features/users/ui/DataTable";
import FormDialog from "@/features/users/ui/FormDialog";
import DeleteDialog from "@/features/users/ui/DeleteDialog";
import { usePagination } from "@/hooks/useManagementHooks";
import PaginationControls from "./ui/PaginationControls";

export default function UserManagement() {
  const { user: authUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const { filters, updateFilters } = useUserFilters();
  const { data, isFetching } = useUsers(filters);

  const users = data?.users ?? [];
  const pagination = data?.pagination;

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [searchUser, setSearchUser] = useState("");
  const debouncedSearch = useDebounce(searchUser, 500);

  const [activeDialog, setActiveDialog] = useState<'view' | 'create' | 'edit' | 'delete' | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    updateFilters({
      search: debouncedSearch,
      limit: 10,
    })
  }, [debouncedSearch]);

  const openDialog = useCallback((type: 'view' | 'create' | 'edit' | 'delete', user: User | null = null) => {
    setSelectedUser(user);
    setActiveDialog(type);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt+1 to open create dialog
      if (event.altKey && event.key === '1') {
        event.preventDefault();
        openDialog('create');
      }

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
  }, [openDialog]);

  const closeDialog = () => {
    setActiveDialog(null);
    setTimeout(() => setSelectedUser(null), 150);
  };

  const handleCreate = async (data: CreateUserDTO) => {
    setIsSaving(true);
    try{
      await createUser.mutateAsync({
        user_id: data.user_id,
        first_name: data.first_name,
        last_name: data.last_name,
        user_type: data.user_type,
        middle_name: data.middle_name,
        prefix: data.prefix,
        suffix: data.suffix,
        email: data.email,
        phone: data.phone,
        member_id: data.member_id,
        password: data.password,
      },{
        onSuccess: () => {
          closeDialog();
        }
      });
    }finally{
      setIsSaving(false);
    }

  };

  const handleUpdate = async (data: Partial<CreateUserDTO>) => {
    if (!selectedUser) return;

    setIsSaving(true);
    try{
      const params: UpdateUserDTO = {
        id: Number(selectedUser.id),
        payload: data,
      }
      await updateUser.mutateAsync(params);

      closeDialog();
    }finally{
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try{
      await deleteUser.mutateAsync(Number(selectedUser.id));

      closeDialog();
    }finally{
      setIsSaving(false);
    }
  };
    
  // Pagination
  const paginationControls = usePagination(pagination, updateFilters, filters);

  return (
    <motion.div 
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1
      }}
      transition={{
        delay: 0.1,
        duration: 0.25,
        type: 'tween',
      }}
      className="space-y-4 p-0 sm:p-4">
      {/* Header */}
      <div className="relative flex sm:flex-row flex-col justify-between items-start sm:items-center gap-4">
        <div className="-top-8 right-0 absolute font-mono text-[11px]">
          <span>New: <strong className="font-extrabold">[Alt + 1]</strong></span>&nbsp; 
          <span>Search: <strong className="font-extrabold">[Ctrl + F]</strong></span>
        </div>
        <div>
          <h1 className="font-medium text-lg">User Management</h1>
          {/* <p className="text-muted-foreground text-sm sm:text-base">Manage Users</p> */}
        </div>
        {authUser && (authUser.user_type === 'Admin' || authUser.user_type === 'Staff') && (
          <Button onClick={() => openDialog('create')} className="bg-[#008ea2] hover:bg-[#007a8b] w-full sm:w-auto">
            <Plus className="mr-2 w-4 h-4" />
            Add User
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex lg:flex-row flex-col justify-between items-baseline gap-4">
        <div className="relative w-full">
          <Input
            ref={searchInputRef}
            placeholder="Search by name, email..."
            value={searchUser}
            onChange={(e) => {
              const target = e.target;
              const cursorPosition = target.selectionStart;
              setSearchUser(e.target.value);
              // Restore cursor position after state update
              requestAnimationFrame(() => {
                if (target) {
                  target.setSelectionRange(cursorPosition, cursorPosition);
                }
              });
            }}
            className="bg-white py-1 border border-gray-300 w-full"
            autoComplete="off"
          />
          {isFetching && (
            <div className="top-1/2 right-3 absolute -translate-y-1/2">
              <div className="inline-block border-[#008ea2] border-t-2 border-r-2 border-b-transparent border-l-transparent rounded-full w-4 h-4 animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* Users Table */}
      {users.length > 0 || isFetching ? (
        <Card className={`${isFetching ? "opacity-60 pointer-events-none" : ""} sm:gap-4 gap-2`}>
          <CardHeader className="relative">
            {pagination && (
              <div className="flex justify-end items-center">
                <PaginationControls
                  {...paginationControls}
                  onPageChange={paginationControls.handlePageChange}
                />
              </div>
            )}
          </CardHeader>

          <CardContent className="px-3 sm:px-6 sm:[&:last-child]:pb-6 [&:last-child]:pb-0 overflow-x-auto">
            <DataTable
              users={users}
              onEdit={(t) => openDialog("edit", t)}
              onDelete={(t) => openDialog("delete", t)}
              onView={(t) => openDialog("view", t)}
            />
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="No terms found"
          description="Try adjusting your search or create a new term to get started."
          action={
            authUser?.user_type === "Admin" || authUser?.user_type === "Staff" ? (
              <Button onClick={() => openDialog("create")}>
                <Plus className="mr-2 w-4 h-4" />
                Add User
              </Button>
            ) : null
          }
        />
      )}

      {/* Dialogs */}
      <FormDialog
        open={activeDialog === 'create' || activeDialog === 'edit' || activeDialog === 'view'}
        onClose={closeDialog}
        onSave={activeDialog === 'create' ? handleCreate : handleUpdate}
        user={selectedUser}
        mode={activeDialog}
        isSaving={isSaving}
      />

      {selectedUser && (
        <>

          <DeleteDialog
            open={activeDialog === 'delete'}
            onClose={closeDialog}
            user={selectedUser}
            onConfirm={handleDelete}
            isSaving={isSaving}
          />
        </>
      )}
    </motion.div>
  );
}