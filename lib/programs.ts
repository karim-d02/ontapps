/**
 * STUBBED DURING THE SCHEMA MIGRATION — see MIGRATION-REPORT.md.
 *
 * This module was the old data loader. It read data/programs.json through the
 * pre-migration types and exported helpers keyed on fields that no longer
 * exist (`program.school`, `gatekeepingModels`, `staleOfficialPages`).
 *
 * Its replacement is lib/data.ts, which is the single typed data-access module
 * every page, component and route now imports from. Nothing imports this file
 * any more.
 *
 * It is kept as an empty module rather than deleted so that anything still
 * pointing here fails loudly at the import site instead of silently resolving
 * to a stale implementation.
 */

export {};
