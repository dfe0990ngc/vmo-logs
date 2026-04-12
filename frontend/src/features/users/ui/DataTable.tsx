import { memo } from "react";
import { Edit, Eye, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { User } from "../users.types";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

interface DataTableRowProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onView: (user: User) => void;
}

const DataTableRow = memo(({ user, onEdit, onDelete, onView }: DataTableRowProps) => {
  const { user: authUser } = useAuth();

  const fullName = `${user.prefix ? user.prefix + ". " : ""}${
      user.first_name
    }${user.middle_name ? " " + user.middle_name[0] + "." : ""} ${
      user.last_name
    }${user.suffix ? ", " + user.suffix : ""}`;

  const getUserTypeColor = (user_type: string) => {
    switch (user_type) {
      case "Admin": return "bg-green-100 text-green-900";
      case "Staff": return "bg-amber-100 text-amber-900";
      case "Member": return "bg-blue-100 text-blue-900";
      case "Uploader": return "bg-orange-100 text-orange-900";
      case "Tracker": return "bg-indigo-100 text-indigo-900";
      default: return "";
    }
  };

  return (
    <TableRow key={user.id} className="sm:table-row flex-1 grid shadow-sm mb-3 sm:mb-0 py-3 sm:py-0 border border-gray-200 sm:border-gray-100 sm:border-b rounded-lg sm:rounded-none">
      <TableCell className="font-semibold">{fullName}</TableCell>
      <TableCell><Badge className="bg-gray-100 font-bold text-gray-900">{user.user_id}</Badge></TableCell>
      <TableCell className={`sm:table-cell ${!user.email && 'hidden'} italic`}>{user.email || <span className="text-gray-400">—</span>}</TableCell>
      <TableCell><span className="sm:hidden inline-block">User Type:&nbsp;</span><Badge className={`${getUserTypeColor(user.user_type)} font-bold`}>{user.user_type || <span className="text-gray-400">—</span>}</Badge></TableCell>
      <TableCell><span className="sm:hidden inline-block">Last Login:&nbsp;</span><em>{formatDateTime(user.last_login) || <span className="text-gray-400">—</span>}</em></TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button variant="outline" title="View Details" size="sm" className="p-0 w-8 h-8" onClick={() => onView(user)}>
            <Eye className="w-4 h-4" />
          </Button>
          {authUser && (authUser.user_type === 'Admin' || authUser.user_type === 'Staff') && (
            <Button variant="outline" size="sm" className="p-0 w-8 h-8" onClick={() => onEdit(user)}>
              <Edit className="w-4 h-4" />
            </Button>
          )}
          {authUser && authUser.user_type === 'Admin' && (
            <Button
              variant="outline"
              size="sm"
              className="hover:bg-red-50 p-0 w-8 h-8 text-red-600 hover:text-red-700"
              onClick={() => onDelete(user)}
            ><Trash2 className="w-4 h-4" /></Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});

interface TableProps {
  users: User[];
  onEdit: (m: User) => void;
  onDelete: (m: User) => void;
  onView: (m: User) => void;
}

const DataTable = memo(({ users, onEdit, onDelete, onView }: TableProps) => {
  return (
    <div className="sm:border border-0 sm:rounded-md overflow-hidden">
      <Table>
        <TableHeader className="hidden sm:table-header-group">
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>User ID</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>User Type</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr:last-child]:border">
          {users.map((user) => (
            <DataTableRow
              key={user.id}
              user={user}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

export default DataTable;