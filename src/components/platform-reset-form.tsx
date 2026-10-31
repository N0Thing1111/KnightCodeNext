"use client";
import Link from 'next/link';
import { useActionState, useState } from 'react';
import { managePlatformData } from '@/app/actions/platform-data';
import { resetPhrase,resetRecordLabels,type ResetMode,type ResetTarget,type ResetState } from '@/lib/platform-reset';
type Option={id:string;label:string};
export function PlatformResetForm({platform,students,sections,teachers}:{platform:boolean;students:Option[];sections:Option[];teachers:Option[]}) {
 const [mode,setMode]=useState<ResetMode>(platform?'platform_keep':'learning');
 const [target,setTarget]=useState<ResetTarget>(platform?'all':'student');
 const [targetId,setTargetId]=useState('');
 const [state,action,pending]=useActionState<ResetState,FormData>(managePlatformData,{});
 const options=target==='student'?students:target==='section'?sections:teachers;
 const needsId=['student','section','teacher'].includes(target);
 const preview=state.preview;
 const matches=preview&&preview.mode===mode&&preview.target===target&&preview.target_id===(needsId?targetId:null);
 return <form action={action} className="platform-reset-form">
  <section className="teacher-card">
   <h2>{platform?'Platform reset':'Learning reset'}</h2>
   <p>{platform?'Affects every teacher and learner, including independent learners. Removes learning records, sections, memberships, class join requests, assignments and announcements.':'Choose whose complete learning history to reset. Section and teacher selections include their current students, including archived accounts and sections. Previous and independent learning records for those students are also cleared.'}</p>
   <p>{platform?'Preserves lessons, game definitions, Python activity instructions and practice checks, achievement definitions, administrator accounts, platform settings, audit history and stored backups.':'Clears selected learners\' game progress, Python drafts, runs, submissions, feedback, earned achievements, notifications, XP and streaks. Independent lesson unlocks reset to the first lesson. Accounts, memberships, class join requests, assignments and shared content remain.'}</p>
   <p>Ask affected users to stop running code or playing games before resetting. New activity after the reset can create new records.</p>
   <p><Link href="/admin/backup">Create or download a backup first</Link>. Restoring a backup later affects the whole platform, including other users&apos; work since that save.</p>
   <div className="admin-form">
   {platform?<label>Account handling<select name="mode" value={mode} disabled={pending} onChange={e=>setMode(e.target.value as ResetMode)}><option value="platform_keep">Keep teacher and student accounts</option><option value="platform_delete">Delete teacher and student accounts too</option></select></label>:<input type="hidden" name="mode" value="learning"/>}
   {platform?<><input type="hidden" name="target" value="all"/><p>{mode==='platform_keep'?'Existing passwords and verification stay unchanged. Students become independent learners after sections are removed.':'Teacher and student sign-in accounts are permanently deleted. Restoring missing accounts requires new temporary passwords; their old passwords cannot be recovered.'}</p></>:<label>Reset scope<select name="target" value={target} disabled={pending} onChange={e=>{setTarget(e.target.value as ResetTarget);setTargetId('');}}><option value="student">Selected student</option><option value="section">Selected section</option><option value="teacher">Selected teacher&apos;s students</option><option value="independent">All independent learners (no section)</option><option value="all">All learners</option></select></label>}
   {needsId&&<label>{target==='student'?'Student':target==='section'?'Section':'Teacher'}<select name="target_id" value={targetId} required disabled={pending} onChange={e=>setTargetId(e.target.value)}><option value="">Choose {target}</option>{options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>}
   <button className="teacher-btn" name="operation" value="preview" disabled={pending||(needsId&&!targetId)} formNoValidate>{pending?'Working...':'Preview affected records'}</button>
   </div>
  </section>
  {state.error&&<p className="teacher-alert error" role="alert">{state.error}</p>}
  {state.message&&<p className="teacher-alert" role="status">{state.message}</p>}
  {matches&&<section className="teacher-card admin-danger">
   <h3>Review: {preview.target_label}</h3><p>{preview.student_ids.length} {preview.student_ids.length === 1 ? "learner" : "learners"} affected. The counts are checked again when you confirm; changed counts or membership require another preview.</p>
   <details className="reset-affected-learners"><summary>View affected learners ({preview.student_ids.length})</summary><ul>{preview.student_ids.map(id=><li key={id}>{students.find(s=>s.id===id)?.label||id}</li>)}</ul></details>
   <div className="teacher-table-wrap"><table className="teacher-table"><thead><tr><th>Records affected</th><th>Count</th></tr></thead><tbody>{Object.entries(preview.counts).map(([key,value])=><tr key={key}><td>{resetRecordLabels[key]||key.replaceAll('_',' ')}</td><td>{value}</td></tr>)}</tbody></table></div>
   <input type="hidden" name="preview" value={JSON.stringify(preview)}/>
   <div className="admin-form" key={JSON.stringify(preview)}>
    <label>Type {resetPhrase(mode)}<input name="confirmation" required autoComplete="off" disabled={pending}/></label>
    <label>Your administrator password<input type="password" name="admin_password" required autoComplete="current-password" disabled={pending}/></label>
    <button className="teacher-btn" name="operation" value="reset" disabled={pending||(!platform&&!preview.student_ids.length)}>{pending?'Working...':'Permanently reset these records'}</button>
   </div>
  </section>}
 </form>;
}
