import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show?: boolean; // If provided, the parent controls the show/hide status
  onToggle?: () => void; // If provided, the parent handles toggling
  error?: string;
  id?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

const PasswordField = ({
  label,
  value,
  onChange,
  show: controlledShow,
  onToggle: controlledToggle,
  error,
  id,
  autoComplete,
  placeholder,
  required = true,
  className
}: PasswordFieldProps) => {
  const [internalShow, setInternalShow] = useState(false);
  
  const show = controlledShow !== undefined ? controlledShow : internalShow;
  const onToggle = controlledToggle !== undefined ? controlledToggle : () => setInternalShow(!internalShow);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`pr-10 ${className || ""}`}
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={onToggle}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
};

export default PasswordField;
