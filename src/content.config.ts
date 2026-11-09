// Content models. Everything staff edit lives in src/content/ and
// src/data/site.json; the CMS at /admin edits these same files.
import { defineCollection, reference, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const startingPath = z.enum(['new-fireplace', 'existing-fireplace', 'outdoor-kitchen', 'outdoor-living']);

const projects = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      legacyId: z.number().optional(), // old /projects/detail/?unit_id= for redirects
      year: z.number().optional(),
      category: z.enum(['fireplace-new', 'fireplace-upgrade', 'outdoor-kitchen', 'outdoor-living']),
      location: z.string().optional(),
      designer: z.string().optional(),
      beforeAfter: z.boolean().optional(),
      description: z.string().optional(),
      features: z.array(z.string()).optional(),
      images: z.array(image()).min(1),
      featured: z.boolean().default(false),
      order: z.number().default(50),
      // Case-study fields. Fill these in only with details the team has confirmed.
      summary: z.string().optional(),
      goal: z.string().optional(),
      solution: z.string().optional(),
      ourRole: z.string().optional(),
      takeaway: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

// The curated shortlist ("Start with these options"). Order and homepage
// placement are editable; nothing here is a sales ranking.
const options = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/options' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      path: startingPath,
      order: z.number().default(10),
      homepage: z.boolean().default(false),
      whatItIs: z.string(),
      goodFor: z.string(),
      benefit: z.string(),
      facts: z.array(z.string()).max(3),
      considerations: z.array(z.string()),
      included: z.array(z.string()).default([]),
      separate: z.array(z.string()).default([]),
      exampleBrands: z.array(z.string()).default([]),
      showroomDisplay: z.enum(['confirmed', 'call-to-confirm']).default('call-to-confirm'),
      image: image(),
      imageAlt: z.string(),
      imagePosition: z.enum(['center', 'top', 'bottom']).default('center'),
      relatedProjects: z.array(reference('projects')).default([]),
      documents: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
      // Pricing is only shown when the owner approves a figure for it.
      priceNote: z.string().optional(),
    }),
});

// Real, attributable reviews only. An entry renders only when approved: true.
const reviews = defineCollection({
  loader: file('./src/content/reviews.yaml'),
  schema: z.object({
    author: z.string(),
    source: z.enum(['Google', 'Houzz', 'Facebook', 'Direct']),
    sourceUrl: z.string().url().optional(),
    date: z.string().optional(),
    about: z.enum(['company-service', 'product']).default('company-service'),
    topic: z.enum(['choosing', 'explanations', 'working-with-trades', 'installation', 'communication']).optional(),
    quote: z.string(),
    approved: z.boolean().default(false),
    order: z.number().default(10),
  }),
});

const faqs = defineCollection({
  loader: file('./src/content/faqs.yaml'),
  schema: z.object({
    question: z.string(),
    answer: z.string(),
    groups: z.array(z.enum(['home', 'fireplaces', 'existing', 'outdoor-kitchens', 'trade', 'showroom', 'service'])),
    order: z.number().default(10),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().default(10),
    path: startingPath.optional(),
  }),
});

// Plain-English explainers for product types. They keep the old category URLs
// alive (e.g. /gas-inserts/) as a secondary, crawlable layer.
const types = defineCollection({
  loader: file('./src/content/types.yaml'),
  schema: z.object({
    title: z.string(),
    navLabel: z.string(),
    description: z.string(),
    path: startingPath,
    intro: z.string(),
    goodFor: z.array(z.string()),
    thinkAbout: z.array(z.string()),
    brands: z.array(z.string()).default([]),
    order: z.number().default(10),
  }),
});

const brands = defineCollection({
  loader: file('./src/content/brands.json'),
  schema: z.object({
    name: z.string(),
    group: z.enum(['Fireplaces & hearth', 'Grills & outdoor kitchens', 'Pizza ovens', 'Outdoor fire & heating', 'Mantels, doors & accessories']),
    summary: z.string(),
    path: startingPath,
  }),
});

const promotions = defineCollection({
  loader: file('./src/content/promotions.yaml'),
  schema: z.object({
    title: z.string(),
    body: z.string(),
    terms: z.string().optional(),
    starts: z.string(),
    expires: z.string(), // required: a promotion without an end date cannot be published
    link: z.string().optional(),
  }),
});

const legal = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/legal' }),
  schema: z.object({ title: z.string(), description: z.string(), updated: z.string().optional() }),
});

export const collections = { projects, options, reviews, faqs, guides, types, brands, promotions, legal };
