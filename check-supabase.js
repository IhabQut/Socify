require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_KEY
);

async function listTables() {
    const { data, error } = await supabase.from('information_schema.tables').select('table_name').eq('table_schema', 'public');
    if (error) {
        console.error("Error connecting:", error);
    } else {
        console.log("Tables in public schema:", data.map(t => t.table_name));
    }
}

listTables();
