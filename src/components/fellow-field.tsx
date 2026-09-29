"use client";

import { Editable } from "@/components/editable";
import { FIELD_DEFS as FIELDS, type FieldKey } from "@/lib/fellow-fields";
import { updateFellowFieldAction } from "@/app/(app)/program-actions";

// Editable binding for one Fellow column.
export function FellowField({ fellowId, field, value, display, disabled, className }: { fellowId: string; field: FieldKey; value: string | number | string[] | null; display?: React.ReactNode; disabled?: boolean; className?: string }) {
  const def = FIELDS[field];
  return (
    <Editable
      value={value}
      type={def.type}
      options={def.options}
      placeholder={def.placeholder}
      display={display}
      disabled={disabled}
      className={className}
      save={(v) => updateFellowFieldAction(fellowId, field, v)}
    />
  );
}
