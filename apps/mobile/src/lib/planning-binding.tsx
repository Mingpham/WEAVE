import {useCallback,useEffect,useRef,useState} from 'react';
import {Alert} from 'react-native';
import {router,type Href} from 'expo-router';
import * as Crypto from 'expo-crypto';
import {PlanData,type PlanOperation} from '../../../../packages/contracts/src/api/planning';
import {DraftArea,DraftResource,DraftTask} from '../../../../packages/contracts/src/plan';
import type {MobileBinding} from '@/features/navigation/presentation';
import {eventPath,type MobileRoute} from '@/features/navigation/routes';
import type {PlanningEditorOptions,PlanningForm,PlanningItem,PlanningItemKind,PlanningView} from '@/features/planning/models';
import {ApiClient,ApiFailure} from './api-client';
import {planningLiveEn as copy} from '@/strings/planning-live';

const blank=():PlanningForm=>({name:'',description:'',areaKey:'',roleKey:'',roleRequired:false,start:'',due:'0',duration:'15',stipend:'',critical:false,hardDeadline:false,
  criteria:[{text:'',critical:false,photo:false}],dependencies:[],needs:[],category:'',kindKey:'ITEM',quantity:'',inventoryKey:'UNVERIFIED',custodian:''});
export function planItems(data:PlanData):PlanningItem[]{
 const make=(key:string,kind:PlanningItemKind,title:string,form:PlanningForm,locked:boolean,ai:boolean):PlanningItem=>({key,kind,title,form,locked,ai,detail:form.description,sourceLabel:ai?copy.aiSource:copy.humanSource});
 return [...data.draft.areas.map(a=>make(a.key,'area',a.name,{...blank(),name:a.name,description:a.notes??''},a.locked,a.origin==='AI')),
 ...data.draft.role_tags.map(r=>make(r,'role',r,{...blank(),name:r},true,false)),
 ...data.draft.resources.map(r=>make(r.key,'resource',r.name,{...blank(),name:r.name,description:r.reason,areaKey:r.area_key??'',category:r.category,kindKey:r.kind,
 quantity:r.quantity?.toString()??'',inventoryKey:r.inventory_state,custodian:r.custodian_member_id??''},r.locked,r.origin==='AI')),
 ...data.draft.tasks.map(t=>make(t.key,'task',t.title,{...blank(),name:t.title,description:t.description,areaKey:t.area_key??'',roleKey:t.role_tag??'',roleRequired:t.role_required,
 start:t.start_offset_min?.toString()??'',due:String(t.due_offset_min),duration:String(t.estimated_minutes),stipend:t.stipend_amount?.toString()??'',critical:t.critical,hardDeadline:t.hard_deadline,
 criteria:t.criteria.map(c=>({text:c.description,critical:c.critical,photo:c.photo_expected})),dependencies:t.depends_on.map(d=>({key:d.task_key,required:d.kind==='HARD'})),
 needs:t.needs.map(n=>({key:n.resource_key??`category:${n.category}`,required:n.hard}))},t.locked,t.origin==='AI'))];
}
function operation(item:PlanningItem,form:PlanningForm):PlanOperation {
 const meta={key:item.key,origin:'HUMAN' as const,locked:true};
 if(item.kind==='area')return{op:'UPSERT',collection:'areas',key:item.key,value:DraftArea.parse({...meta,name:form.name,notes:form.description||null})};
 if(item.kind==='role')return{op:'UPSERT',collection:'role_tags',key:item.key,value:form.name};
 if(item.kind==='resource')return{op:'UPSERT',collection:'resources',key:item.key,value:DraftResource.parse({...meta,name:form.name,category:form.category,kind:form.kindKey,quantity:form.quantity?Number(form.quantity):null,
 inventory_state:form.inventoryKey,area_key:form.areaKey||null,custodian_member_id:form.custodian||null,reason:form.description})};
 return{op:'UPSERT',collection:'tasks',key:item.key,value:DraftTask.parse({...meta,title:form.name,description:form.description,area_key:form.areaKey||null,role_tag:form.roleKey||null,role_required:form.roleRequired,
 start_offset_min:form.start?Number(form.start):null,due_offset_min:Number(form.due),hard_deadline:form.hardDeadline,estimated_minutes:Number(form.duration),critical:form.critical,stipend_amount:form.stipend?Number(form.stipend):null,
 criteria:form.criteria.map(c=>({description:c.text,critical:c.critical,photo_expected:c.photo})),depends_on:form.dependencies.map(d=>({task_key:d.key,kind:d.required?'HARD':'SOFT'})),
 needs:form.needs.map(n=>({resource_key:n.key.startsWith('category:')?null:n.key,category:n.key.startsWith('category:')?n.key.slice(9):null,hard:n.required}))})};
}
export function usePlanningBinding(api:ApiClient,projectId:string|undefined,enabled:boolean){
 const [data,setData]=useState<PlanData>();const [phase,setPhase]=useState<'loading'|'ready'|'error'>('loading');const[errorCode,setError]=useState<string>();
 const [editor,setEditor]=useState<{item:PlanningItem;form:PlanningForm;isNew:boolean}>();
 const epoch=useRef(0);const pending=useRef<{signature:string;key:string}|undefined>(undefined);
 const refresh=useCallback(async()=>{if(!projectId||!enabled)return;const revision=++epoch.current;try{const result=await api.request(`/projects/${projectId}/plan`,PlanData);if(revision===epoch.current){setData(result);setPhase('ready');setError(undefined);}}catch(e){if(revision===epoch.current){setPhase('error');setError(e instanceof ApiFailure?e.code:'INTERNAL');}}},[api,projectId,enabled]);
 useEffect(()=>{const revision=++epoch.current;let active=true;pending.current=undefined;
  void Promise.resolve().then(()=>{if(!active||revision!==epoch.current)return;setData(undefined);setEditor(undefined);setPhase('loading');if(enabled)void refresh();});
  return()=>{active=false;};},[enabled,projectId,refresh]);
 async function mutate(suffix:string,body:unknown,method:'POST'|'PATCH'){
  if(!data||!projectId||!enabled||data.project_id!==projectId)throw new ApiFailure('FORBIDDEN');
  const signature=JSON.stringify({projectId,suffix,body});if(pending.current?.signature!==signature)pending.current={signature,key:Crypto.randomUUID()};
  const revision=epoch.current;const result=await api.request(`/projects/${projectId}/plan${suffix}`,PlanData,{method,body,key:pending.current.key});
  if(revision!==epoch.current)throw new ApiFailure('UNAUTHENTICATED');setData(result);setPhase('ready');pending.current=undefined;return result;
 }
 function read(route:MobileRoute):MobileBinding|undefined{
  if(!enabled||!projectId||!('projectId'in route)||route.projectId!==projectId||!['plan','plan-review','draft-item'].includes(route.screen))return;
  const state={phase,errorCode,refresh:()=>void refresh()};if(!data||data.project_id!==projectId)return{state:{...state,phase:'loading'}};
  const items=planItems(data);const canEdit=data.status==='EDITING';
  const navigate=(screen:'plan'|'plan-review'|'draft-item'|'resources',key?:string)=>router.push(eventPath(projectId!,screen,key) as Href);
  const source=(key:string)=>{const found=items.find(i=>i.key===key.replace(/^item:/,''));Alert.alert(copy.sourceTitle,found?`${found.sourceLabel}\n${found.title}\n${found.detail}`:JSON.stringify({revision:data.revision,source:key},null,2));};
  const model:PlanningView={revision:String(data.revision),items,messages:data.messages.map(m=>({key:m.id,text:m.text,ai:m.role==='AI',sourceLabel:m.role,changes:[]})),
   questions:data.draft.questions.filter(q=>q.status==='OPEN').map(q=>({key:q.id,text:q.text,why:q.why,answers:q.suggested_answers})),gaps:data.draft.gaps.map(g=>g.message),assumptions:data.draft.assumptions,
   composing:data.status==='COMPOSING',aiAvailable:data.ai_available,aiFailed:!!data.last_error,canEdit:true,finalized:data.reviewed_revision===data.revision,published:data.status==='PUBLISHED',
   timeContext:data.timezone,timeline:data.draft.tasks.slice().sort((a,b)=>a.due_offset_min-b.due_offset_min).map(t=>({key:t.key,title:t.title,area:data.draft.areas.find(a=>a.key===t.area_key)?.name??copy.unassigned,
   time:new Intl.DateTimeFormat('en',{dateStyle:'medium',timeStyle:'short',timeZone:data.timezone}).format(new Date(Date.parse(data.starts_at)+t.due_offset_min*60000))}))};
  const version={expected_revision:data.revision,expected_state_version:data.state_version};
  const edit=(key:string)=>{const item=items.find(i=>i.key===key);if(!item)return;setEditor({item,form:structuredClone(item.form),isNew:false});navigate('draft-item',key);};
  const add=(kind:PlanningItemKind)=>{const key=`${kind}-${Crypto.randomUUID().slice(0,8)}`;const form=blank();const item:PlanningItem={key,kind,title:'',detail:'',locked:true,ai:false,sourceLabel:copy.humanSource,form};setEditor({item,form,isNew:true});navigate('draft-item',key);};
  if(route.screen==='plan'&&data.status!=='PUBLISHED')return{state,view:{screen:'plan',props:{model,onSend:async message=>{await mutate('/compose',{...version,mode:'REVISE',message},'POST');},
   onFinalize:async()=>{await mutate('/compose',{...version,mode:'FINALIZE'},'POST');navigate('plan-review');},onEdit:edit,onAdd:add,onSource:source}}};
  if(route.screen==='plan-review'||data.status==='PUBLISHED')return{state,view:{screen:'plan-review',props:{model,onBack:()=>navigate('plan'),onPublish:async()=>{await mutate('/publish',version,'POST');},onResources:()=>navigate('resources'),onSource:source}}};
  const selected=editor?.item.key===route.itemId?editor:undefined;const item=selected?.item??items.find(i=>i.key===route.itemId);
  if(!item)return{state:{phase:'error',errorCode:'NOT_FOUND',refresh:()=>void refresh()}};
  const options:PlanningEditorOptions={areas:data.draft.areas.map(a=>({key:a.key,label:a.name})),roles:data.draft.role_tags.map(r=>({key:r,label:r})),tasks:data.draft.tasks.map(t=>({key:t.key,label:t.title})),resources:data.draft.resources.map(r=>({key:r.key,label:r.name})),
   resourceCategories:[...new Set(data.draft.resources.map(r=>r.category))].map(c=>({key:`category:${c}`,label:c})),inventory:[{key:'CONFIRMED',label:copy.have},{key:'TO_ACQUIRE',label:copy.acquire},{key:'UNVERIFIED',label:copy.unsure},{key:'REPORTED',label:copy.reported}],resourceKinds:[{key:'ITEM',label:copy.item},{key:'SUPPLY',label:copy.supply}],acquisitionKey:'TO_ACQUIRE'};
  const collection=({task:'tasks',resource:'resources',area:'areas',role:'role_tags'} as const)[item.kind];
  return{state,view:{screen:'draft-item',props:{item,form:selected?.form??item.form,options,revision:String(data.revision),composing:model.composing,canEdit,isNew:selected?.isNew,
   onChange:form=>setEditor({item,form,isNew:selected?.isNew??false}),onSave:async form=>{await mutate('',{...version,ops:[operation(item,form)]},'PATCH');setEditor(undefined);navigate('plan');},
   onDelete:async()=>{await mutate('',{...version,ops:[{op:'DELETE',collection,key:item.key}]},'PATCH');setEditor(undefined);navigate('plan');},
   onLock:async locked=>{const result=await mutate('',{...version,ops:[{op:locked?'LOCK':'UNLOCK',collection,key:item.key}]},'PATCH');const updated=planItems(result).find(i=>i.key===item.key);if(updated)setEditor({item:updated,form:selected?.form??updated.form,isNew:false});},onBack:()=>navigate('plan'),onSource:source}}};
 }
 return{read,refresh};
}
