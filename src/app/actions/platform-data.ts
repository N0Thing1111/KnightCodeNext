"use server";
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { resetPhrase, type ResetState } from '@/lib/platform-reset';
const selection = z.object({mode:z.enum(['learning','platform_keep','platform_delete']),target:z.enum(['student','section','teacher','independent','all']),target_id:z.string().max(80).nullable()});
export async function managePlatformData(_previous: ResetState, form: FormData): Promise<ResetState> {
 const actor=await requireAdmin();
 try {
  const parsed=selection.parse({mode:form.get('mode'),target:form.get('target'),target_id:String(form.get('target_id')||'')||null});
  const execute=form.get('operation')==='reset';
  if (!['preview','reset'].includes(String(form.get('operation')))) throw Error('Choose preview or reset.');
  let expected=null;
  if (execute) {
   if(form.get('confirmation')!==resetPhrase(parsed.mode)) throw Error('The confirmation text does not match. Preview again before resetting.');
   const auth=await createClient();const checked=await auth.auth.signInWithPassword({email:actor.email,password:String(form.get('admin_password')||'')});
   if(checked.error) throw Error('Administrator password is incorrect.');
   const raw=String(form.get('preview')||'');if(raw.length>2000000)throw Error('Preview is too large.');expected=JSON.parse(raw);
  }
  const result=await createAdminClient().rpc('manage_platform_data',{p_admin:actor.id,p_mode:parsed.mode,p_target:parsed.target,p_target_id:parsed.target_id,p_execute:execute,p_expected:expected});
  if(result.error)throw Error(result.error.message);
  if(!execute)return {preview:result.data};
  revalidatePath('/','layout');
  return {message:'Reset completed for '+result.data.target_label+'. Shared lesson content, administrator access, audit history and backups were preserved.'};
 } catch(error) {return {error:(error instanceof Error?error.message:'Reset could not be confirmed.')+' If a connection failed after confirmation, check Audit History before retrying.'};}
}
