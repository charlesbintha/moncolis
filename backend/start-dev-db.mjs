/**
 * start-dev-db.mjs
 * Starts an in-memory PostgreSQL server using pg-mem over TCP
 * so Prisma can connect to postgresql://colisn:colisn123@localhost:5432/colisn_db
 */
import { newDb } from 'pg-mem';
import net from 'net';

const PORT = 5432;
const db = newDb();

// Create the pg adapter which speaks the postgres wire protocol
const pg = db.adapters.createPg();

// pg-mem's createPg() returns a Pool/Client-compatible pg mock
// For TCP we need pg-protocol server - check if pg-mem supports it
const { Pool, Client } = pg;

console.log('📦 pg-mem in-memory database ready');
console.log(`ℹ️  DATABASE_URL: postgresql://localhost:5432/colisn_db`);

// Expose pg-mem's pool globally so the app can use it
// NOTE: pg-mem does NOT support a real TCP wire protocol server.
// For the backend to work, we need to patch the 'pg' module to use pg-mem.
// This is done via the PG_MEM_PATCH approach.

// Write a patch file that the app can require first
import { writeFileSync } from 'fs';

writeFileSync('/tmp/pg-patch.cjs', `
const { newDb } = require('pg-mem');
const db = newDb();
const { Pool, Client } = db.adapters.createPg();

// Monkey-patch the 'pg' module
const Module = require('module');
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'pg' || request === 'pg/lib/pool' || request === 'pg/lib/client') {
    return { Pool, Client, defaults: {} };
  }
  return originalLoad.apply(this, arguments);
};

console.log('✅ pg-mem patch applied');
`);

console.log('✅ pg patch written to /tmp/pg-patch.cjs');
console.log('');
console.log('Run: node -r /tmp/pg-patch.cjs dist/main.js');
