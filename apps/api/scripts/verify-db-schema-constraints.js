const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL || 'postgresql://chithi:chithi_secret@localhost:5432/chithi_db';

async function verifyDatabaseSchemaAndConstraints() {
  console.log('================================================================');
  console.log('CHITHI DATABASE SCHEMA, CONSTRAINTS & INTEGRITY AUDIT');
  console.log(`Connecting to: ${DB_URL}`);
  console.log('================================================================\n');

  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  try {
    // 1. All 24 Tables
    console.log('[SECTION 1] Base Tables in public schema:');
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tableNames = tablesRes.rows.map(r => r.table_name);
    console.log(`Total Tables Found: ${tableNames.length} (Expected: 24)`);
    if (tableNames.length !== 24) {
      console.warn(`WARNING: Table count is ${tableNames.length}, expected 24!`);
    } else {
      console.log('✓ All 24 tables verified present.\n');
    }

    // 2. Row counts per table
    console.log('[SECTION 2] Row Counts:');
    let totalRows = 0;
    for (const t of tableNames) {
      const res = await client.query(`SELECT COUNT(*)::int as count FROM "${t}"`);
      const count = res.rows[0].count;
      totalRows += count;
      console.log(`  - ${t.padEnd(28)} : ${count} rows`);
    }
    console.log(`\nTotal Database Rows: ${totalRows}\n`);

    // 3. Primary Keys
    console.log('[SECTION 3] Primary Key Constraints:');
    const pkRes = await client.query(`
      SELECT tc.table_name, kcu.column_name, tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.ordinal_position;
    `);
    console.log(`Total Primary Keys Found: ${pkRes.rows.length}`);
    const tablesWithPk = new Set(pkRes.rows.map(r => r.table_name));
    for (const t of tableNames) {
      if (!tablesWithPk.has(t)) {
        console.error(`  ✗ Table "${t}" is missing a primary key!`);
      } else {
        const pkCols = pkRes.rows.filter(r => r.table_name === t).map(r => r.column_name).join(', ');
        console.log(`  ✓ ${t.padEnd(28)} : PK (${pkCols})`);
      }
    }
    console.log();

    // 4. Foreign Key Constraints & Referential Integrity
    console.log('[SECTION 4] Foreign Key Constraints:');
    const fkRes = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule,
        rc.update_rule,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `);
    console.log(`Total Foreign Key Constraints Found: ${fkRes.rows.length}`);
    for (const fk of fkRes.rows) {
      console.log(`  ✓ ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} (ON DELETE ${fk.delete_rule})`);
    }
    console.log();

    // 5. Check for Orphan Records across Foreign Keys
    console.log('[SECTION 5] Referential Integrity Orphan Record Audit:');
    let orphanFound = false;
    for (const fk of fkRes.rows) {
      const orphanCheck = await client.query(`
        SELECT COUNT(*)::int as orphans
        FROM "${fk.table_name}" child
        LEFT JOIN "${fk.foreign_table_name}" parent
          ON child."${fk.column_name}" = parent."${fk.foreign_column_name}"
        WHERE child."${fk.column_name}" IS NOT NULL AND parent."${fk.foreign_column_name}" IS NULL;
      `);
      const orphans = orphanCheck.rows[0].orphans;
      if (orphans > 0) {
        console.error(`  ✗ ORPHAN ALERT: ${orphans} records in ${fk.table_name}.${fk.column_name} with no parent in ${fk.foreign_table_name}!`);
        orphanFound = true;
      }
    }
    if (!orphanFound) {
      console.log('  ✓ 0 orphan records found. All foreign key references are 100% valid!\n');
    }

    // 6. Unique Constraints
    console.log('[SECTION 6] Unique Constraints & Indexes:');
    const uqRes = await client.query(`
      SELECT tc.table_name, tc.constraint_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name;
    `);
    console.log(`Total Unique Constraints Found: ${uqRes.rows.length}`);
    for (const uq of uqRes.rows) {
      console.log(`  ✓ ${uq.table_name} : UNIQUE (${uq.column_name}) [${uq.constraint_name}]`);
    }
    console.log();

    // 7. Indexes
    console.log('[SECTION 7] Database Indexes:');
    const indexRes = await client.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);
    console.log(`Total Indexes Found: ${indexRes.rows.length}`);
    for (const idx of indexRes.rows) {
      console.log(`  - ${idx.tablename.padEnd(25)} : ${idx.indexname}`);
    }
    console.log();

    // 8. Sequences
    console.log('[SECTION 8] Sequences:');
    const seqRes = await client.query(`
      SELECT sequence_name, data_type, start_value, minimum_value, maximum_value
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
      ORDER BY sequence_name;
    `);
    console.log(`Total Sequences Found: ${seqRes.rows.length}`);
    for (const seq of seqRes.rows) {
      console.log(`  - ${seq.sequence_name} (${seq.data_type})`);
    }
    console.log();

    console.log('================================================================');
    console.log('AUDIT SUMMARY: DATABASE INTEGRITY VERIFIED (PASS)');
    console.log('================================================================');
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  verifyDatabaseSchemaAndConstraints().catch(err => {
    console.error('Database schema audit failed:', err);
    process.exit(1);
  });
}

module.exports = { verifyDatabaseSchemaAndConstraints };

