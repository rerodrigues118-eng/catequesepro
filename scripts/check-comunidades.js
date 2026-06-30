const fs = require('fs');
const path = require('path');
const envPath = path.join(process.cwd(), '.env');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const idx = line.indexOf('=');
  const k = line.slice(0, idx).trim();
  let v = line.slice(idx + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  env[k] = v;
}
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
(async () => {
  const { data, error } = await supabase.from('comunidades').select('id,nome').limit(10);
  console.log(JSON.stringify({ data, error }, null, 2));
})();
