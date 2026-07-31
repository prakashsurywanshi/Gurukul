import * as React from "react";
import { CalendarDays } from "lucide-react";

import { cn } from "./utils";

const formatDateForDisplay = (value?: string | readonly string[] | number | null) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return typeof value === "string" ? value : "";
  }

  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
};

const normalizeDateInput = (value: string) => value.replace(/[^\d]/g, "").slice(0, 8);

const maskDateForDisplay = (value: string) => {
  const normalized = normalizeDateInput(value);

  if (normalized.length <= 2) {
    return normalized;
  }

  if (normalized.length <= 4) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2)}`;
  }

  return `${normalized.slice(0, 2)}-${normalized.slice(2, 4)}-${normalized.slice(4)}`;
};

const parseDisplayDateToIso = (value: string) => {
  if (!/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    return null;
  }

  const [day, month, year] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
};

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  if (type === "date") {
    const { value, defaultValue, onChange, onBlur, placeholder, ...restProps } = props;
    const controlledValue = value ?? defaultValue ?? "";
    const [displayValue, setDisplayValue] = React.useState(() => formatDateForDisplay(controlledValue));
    const nativeDateInputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
      setDisplayValue(formatDateForDisplay(controlledValue));
    }, [controlledValue]);

    const emitIsoChange = React.useCallback(
      (nextIsoValue: string) => {
        if (!onChange) {
          return;
        }

        const syntheticEvent = {
          target: { value: nextIsoValue },
          currentTarget: { value: nextIsoValue },
        } as React.ChangeEvent<HTMLInputElement>;

        onChange(syntheticEvent);
      },
      [onChange]
    );

    const {
      disabled,
      required,
      id,
      "aria-invalid": ariaInvalid,
      ...textInputProps
    } = restProps;

    const openNativePicker = () => {
      if (!nativeDateInputRef.current || disabled) {
        return;
      }

      if (typeof nativeDateInputRef.current.showPicker === "function") {
        nativeDateInputRef.current.showPicker();
        return;
      }

      nativeDateInputRef.current.click();
    };

    return (
      <div className="relative w-full">
        <input
          {...textInputProps}
          id={id}
          type="text"
          inputMode="numeric"
          maxLength={10}
          disabled={disabled}
          required={required}
          aria-invalid={ariaInvalid}
          placeholder={placeholder || "DD-MM-YYYY"}
          value={displayValue}
          data-slot="input"
          className={cn(
            "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-border flex h-9 w-full min-w-0 rounded-md border bg-input-background px-3 py-1 pr-10 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
            className,
          )}
          onChange={(event) => {
            const maskedValue = maskDateForDisplay(event.target.value);
            setDisplayValue(maskedValue);

            if (maskedValue === "") {
              emitIsoChange("");
              return;
            }

            const isoValue = parseDisplayDateToIso(maskedValue);
            if (isoValue) {
              emitIsoChange(isoValue);
            }
          }}
          onBlur={(event) => {
            const isoValue = parseDisplayDateToIso(displayValue);

            if (!displayValue) {
              emitIsoChange("");
            } else if (isoValue) {
              const formattedValue = formatDateForDisplay(isoValue);
              setDisplayValue(formattedValue);
            } else {
              setDisplayValue(formatDateForDisplay(controlledValue));
            }

            onBlur?.(event);
          }}
        />
        <input
          ref={nativeDateInputRef}
          tabIndex={-1}
          aria-hidden="true"
          type="date"
          value={typeof controlledValue === "string" ? controlledValue : ""}
          onChange={(event) => {
            const isoValue = event.target.value;
            setDisplayValue(formatDateForDisplay(isoValue));
            emitIsoChange(isoValue);
          }}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Select date"
          disabled={disabled}
          onClick={openNativePicker}
          className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 transition disabled:pointer-events-none"
        >
          <CalendarDays className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-border flex h-9 w-full min-w-0 rounded-md border bg-input-background px-3 py-1 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
