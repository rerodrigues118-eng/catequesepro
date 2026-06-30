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

async function createAdminUser() {
  console.log('Creating admin user...');
  const email = 'admin@catequesepro.local';
  const password = 'Admin123!';

  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin' },
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    const alreadyRegistered =
      result?.message?.includes('User already registered') ||
      result?.msg?.includes('already been registered') ||
      result?.code === 'email_exists' ||
      result?.error_code === 'email_exists';

    if (alreadyRegistered) {
      console.log('Admin user already exists. Fetching user id...');
      const { data, error } = await supabase.auth.admin.listUsers();
      if (error) throw new Error(`Failed to list users: ${error.message}`);
      const existing = data?.users?.find((u) => u.email === email);
      if (!existing) throw new Error('Admin exists but could not fetch existing user.');
      return existing;
    }
    throw new Error(`Failed to create admin user: ${JSON.stringify(result)}`);
  }

  return result;
}

async function ensureInitialNotificationConfig(paroquiaId) {
  const { data: existing, error: existingError } = await supabase
    .from('configuracoes_notificacao')
    .select('id')
    .eq('paroquia_id', paroquiaId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to query configuracoes_notificacao: ${existingError.message}`);
  }

  if (!existing) {
    const { error: insertError } = await supabase.from('configuracoes_notificacao').insert({
      paroquia_id: paroquiaId,
      max_faltas: 3,
      idade_min_iniciacao: 7,
      idade_min_primeira_comunhao: 9,
      idade_min_crisma: 14,
      notificacao_ativa_faltas: true,
      notificacao_ativa_idade: true,
    });

    if (insertError) {
      throw new Error(`Failed to insert initial configuracoes_notificacao: ${insertError.message}`);
    }
  }
}

async function ensureTestNotification(catequizandoId) {
  const { data: existing, error: existingError } = await supabase
    .from('notificacoes_log')
    .select('id')
    .eq('enviado_para', 'teste@email.com')
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to query notificacoes_log: ${existingError.message}`);
  }

  if (!existing) {
    const { error: insertError } = await supabase.from('notificacoes_log').insert({
      catequizando_id: catequizandoId,
      tipo: 'faltas',
      enviado_para: 'teste@email.com',
      detalhes: { total_faltas: 4, max_faltas: 3 },
    });

    if (insertError) {
      throw new Error(`Failed to insert test notification: ${insertError.message}`);
    }
  }
}

async function seedTestData(adminUser) {
  console.log('Seeding mock data...');

  const paroquias = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      nome: 'Paróquia São Pedro',
      endereco: 'Rua das Flores, 123',
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      nome: 'Paróquia Nossa Senhora Aparecida',
      endereco: 'Av. das Acácias, 456',
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      nome: 'Paróquia São José das Familias - Matriz',
      endereco: 'Praça da Matriz, 100',
    },
  ];

  const comunidades = [
    {
      id: '00000000-0000-0000-0000-000000000011',
      nome: 'Comunidade São Pedro',
      paroquia_id: paroquias[0].id,
    },
    {
      id: '00000000-0000-0000-0000-000000000012',
      nome: 'Comunidade Aparecida',
      paroquia_id: paroquias[1].id,
    },
    {
      id: '00000000-0000-0000-0000-000000000013',
      nome: 'Cristo Rei',
      paroquia_id: paroquias[2].id,
    },
    {
      id: '00000000-0000-0000-0000-000000000014',
      nome: 'Santo Antônio',
      paroquia_id: paroquias[2].id,
    },
    {
      id: '00000000-0000-0000-0000-000000000015',
      nome: 'Menino Jusus de Praga',
      paroquia_id: paroquias[2].id,
    },
    {
      id: '00000000-0000-0000-0000-000000000016',
      nome: 'Bom Jesus',
      paroquia_id: paroquias[2].id,
    },
    {
      id: '00000000-0000-0000-0000-000000000017',
      nome: 'Nossa Senhora do Perpétuo Socorro',
      paroquia_id: paroquias[2].id,
    },
  ];

  const catequistas = [
    {
      id: '00000000-0000-0000-0000-000000000021',
      nome: 'Maria Aparecida',
      email: 'maria@catequesepro.local',
      comunidade_id: comunidades[0].id,
    },
    {
      id: '00000000-0000-0000-0000-000000000022',
      nome: 'Pedro Oliveira',
      email: 'pedro@catequesepro.local',
      comunidade_id: comunidades[0].id,
    },
    {
      id: '00000000-0000-0000-0000-000000000023',
      nome: 'Luciana Castro',
      email: 'luciana@catequesepro.local',
      comunidade_id: comunidades[1].id,
    },
  ];

  const catequizandos = [
    {
      id: '00000000-0000-0000-0000-000000000031',
      nome: 'João Silva',
      data_nascimento: '2012-04-20',
      nome_pai: 'Carlos Silva',
      nome_mae: 'Ana Silva',
      endereco: 'Rua das Rosas, 45',
      foto_url: null,
      nivel: 'iniciacao',
      catequista_id: catequistas[0].id,
      comunidade_id: comunidades[0].id,
      paroquia_id: paroquias[0].id,
    },
    {
      id: '00000000-0000-0000-0000-000000000032',
      nome: 'Beatriz Santos',
      data_nascimento: '2011-09-10',
      nome_pai: 'Fernando Santos',
      nome_mae: 'Mariana Santos',
      endereco: 'Rua dos Lírios, 78',
      foto_url: null,
      nivel: 'primeira_eucaristia',
      catequista_id: catequistas[1].id,
      comunidade_id: comunidades[0].id,
      paroquia_id: paroquias[0].id,
    },
    {
      id: '00000000-0000-0000-0000-000000000033',
      nome: 'Carlos Henrique',
      data_nascimento: '2010-05-02',
      nome_pai: 'Roberto Henrique',
      nome_mae: 'Clara Henrique',
      endereco: 'Av. dos Girassóis, 10',
      foto_url: null,
      nivel: 'crisma',
      catequista_id: catequistas[1].id,
      comunidade_id: comunidades[0].id,
      paroquia_id: paroquias[0].id,
    },
    {
      id: '00000000-0000-0000-0000-000000000034',
      nome: 'Daniela Pereira',
      data_nascimento: '2013-12-01',
      nome_pai: 'Ricardo Pereira',
      nome_mae: 'Patrícia Pereira',
      endereco: 'Rua da Alegria, 92',
      foto_url: null,
      nivel: 'iniciacao',
      catequista_id: catequistas[2].id,
      comunidade_id: comunidades[1].id,
      paroquia_id: paroquias[1].id,
    },
    {
      id: '00000000-0000-0000-0000-000000000035',
      nome: 'Eduardo Lima',
      data_nascimento: '2011-02-18',
      nome_pai: 'Gustavo Lima',
      nome_mae: 'Sofia Lima',
      endereco: 'Travessa do Sol, 12',
      foto_url: null,
      nivel: 'primeira_eucaristia',
      catequista_id: catequistas[2].id,
      comunidade_id: comunidades[1].id,
      paroquia_id: paroquias[1].id,
    },
  ];

  await supabase.from('paroquias').upsert(paroquias, { onConflict: 'id' });
  await supabase.from('comunidades').upsert(comunidades, { onConflict: 'id' });
  await supabase.from('catequistas').upsert(catequistas, { onConflict: 'id' });
  await supabase.from('catequizandos').upsert(catequizandos, { onConflict: 'id' });

  await supabase.from('profiles').upsert([
    {
      id: adminUser.id,
      role: 'admin',
      catequista_id: null,
    },
    {
      id: catequistas[0].id,
      role: 'catequista',
      catequista_id: catequistas[0].id,
    },
    {
      id: catequistas[1].id,
      role: 'catequista',
      catequista_id: catequistas[1].id,
    },
    {
      id: catequistas[2].id,
      role: 'catequista',
      catequista_id: catequistas[2].id,
    },
  ], { onConflict: 'id' });

  await ensureInitialNotificationConfig(paroquias[0].id);

  if (process.env.SEED_TEST_NOTIFICATION && catequizandos.length > 0) {
    await ensureTestNotification(catequizandos[0].id);
  }

  console.log('Mock data seeded successfully.');
}

try {
  const adminUser = await createAdminUser();
  console.log('Admin user id:', adminUser?.id || adminUser?.sub || 'unknown');
  await seedTestData(adminUser);
  console.log('Seeding complete.');
} catch (error) {
  console.error('Seeding failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
