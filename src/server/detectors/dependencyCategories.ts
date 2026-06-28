/**
 * Maps well-known package names to a human-meaningful category so the AI can
 * understand the *shape* of a project without reading the full manifest.
 *
 * Names are matched case-insensitively. Order of categories here defines the
 * priority used when a package could plausibly fit more than one bucket.
 */
export const dependencyCategories: Record<string, string[]> = {
  frontend: [
    "react",
    "react-dom",
    "vue",
    "svelte",
    "solid-js",
    "@angular/core",
    "preact",
    "lit",
    "alpinejs",
    "jquery",
  ],
  backend: [
    "express",
    "fastify",
    "koa",
    "hono",
    "@nestjs/core",
    "next",
    "nuxt",
    "@sveltejs/kit",
    "@hapi/hapi",
    "restify",
  ],
  testing: [
    "jest",
    "vitest",
    "mocha",
    "ava",
    "playwright",
    "@playwright/test",
    "cypress",
    "@testing-library/react",
    "@testing-library/vue",
    "@testing-library/dom",
    "supertest",
    "chai",
  ],
  database: [
    "prisma",
    "@prisma/client",
    "mongoose",
    "sequelize",
    "typeorm",
    "drizzle-orm",
    "knex",
    "pg",
    "mysql",
    "mysql2",
    "sqlite3",
    "better-sqlite3",
    "redis",
    "ioredis",
    "mongodb",
  ],
  auth: [
    "next-auth",
    "@auth/core",
    "passport",
    "jsonwebtoken",
    "bcrypt",
    "bcryptjs",
    "@clerk/nextjs",
    "@supabase/supabase-js",
    "firebase",
    "lucia",
  ],
  linting: [
    "eslint",
    "prettier",
    "@biomejs/biome",
    "biome",
    "oxlint",
    "stylelint",
    "standard",
  ],
  typescript: ["typescript", "ts-node", "tsx", "ts-node-dev"],
  build: [
    "vite",
    "webpack",
    "rollup",
    "esbuild",
    "turbo",
    "parcel",
    "tsup",
    "@swc/core",
    "gulp",
  ],
  state: [
    "redux",
    "@reduxjs/toolkit",
    "zustand",
    "jotai",
    "recoil",
    "mobx",
    "pinia",
    "@tanstack/react-query",
    "swr",
  ],
  styling: [
    "tailwindcss",
    "styled-components",
    "@emotion/react",
    "sass",
    "less",
    "postcss",
    "@mui/material",
    "@chakra-ui/react",
  ],
};

/** Returns the category for a dependency name, or undefined when unknown. */
export function categorizeDependency(name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [category, packages] of Object.entries(dependencyCategories)) {
    if (packages.includes(lower)) {
      return category;
    }
  }
  return undefined;
}
