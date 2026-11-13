import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    stack: z.array(z.string()),
    status: z.string().optional(),
    description: z.string(),
    detailLabel: z.string(),
    detailLines: z.array(z.string()),
    github: z.string(),
    order: z.number(),
  }),
});

export const collections = {
  projects,
};
