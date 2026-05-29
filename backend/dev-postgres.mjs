/**
 * dev-postgres.mjs
 * Starts a local PostgreSQL server using @electric-sql/pglite + pg-gateway
 * so that Prisma (which needs a real TCP postgres) can connect.
 */
import { PGlite } from '@electric-sql/pglite';
import net from 'net';
import fs from 'fs';
import path from 'path';

// Try to import pg-gateway for TCP bridging
let PGliteServer;
try {
  const mod = await import('@electric-sql/pglite/node');
  PGliteServer = mod.PGliteServer;
} catch (e) {
  console.log('pg-gateway not available via pglite/node, using pg-mem fallback');
}

// If PGliteServer is available, use it
if (PGliteServer) {
  const db = new PGlite('/tmp/colisn-pglite-data');
  await db.waitReady;
  const server = new PGliteServer(db);
  await server.listen({ port: 5432, host: '127.0.0.1' });
  console.log('✅ PGlite postgres listening on 127.0.0.1:5432');
} else {
  console.log('ℹ️  PGliteServer not available - postgres must be started manually');
  process.exit(1);
}
