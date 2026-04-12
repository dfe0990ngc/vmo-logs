import { useEffect, useState, memo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateUserDTO, User } from "../users.types";
import { useAjaxMembers } from "@/features/members/members.hooks";
import { Loader2 } from "lucide-react";
import { Member } from "@/features/members/members.types";
import MemberCombobox from "@/components/ui/member-combobox";
import { useDebounce } from "@/hooks/useDebounce";
import { useMemberList } from "@/hooks/useMemberList";

const DEFAULT_FORM_DATA: Partial<CreateUserDTO> = {
  user_id: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  prefix: "",
  suffix: "",
  email: "",
  phone: "",
  user_type: "Staff",
  member_id: 0,
};

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<CreateUserDTO>) => void;
  user: User | null;
  mode: "create" | "edit" | "view";
  isSaving?: boolean;
}

const useForm = (user: User | null, mode: "create" | "edit" | "view") => {
  const [formData, setFormData] =
    useState<Partial<CreateUserDTO>>(DEFAULT_FORM_DATA);

  useEffect(() => {
    if (user && (mode === "edit" || mode === "view")) {
      setFormData({
        user_id: user.user_id,
        first_name: user.first_name,
        middle_name: user.middle_name || "",
        last_name: user.last_name,
        prefix: user.prefix || "",
        suffix: user.suffix || "",
        email: user.email || "",
        phone: user.phone || "",
        user_type: user.user_type,
        member_id: user.member_id || 0,
      });
    } else if (mode === "create") {
      setFormData(DEFAULT_FORM_DATA);
    }
  }, [user, mode]);

  const handleChange = (
    field: keyof CreateUserDTO,
    value: string | number,
    setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: typeof value === "string" ? value.trimStart() : value,
    }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return { formData, setFormData, handleChange };
};

const FormDialog = memo(
  ({ open, onClose, onSave, user, mode, isSaving }: FormDialogProps) => {
    const { formData, setFormData, handleChange: handleFormChange } =
      useForm(user, mode);

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showPassword, setShowPassword] = useState(false);
    
    // Start: Members Combobox
    const [memberSearch, setMemberSearch] = useState("");
    const [memberOpen, setMemberOpen] = useState(false);
    const pinnedMemberRef = useRef<Member | undefined>(undefined);
    const debouncedMemberSearch = useDebounce(memberSearch,750);
    const { members: membersData, isFetching: membersFetching } = useMemberList(
      debouncedMemberSearch,
      (mode !== "create" ? user?.member_id ?? null : null),
      pinnedMemberRef
    );
    // END: Members Combobox

    const handleChange = (
      field: keyof CreateUserDTO,
      value: string | number
    ) => {
      handleFormChange(field, value, setErrors);
    };

    useEffect(() => {
      if (open) {
        setErrors({});
      }
    }, [open, mode]);

    /* ===============================
       MEMBER → USER AUTO SYNC
    ================================ */
    const handleMemberChange = (memberId: number, member: Member | null) => {
      
      if (!memberId || !member) {
        setFormData((prev) => ({
          ...prev,
          member_id: 0,
        }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        member_id: member.id,
        prefix: member.prefix || "",
        first_name: member.first_name || "",
        middle_name: member.middle_name || "",
        last_name: member.last_name || "",
        suffix: member.suffix || "",
        email: member.email || "",
        phone: member.phone || "",
      }));

      setErrors((prev) => ({
        ...prev,
        user_id: "",
        first_name: "",
        last_name: "",
        password: "",
      }));
    };

    const validate = (): boolean => {
      const newErrors: Record<string, string> = {};

      if (!formData.user_id?.trim()) newErrors.user_id = "Username is required";
      if (!formData.first_name?.trim())
        newErrors.first_name = "First name is required";
      if (!formData.last_name?.trim())
        newErrors.last_name = "Last name is required";

      if (mode === "create" && !formData.password?.trim())
        newErrors.password = "Password is required";

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
      e.preventDefault();

      if (!validate()) return;

      const payload = { ...formData };
      if (mode === "edit" && !payload.password) delete payload.password;

      onSave(payload);
    };

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="flex flex-col p-3 sm:p-6 sm:max-w-2xl"
          onPointerDownOutside={(e) => {
            e.preventDefault();
          }}>

          <DialogHeader className="pb-2 border-0 border-b">
            <DialogTitle>
              {mode === "create" ? "Create User" : (mode === 'edit' ? "Edit User" : "View User")}
            </DialogTitle>
            <DialogDescription>{mode !== 'view' ? 'When user is a member, select to auto-fill details.' : ''}</DialogDescription>
          </DialogHeader>

          <form className="space-y-4 pt-4 pb-3 overflow-y-auto scroll-smooth" style={{scrollbarWidth: 'none'}}>
            <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
              {/* MEMBER FIRST */}
              <div className="space-y-2 sm:col-span-2">
                <MemberCombobox
                    label="Linked Member"
                    value={formData.member_id ?? 0}
                    members={membersData}
                    isFetching={membersFetching}
                    search={memberSearch}
                    open={memberOpen}
                    disabled={mode === "view" || mode === "edit"}
                    error={errors.member_id}
                    onSearchChange={setMemberSearch}
                    onOpenChange={setMemberOpen}
                    onSelect={(id, member) => {
                      // Pin the doc synchronously before any state update settles
                      pinnedMemberRef.current = member ?? undefined;
                      handleMemberChange(id, member);
                    }}
                  />
              </div>

              {/* USERNAME */}
              <div className="space-y-2">
                <Label>Username <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.user_id}
                  disabled={mode === "edit" || mode === 'view'}
                  className={errors.user_id ? 'border-red-500' : ''}
                  onChange={(e) =>
                    handleChange("user_id", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>User Type <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.user_type}
                  disabled={mode === 'view'}
                  onValueChange={(v) => handleChange('user_type',v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Administrator</SelectItem>
                    <SelectItem value="Member">Member</SelectItem>
                    {/* <SelectItem value="Staff">Staff</SelectItem> */}
                    <SelectItem value="Uploader">Uploader</SelectItem>
                    <SelectItem value="Tracker">Tracker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Input
                placeholder="Prefix"
                readOnly={mode === 'view'}
                value={formData.prefix}
                onChange={(e) => handleChange("prefix", e.target.value)}
              />
              <Input
                placeholder="First Name *"
                readOnly={mode === 'view'}
                value={formData.first_name}
                className={errors.first_name ? 'border-red-500' :''}
                onChange={(e) => handleChange("first_name", e.target.value)}
              />
              <Input
                placeholder="Middle Name"
                readOnly={mode === 'view'}
                value={formData.middle_name}
                onChange={(e) => handleChange("middle_name", e.target.value)}
              />
              <Input
                placeholder="Last Name *"
                readOnly={mode === 'view'}
                value={formData.last_name}
                className={errors.last_name ? 'border-red-500' : ''}
                onChange={(e) => handleChange("last_name", e.target.value)}
              />
              <Input
                placeholder="Suffix"
                readOnly={mode === 'view'}
                value={formData.suffix}
                onChange={(e) => handleChange("suffix", e.target.value)}
              />
              <Input
                placeholder="Email"
                readOnly={mode === 'view'}
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
              <Input
                placeholder="Phone"
                readOnly={mode === 'view'}
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />

              {/* PASSWORD */}
              <div className="space-y-2 sm:col-span-2">
                <Label>Password {mode === "create" && "*"}</Label>
                <Input
                  readOnly={mode === 'view'}
                  type={showPassword ? "text" : "password"}
                  value={formData.password || ""}
                  className={mode === 'create' && errors.password ? 'border-red-500' : ''}
                  placeholder={mode === 'edit' ? "Leave blank to remain unchanged" : ""}
                  onChange={(e) =>
                    handleChange("password", e.target.value)
                  }
                />
                <label className="flex items-center gap-2 mt-1 text-sm">
                  <input
                    type="checkbox"
                    readOnly={mode === 'view'}
                    disabled={mode === 'view'}
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  Show password
                </label>
              </div>
            </div>
          </form>

          <DialogFooter className="mt-3 pt-3 border-0 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              {mode === 'view' ? "Close" : "Cancel"}
            </Button>
            {mode !== 'view' &&
            <Button onClick={handleSubmit} type="button" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              {mode === "create" ? "Create" : "Save"}
            </Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export default FormDialog;
