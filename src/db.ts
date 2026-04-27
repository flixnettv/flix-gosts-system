import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  console.warn('DATABASE_URL is not defined. Database features will be unavailable.');
}

// Use a placeholder if connection string is missing to prevent postgres('') from throwing
const dbUrl = connectionString || 'postgresql://localhost:5432/placeholder';

export const db = postgres(dbUrl, {
  onnotice: () => {},
  connect_timeout: 10,
  max_lifetime: 60 * 30,
  prepare: false,
});

// Test connection
if (connectionString) {
  const maskedUrl = connectionString.replace(/:([^:@]+)@/, ':****@');
  console.log(`[DB] Initializing connection to: ${maskedUrl}`);
  db`SELECT 1`.then(() => {
    console.log('✅ Successfully connected to the database.');
  }).catch(err => {
    const msg = err.message || String(err);
    if (msg.includes('password authentication failed')) {
      console.error('CRITICAL: Database password authentication failed. Please check your DATABASE_URL in the Settings menu. Hint: Ensure special characters in the password (like @, #, :) are URL-encoded. You can use the "Connection Helper" in the app settings to generate a correctly encoded URL.');
    } else {
      console.error('Database connection failed. Please check your DATABASE_URL in the Settings menu. Hint: Ensure special characters in the password are URL-encoded.', msg);
    }
  });
}
