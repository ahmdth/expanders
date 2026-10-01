import { ValueTransformer } from 'typeorm';
import { Transform } from 'class-transformer';

export const decimalTransformer: ValueTransformer = {
  to: (v?: number) => v,
  from: (v?: string | null) =>
    v === null || v === undefined ? v : parseFloat(v),
};

/** Trim + upper-case a string (used for country codes / names). */
export const NormalizeCountry = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  );

/** Trim + lower-case (or upper-case) + de-duplicate each string in an array. */
export const NormalizeList = (upper = false) =>
  Transform(({ value }) =>
    Array.isArray(value)
      ? [
          ...new Set(
            value.map((s) =>
              typeof s === 'string'
                ? upper
                  ? s.trim().toUpperCase()
                  : s.trim().toLowerCase()
                : s,
            ),
          ),
        ]
      : value,
  );
