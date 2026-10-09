import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

function blank(source) {
  return source.replace(/[^\r\n]/g, ' ')
}

function stripCommentsAndQuotedText(sql) {
  let result = ''
  let index = 0

  while (index < sql.length) {
    if (sql.startsWith('--', index)) {
      const end = sql.indexOf('\n', index)
      const stop = end === -1 ? sql.length : end
      result += blank(sql.slice(index, stop))
      index = stop
      continue
    }

    if (sql.startsWith('/*', index)) {
      const start = index
      let depth = 1
      index += 2
      while (index < sql.length && depth > 0) {
        if (sql.startsWith('/*', index)) {
          depth += 1
          index += 2
        } else if (sql.startsWith('*/', index)) {
          depth -= 1
          index += 2
        } else {
          index += 1
        }
      }
      if (depth !== 0) throw new Error('Unterminated SQL comment')
      result += blank(sql.slice(start, index))
      continue
    }

    if (sql[index] === "'" || sql[index] === '"') {
      const quote = sql[index]
      const start = index
      index += 1
      let closed = false
      while (index < sql.length) {
        if (quote === "'" && sql[index] === '\\') {
          index += 2
        } else if (sql[index] === quote && sql[index + 1] === quote) {
          index += 2
        } else if (sql[index] === quote) {
          index += 1
          closed = true
          break
        } else {
          index += 1
        }
      }
      if (!closed) throw new Error('Unterminated quoted SQL value or identifier')
      result += blank(sql.slice(start, index))
      continue
    }

    if (sql[index] === '$' && /^\$(?:[a-zA-Z_][a-zA-Z0-9_]*)?\$/.test(sql.slice(index))) {
      throw new Error('Dollar-quoted SQL blocks are not allowed in automatic migrations')
    }

    result += sql[index]
    index += 1
  }

  return result
}

function validateMigrationSql(sql, fileName) {
  const executableSql = stripCommentsAndQuotedText(sql).toUpperCase()
  const statements = executableSql.split(';').map((statement) => statement.trim()).filter(Boolean)
  const dataMutation = /^(?:INSERT|UPDATE|DELETE|TRUNCATE|MERGE|COPY|CALL|DO|SELECT|WITH)\b/
  const createStatement = /^(?:CREATE\s+TABLE\b|CREATE\s+(?:UNIQUE\s+)?INDEX\b)/
  const createEnumStatement = /^CREATE\s+TYPE\s+AS\s+ENUM\s*\(\s*(?:,\s*)*\)$/
  const additiveAlter = /\bADD\s+(?:COLUMN|CONSTRAINT)\b/
  const relaxNullability = /\bALTER\s+COLUMN\b[^,;]*?\bDROP\s+NOT\s+NULL\b/

  for (const statement of statements) {
    if (dataMutation.test(statement)) {
      throw new Error(`${fileName}: data-changing SQL is not allowed`)
    }
    if (createStatement.test(statement) || createEnumStatement.test(statement)) continue
    if (!/^ALTER\s+TABLE\b/.test(statement) || (!additiveAlter.test(statement) && !relaxNullability.test(statement))) {
      throw new Error(`${fileName}: only additive table changes are allowed`)
    }

    const withoutAllowedNullabilityChange = statement.replace(
      /\bALTER\s+COLUMN\b[^,;]*?\bDROP\s+NOT\s+NULL\b/g,
      '',
    )
    if (
      /\bDROP\b|\bRENAME\b|\bTRUNCATE\b/.test(withoutAllowedNullabilityChange)
      || /\bALTER\s+COLUMN\b[^,;]*?\b(?:TYPE|SET\s+DATA\s+TYPE)\b/.test(statement)
    ) {
      throw new Error(`${fileName}: destructive or data-mutating SQL is not allowed`)
    }
  }
}

function checkMigrationDirectory(directory) {
  const migrationDirectories = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  for (const migrationDirectory of migrationDirectories) {
    const fileName = join(directory, migrationDirectory, 'migration.sql')
    const sql = readFileSync(fileName, 'utf8')
    validateMigrationSql(sql, `${migrationDirectory}/migration.sql`)
  }
  process.stdout.write(`Validated ${migrationDirectories.length} schema-only migrations.\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const directory = process.argv[2]
      ? resolve(process.argv[2])
      : resolve(process.cwd(), 'prisma', 'migrations')
    checkMigrationDirectory(directory)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Migration validation failed'
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  }
}

export { checkMigrationDirectory, validateMigrationSql }
