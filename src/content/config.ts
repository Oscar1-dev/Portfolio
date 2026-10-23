import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    projectType: z.string(),
    status: z.enum(['Production', 'Active', 'Learning', 'Archived']),
    /** Plain-language status where the enum isn't enough (e.g. "In development, not launched"). */
    statusNote: z.string().optional(),
    year: z.number(),
    featured: z.boolean(),
    order: z.number(),
    logo: z.string().optional(),
    /** Wide product screenshot — used on the project card and as the detail-page banner. */
    cover: z.string().optional(),
    /** Short "why it exists" line shown above the fold on the card for case-study projects. */
    tagline: z.string().optional(),
    /** Ordered process steps rendered as a connected step diagram (e.g. a request/data flow). */
    flow: z.array(z.string()).optional(),
    technologies: z.record(z.string(), z.array(z.string())),
    competencies: z.array(z.string()),
    links: z
      .object({
        live: z.string().url().optional(),
        github: z.string().url().optional(),
        documentation: z.string().url().optional(),
      })
      .optional(),
    timeline: z
      .array(
        z.object({
          date: z.string(),
          event: z.string(),
        })
      )
      .optional(),
    metrics: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    recognition: z.array(z.string()).optional(),
  }),
});

export const collections = { projects };
