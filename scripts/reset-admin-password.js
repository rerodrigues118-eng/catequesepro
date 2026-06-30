import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

const envPath = new URL('../.env', import.meta.url);
const envText = await fs.readFile(envPath, 'utf8');
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [key, ...rest] = line.split('=');
      return [key, rest.join('=')];
    })
);

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, detectSessionInUrl: false },
});

async function resetAdminPassword() {
  console.log('🔄 Resetando senha do admin...');
  
  const adminEmail = 'admin@catequesepro.local';
  const newPassword = 'Admin123!@#Novo';

  try {
    // Listar usuários para encontrar o admin
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Erro ao listar usuários: ${listError.message}`);
    }

    const adminUser = users?.users?.find((u) => u.email === adminEmail);
    
    if (!adminUser) {
      throw new Error(`Usuário admin com email ${adminEmail} não encontrado`);
    }

    console.log(`✓ Encontrado usuário admin: ${adminUser.email}`);

    // Resetar senha do admin
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      { password: newPassword }
    );

    if (updateError) {
      throw new Error(`Erro ao resetar senha: ${updateError.message}`);
    }

    console.log(`✅ Senha do admin resetada com sucesso!`);
    console.log(`\n📧 Email: ${adminEmail}`);
    console.log(`🔐 Nova senha: ${newPassword}`);
    console.log(`\n⚠️  Guarde essa senha em um local seguro!`);
    console.log(`💡 Você poderá alterar a senha após fazer login.`);
  } catch (error) {
    console.error('❌ Erro ao resetar a senha:', error.message);
    process.exit(1);
  }
}

await resetAdminPassword();
