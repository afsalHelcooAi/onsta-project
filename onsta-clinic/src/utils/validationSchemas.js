import { z } from 'zod';

// UAE Phone Number Regex:
// Supports:
// +971 50 123 4567, 00971501234567, 0501234567, 501234567 (Mobile)
// +971 4 123 4567, 041234567 (Landline)
// Cleaned digits: between 7 and 12 digits (with country code max 14-15 chars)
const UAE_PHONE_REGEX = /^(?:(?:\+971|00971|0)?(?:5[0124568]\d{7}|[234679]\d{7}))$/;

export const uaePhoneValidator = z
  .string()
  .optional()
  .nullable()
  .refine(
    (val) => {
      if (!val || val.trim() === '' || val.trim() === '+971') return true; // Optional if empty
      const cleaned = val.replace(/[\s\-\(\)]/g, '');
      // Max digit check: cannot exceed 14 characters including country code
      if (cleaned.length > 15) return false;
      return UAE_PHONE_REGEX.test(cleaned);
    },
    {
      message: 'Please enter a valid UAE phone number (e.g. +971 50 123 4567 or 04 123 4567, max 14 digits).',
    }
  );

export const clinicRegistrationSchema = z.object({
  full_name: z.string().min(2, 'Account holder name is required (min 2 characters).'),
  email: z.string().email('Please enter a valid account email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  legal_entity_name: z.string().min(2, 'Legal entity name is required.'),
  trading_name: z.string().min(2, 'Clinic or trading name is required.'),
  facility_type: z.string().min(2, 'Facility type is required.'),
  official_email: z.string().email('Please enter a valid official clinic email address.'),
  main_phone: uaePhoneValidator,
  emirate: z.string().min(2, 'Emirate is required.'),
  city_area: z.string().optional().nullable(), // Optional per user request
  street_building: z.string().min(2, 'Street and building address is required.'),
  trade_license_number: z.string().optional().nullable(),
  facility_license_number: z.string().optional().nullable(),
  number_of_branches: z.coerce.number().min(1, 'Number of branches must be at least 1.'),
});

export const clinicEditSchema = z.object({
  legal_entity_name: z.string().min(2, 'Legal entity name is required.'),
  trading_name: z.string().min(2, 'Clinic or trading name is required.'),
  facility_type: z.string().min(2, 'Facility type is required.'),
  official_email: z.string().email('Please enter a valid official clinic email address.'),
  main_phone: uaePhoneValidator,
  emirate: z.string().min(2, 'Emirate is required.'),
  city_area: z.string().optional().nullable(),
  street_building: z.string().min(2, 'Street and building address is required.'),
  trade_license_number: z.string().optional().nullable(),
  facility_license_number: z.string().optional().nullable(),
  number_of_branches: z.coerce.number().min(1, 'Number of branches must be at least 1.'),
  full_name: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
});
