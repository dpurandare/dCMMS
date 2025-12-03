import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  validatorCompiler,
  serializerCompiler,
} from "fastify-type-provider-zod";
import { createComplianceTemplateService } from "../services/compliance-template.service";

// Validation schemas
const autoPopulateSchema = z.object({
  siteId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const validateReportSchema = z.object({
  reportData: z.record(z.any()),
});

/**
 * Compliance Template Routes
 * Manage compliance report templates and auto-population
 */
export default async function complianceTemplateRoutes(
  fastify: FastifyInstance,
) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  const complianceService = createComplianceTemplateService(fastify);

  // ==========================================
  // Template Management
  // ==========================================

  // List all templates (optionally filtered by type)
  fastify.get<{
    Querystring: {
      reportType?: string;
    };
  }>(
    "/compliance/templates",
    {
      schema: {
        querystring: z.object({
          reportType: z.string().optional(),
        }),
        tags: ["Compliance"],
        description: "List all compliance report templates",
      },
    },
    async (request, reply) => {
      try {
        const { reportType } = request.query;

        const templates = await complianceService.getTemplates(reportType);

        return reply.send({
          count: templates.length,
          templates,
        });
      } catch (error) {
        fastify.log.error({ error }, "Failed to list compliance templates");
        return reply.status(500).send({
          error: "Failed to list compliance templates",
        });
      }
    },
  );

  // Get single template by ID
  fastify.get<{
    Params: {
      templateId: string;
    };
  }>(
    "/compliance/templates/:templateId",
    {
      schema: {
        params: z.object({
          templateId: z.string(),
        }),
        tags: ["Compliance"],
        description: "Get compliance template by ID",
      },
    },
    async (request, reply) => {
      try {
        const { templateId } = request.params;

        const template = await complianceService.getTemplate(templateId);

        if (!template) {
          return reply.status(404).send({
            error: "Template not found",
          });
        }

        return reply.send(template);
      } catch (error) {
        fastify.log.error({ error }, "Failed to get compliance template");
        return reply.status(500).send({
          error: "Failed to get compliance template",
        });
      }
    },
  );

  // ==========================================
  // Auto-population
  // ==========================================

  // Auto-populate template data
  fastify.post<{
    Params: {
      templateId: string;
    };
    Body: z.infer<typeof autoPopulateSchema>;
  }>(
    "/compliance/templates/:templateId/auto-populate",
    {
      schema: {
        params: z.object({
          templateId: z.string(),
        }),
        body: autoPopulateSchema,
        tags: ["Compliance"],
        description: "Auto-populate template data from dCMMS sources",
      },
    },
    async (request, reply) => {
      try {
        const tenantId = (request.user as any)?.tenantId;

        if (!tenantId) {
          return reply.status(401).send({
            error: "Unauthorized",
          });
        }

        const { templateId } = request.params;
        const { siteId, startDate, endDate } = request.body;

        // Verify template exists
        const template = await complianceService.getTemplate(templateId);

        if (!template) {
          return reply.status(404).send({
            error: "Template not found",
          });
        }

        // Auto-populate data
        const populatedData = await complianceService.autoPopulateData(
          templateId,
          tenantId,
          siteId,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined,
        );

        fastify.log.info(
          { templateId, fieldsPopulated: Object.keys(populatedData).length },
          "Template auto-populated",
        );

        return reply.send({
          templateId,
          templateName: template.name,
          reportType: template.reportType,
          populatedData,
          populatedAt: new Date().toISOString(),
        });
      } catch (error: any) {
        fastify.log.error({ error }, "Failed to auto-populate template");
        return reply.status(500).send({
          error: "Failed to auto-populate template",
          message: error.message,
        });
      }
    },
  );

  // ==========================================
  // Validation
  // ==========================================

  // Validate report data
  fastify.post<{
    Params: {
      templateId: string;
    };
    Body: z.infer<typeof validateReportSchema>;
  }>(
    "/compliance/templates/:templateId/validate",
    {
      schema: {
        params: z.object({
          templateId: z.string(),
        }),
        body: validateReportSchema,
        tags: ["Compliance"],
        description: "Validate report data against template rules",
      },
    },
    async (request, reply) => {
      try {
        const { templateId } = request.params;
        const { reportData } = request.body;

        // Get template
        const template = await complianceService.getTemplate(templateId);

        if (!template) {
          return reply.status(404).send({
            error: "Template not found",
          });
        }

        // Validate data
        const validation = complianceService.validateReportData(
          template,
          reportData,
        );

        if (validation.valid) {
          return reply.send({
            valid: true,
            message: "Report data is valid",
          });
        } else {
          return reply.status(400).send({
            valid: false,
            errors: validation.errors,
          });
        }
      } catch (error) {
        fastify.log.error({ error }, "Failed to validate report data");
        return reply.status(500).send({
          error: "Failed to validate report data",
        });
      }
    },
  );

  // ==========================================
  // Preview
  // ==========================================

  // Generate preview of populated report
  fastify.post<{
    Params: {
      templateId: string;
    };
    Body: z.infer<typeof autoPopulateSchema> & {
      manualData?: Record<string, any>;
    };
  }>(
    "/compliance/templates/:templateId/preview",
    {
      schema: {
        params: z.object({
          templateId: z.string(),
        }),
        body: autoPopulateSchema.extend({
          manualData: z.record(z.any()).optional(),
        }),
        tags: ["Compliance"],
        description:
          "Generate preview of compliance report with auto-populated and manual data",
      },
    },
    async (request, reply) => {
      try {
        const tenantId = (request.user as any)?.tenantId;

        if (!tenantId) {
          return reply.status(401).send({
            error: "Unauthorized",
          });
        }

        const { templateId } = request.params;
        const { siteId, startDate, endDate, manualData } = request.body;

        // Get template
        const template = await complianceService.getTemplate(templateId);

        if (!template) {
          return reply.status(404).send({
            error: "Template not found",
          });
        }

        // Auto-populate data
        const autoPopulatedData = await complianceService.autoPopulateData(
          templateId,
          tenantId,
          siteId,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined,
        );

        // Merge with manual data
        const mergedData = {
          ...autoPopulatedData,
          ...manualData,
        };

        // Validate merged data
        const validation = complianceService.validateReportData(
          template,
          mergedData,
        );

        // Build preview response
        const preview = {
          template: {
            id: template.templateId,
            name: template.name,
            reportType: template.reportType,
            complianceStandard: template.complianceStandard,
            version: template.version,
            format: template.format,
          },
          data: mergedData,
          validation: {
            valid: validation.valid,
            errors: validation.errors,
          },
          metadata: {
            autoPopulatedFields: Object.keys(autoPopulatedData),
            manualFields: Object.keys(manualData || {}),
            generatedAt: new Date().toISOString(),
          },
        };

        return reply.send(preview);
      } catch (error: any) {
        fastify.log.error({ error }, "Failed to generate preview");
        return reply.status(500).send({
          error: "Failed to generate preview",
          message: error.message,
        });
      }
    },
  );
}
