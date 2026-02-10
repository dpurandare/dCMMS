import { z } from 'zod';

/**
 * Asset Validation Schemas
 * Used for creating and updating assets
 */

export const assetSchema = z.object({
  name: z
    .string()
    .min(1, 'Asset name is required')
    .min(2, 'Asset name must be at least 2 characters')
    .max(200, 'Asset name must not exceed 200 characters'),

  assetTag: z
    .string()
    .min(1, 'Asset tag is required')
    .max(100, 'Asset tag must not exceed 100 characters')
    .regex(/^[A-Z0-9-]+$/, 'Asset tag must contain only uppercase letters, numbers, and hyphens'),

  description: z
    .string()
    .max(2000, 'Description must not exceed 2000 characters')
    .optional(),

  type: z
    .string()
    .min(1, 'Asset type is required')
    .max(100, 'Asset type must not exceed 100 characters'),

  status: z.enum(['operational', 'maintenance', 'failed', 'offline', 'decommissioned'], {
    message: 'Status is required',
  }),

  criticality: z.enum(['critical', 'high', 'medium', 'low'], {
    message: 'Criticality is required',
  }),

  siteId: z
    .string()
    .min(1, 'Site is required')
    .uuid('Site ID must be a valid UUID'),

  location: z
    .string()
    .max(200, 'Location must not exceed 200 characters')
    .optional(),

  manufacturer: z
    .string()
    .max(200, 'Manufacturer must not exceed 200 characters')
    .optional(),

  model: z
    .string()
    .max(200, 'Model must not exceed 200 characters')
    .optional(),

  serialNumber: z
    .string()
    .max(200, 'Serial number must not exceed 200 characters')
    .optional(),

  installationDate: z
    .string()
    .datetime({ message: 'Invalid installation date format' })
    .optional()
    .or(z.literal('')),

  warrantyExpiryDate: z
    .string()
    .datetime({ message: 'Invalid warranty expiry date format' })
    .optional()
    .or(z.literal('')),

  parentAssetId: z
    .string()
    .uuid('Parent asset ID must be a valid UUID')
    .optional(),

  specifications: z
    .record(z.string(), z.any())
    .optional(),
}).refine(
  (data) => {
    // If both dates are provided, warranty expiry must be after installation
    if (data.installationDate && data.warrantyExpiryDate &&
        data.installationDate !== '' && data.warrantyExpiryDate !== '') {
      return new Date(data.warrantyExpiryDate) >= new Date(data.installationDate);
    }
    return true;
  },
  {
    message: 'Warranty expiry date must be after installation date',
    path: ['warrantyExpiryDate'],
  }
);

export type AssetFormData = z.infer<typeof assetSchema>;
