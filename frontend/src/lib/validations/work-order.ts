import { z } from 'zod';

/**
 * Work Order Validation Schemas
 * Used for creating and updating work orders
 */

export const workOrderSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must not exceed 200 characters'),

  description: z
    .string()
    .max(2000, 'Description must not exceed 2000 characters')
    .optional(),

  type: z.enum(['corrective', 'preventive', 'predictive', 'inspection', 'emergency'], {
    message: 'Work order type is required',
  }),

  priority: z.enum(['critical', 'high', 'medium', 'low'], {
    message: 'Priority is required',
  }),

  assetId: z
    .string()
    .min(1, 'Asset is required')
    .uuid('Asset ID must be a valid UUID'),

  siteId: z
    .string()
    .uuid('Site ID must be a valid UUID')
    .optional(),

  assignedTo: z
    .string()
    .uuid('Assigned user ID must be a valid UUID')
    .optional(),

  scheduledStartDate: z
    .string()
    .datetime({ message: 'Invalid start date format' })
    .optional()
    .or(z.literal('')),

  scheduledEndDate: z
    .string()
    .datetime({ message: 'Invalid end date format' })
    .optional()
    .or(z.literal('')),

  estimatedHours: z
    .number()
    .positive('Estimated hours must be positive')
    .max(1000, 'Estimated hours cannot exceed 1000')
    .optional()
    .or(z.nan()),

  status: z
    .enum(['draft', 'open', 'scheduled', 'in_progress', 'on_hold', 'completed', 'closed', 'cancelled'])
    .optional(),
}).refine(
  (data) => {
    // If both dates are provided, end date must be after start date
    if (data.scheduledStartDate && data.scheduledEndDate &&
        data.scheduledStartDate !== '' && data.scheduledEndDate !== '') {
      return new Date(data.scheduledEndDate) >= new Date(data.scheduledStartDate);
    }
    return true;
  },
  {
    message: 'End date must be after start date',
    path: ['scheduledEndDate'],
  }
);

export const workOrderTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Task title is required')
    .max(200, 'Task title must not exceed 200 characters'),

  description: z
    .string()
    .max(500, 'Task description must not exceed 500 characters')
    .optional(),

  sequence: z
    .number()
    .int('Sequence must be a whole number')
    .positive('Sequence must be positive'),
});

export const workOrderPartSchema = z.object({
  partId: z
    .string()
    .min(1, 'Part is required'),

  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .positive('Quantity must be at least 1')
    .max(10000, 'Quantity cannot exceed 10,000'),
});

export type WorkOrderFormData = z.infer<typeof workOrderSchema>;
export type WorkOrderTaskFormData = z.infer<typeof workOrderTaskSchema>;
export type WorkOrderPartFormData = z.infer<typeof workOrderPartSchema>;
