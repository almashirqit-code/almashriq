"use client";

/**
 * A GET search/filter form that leaves untouched fields out of the URL, so "Show results" with only a
 * make picked goes to /cars?make=Toyota instead of /cars?q=&branch=&make=Toyota&body=&fuel=…
 * Empty fields are disabled just long enough for the browser to build the URL, then re-enabled so the
 * form still works after Back. Without JavaScript it submits normally (empty values are ignored anyway).
 */
export function SearchForm(props: Omit<React.ComponentProps<"form">, "onSubmit" | "method">) {
  return (
    <form
      {...props}
      onSubmit={(e) => {
        const empty = [...e.currentTarget.elements].filter(
          (el): el is HTMLInputElement | HTMLSelectElement =>
            (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) && !!el.name && !el.disabled && el.value.trim() === ""
        );
        for (const el of empty) el.disabled = true;
        setTimeout(() => empty.forEach((el) => (el.disabled = false)));
      }}
    />
  );
}
