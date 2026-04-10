
const { Client } = require('pg');
const client = new Client({
  connectionString: "postgresql://pushp:pushp@localhost:5432/crm" 
});

async function findUUID() {
  const uuid = 'a8776daf-f410-4c2d-b143-ae28f4eee48e';
  await client.connect();
  
  const tables = ['projects', 'invoices', 'leads', 'users'];
  for (const table of tables) {
    const res = await client.query(`SELECT id FROM ${table} WHERE id = $1`, [uuid]);
    if (res.rows.length > 0) {
      console.log(`FOUND in table: ${table}`);
      return;
    }
  }
  console.log('UUID NOT FOUND IN PRIMARY TABLES');
  await client.end();
}

findUUID();
