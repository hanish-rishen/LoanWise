// Migration script to add conversation_id column to chat_messages table
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function addConversationIdColumn() {
  const client = new Client({
    connectionString: process.env.VITE_DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Neon database');

    // Check if conversation_id column already exists
    const checkColumnQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='chat_messages' AND column_name='conversation_id';
    `;

    const columnExists = await client.query(checkColumnQuery);

    if (columnExists.rows.length > 0) {
      console.log('✅ conversation_id column already exists');
    } else {
      // Add conversation_id column
      const addColumnQuery = `
        ALTER TABLE chat_messages
        ADD COLUMN conversation_id TEXT;
      `;

      await client.query(addColumnQuery);
      console.log('✅ Added conversation_id column to chat_messages table');
    }

    // Update existing messages to have conversation_id based on user_id and date
    const updateQuery = `
      UPDATE chat_messages
      SET conversation_id = CASE
        WHEN conversation_id IS NULL THEN
          CONCAT(user_id, '-', EXTRACT(EPOCH FROM DATE_TRUNC('day', timestamp))::text)
        ELSE conversation_id
      END
      WHERE conversation_id IS NULL;
    `;

    const result = await client.query(updateQuery);
    console.log(`✅ Updated ${result.rowCount} existing messages with conversation_id`);

    // Make conversation_id NOT NULL
    const makeNotNullQuery = `
      ALTER TABLE chat_messages
      ALTER COLUMN conversation_id SET NOT NULL;
    `;

    await client.query(makeNotNullQuery);
    console.log('✅ Made conversation_id column NOT NULL');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
    console.log('✅ Database connection closed');
  }
}

addConversationIdColumn();
