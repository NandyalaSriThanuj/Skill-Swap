import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env' });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCreate() {
  console.log('Inserting into interview_sessions...');
  const { data, error } = await supabase.from('interview_sessions').insert({
    user_id: '55c8e036-791b-4d5f-b10f-f95f41655b39', // Using one from the screenshot
    room_id: crypto.randomUUID(),
    skill: 'TestSkill',
    status: 'pending',
    transcript: []
  }).select().single();
  
  if (error) {
    console.error('Insert failed:', error);
  } else {
    console.log('Insert success:', data);
  }
}

testCreate();
