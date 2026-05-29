/**
 * start-local-db.mjs
 * Starts a real embedded PostgreSQL 18 server (no Docker needed)
 * Uses -k '' to disable Unix domain sockets (sandbox-compatible)
 */
import EmbeddedPostgres from 'embedded-postgres';

const DATA_DIR = '/tmp/colisn-pgdata';

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: 'eteral',
  password: 'root',
  port: 5432,
  persistent: true,
  // Disable Unix domain sockets — use TCP only
  postgresFlags: ['-k', ''],
  onLog: (msg) => {
    // Only show important messages
    if (msg.includes('ready to accept') || msg.includes('ERROR') || msg.includes('FATAL')) {
      process.stdout.write(msg);
    }
  },
});

console.log('🚀 Démarrage de PostgreSQL embarqué...');

try {
  await pg.initialise();
} catch(e) {
  // Already initialized is fine
}

await pg.start();
console.log('✅ PostgreSQL démarré sur le port 5432');

try {
  await pg.createDatabase('colisn');
  console.log('✅ Base de données "colisn" créée');
} catch(e) {
  if (String(e).includes('42P04') || String(e).includes('already exists')) {
    console.log('ℹ️  Base de données "colisn" déjà existante');
  } else {
    console.log('Note DB:', String(e).slice(0, 100));
  }
}

console.log('');
console.log('   DATABASE_URL=postgresql://eteral:root@localhost:5432/colisn');
console.log('✅ Base de données prête ! Ne fermez pas cette fenêtre.');

process.on('SIGTERM', async () => { await pg.stop(); process.exit(0); });
process.on('SIGINT',  async () => { await pg.stop(); process.exit(0); });
setInterval(() => {}, 60_000);
