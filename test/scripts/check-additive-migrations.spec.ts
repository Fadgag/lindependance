import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const validatorPath = resolve(process.cwd(), 'scripts/check-additive-migrations.mjs')

function validate(sql: string) {
  const directory = mkdtempSync(join(tmpdir(), 'additive-migration-'))
  try {
    const migrationDirectory = join(directory, '20260930230000_test')
    mkdirSync(migrationDirectory)
    writeFileSync(join(migrationDirectory, 'migration.sql'), sql)
    return spawnSync(process.execPath, [validatorPath, directory], { encoding: 'utf8' })
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

describe('additive migration guard', () => {
  it('accepts the repository migrations as schema-only', () => {
    const result = spawnSync(process.execPath, [validatorPath], { encoding: 'utf8' })

    expect(result.status).toBe(0)
  })

  it('allows additive DDL and ignores commented-out backfills', () => {
    const result = validate(`
      -- UPDATE "Appointment" SET "productsTotal" = 0;
      CREATE TYPE "ExampleType" AS ENUM ('FIRST', 'SECOND');
      ALTER TABLE "Staff" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
      CREATE TABLE "Example" ("id" TEXT NOT NULL);
      ALTER TABLE "Example" ADD CONSTRAINT "Example_pkey" PRIMARY KEY ("id");
    `)

    expect(result.status).toBe(0)
  })

  it('rejects non-enum type creation', () => {
    const result = validate('CREATE TYPE "ExampleType" AS RANGE (subtype = text);')

    expect(result.status).not.toBe(0)
  })

  it.each([
    'UPDATE "Customer" SET "email" = NULL;',
    'DELETE FROM "Appointment";',
    'INSERT INTO "Customer" ("email") VALUES (NULL);',
    'WITH rows AS (SELECT 1) UPDATE "Customer" SET "email" = NULL;',
  ])('rejects data-changing SQL: %s', (sql) => {
    const result = validate(sql)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('not allowed')
  })

  it.each([
    'DROP TABLE "Customer";',
    'ALTER TABLE "Customer" DROP COLUMN "email";',
    'ALTER TABLE "Appointment" ALTER COLUMN "price" TYPE INTEGER;',
  ])('rejects destructive schema changes: %s', (sql) => {
    const result = validate(sql)

    expect(result.status).not.toBe(0)
  })
})
