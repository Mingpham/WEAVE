import {useCallback,useEffect,useRef,useState} from 'react';
import {router,useGlobalSearchParams,type Href} from 'expo-router';
import * as Crypto from 'expo-crypto';
import {z} from 'zod';
import {WorkData,WorkResult,OfferResult,CreateTaskBody,LIMITS} from './contracts';
import {ApiClient,ApiFailure} from './api-client';
import type {MobileBinding} from '@/features/navigation/presentation';
import {eventPath,type MobileRoute} from '@/features/navigation/routes';
import type {TaskDetailActions} from '@/features/work/task-detail';
import type {OfferResultView} from '@/features/work/assign';

type Work = z.infer<typeof WorkData>;
const screens=['tasks','task','task-editor','assign','offer'];

/** Auth-scoped live work binding. Reads never issue network requests. */
export function useWorkBinding(api:ApiClient,userId:string|undefined) {
  const params=useGlobalSearchParams<{projectId?:string;screen?:string}>();
  const pid=typeof params.projectId==='string'?params.projectId:undefined;
  const enabled=!!pid&&!!userId&&screens.includes(params.screen??'');
  const [loaded,setLoaded]=useState<{pid:string;userId:string;data:Work}>();
  const [failure,setFailure]=useState<{pid:string;userId:string;code:string}>();
  const [offerState,setOfferState]=useState<{pid:string;userId:string;items:OfferResultView[]}>();
  const epoch=useRef(0);
  const identity=useRef(userId);
  const requests=useRef(new Map<string,string>());
  const refresh=useCallback(()=>{
    if(!pid||!userId) return Promise.resolve();
    const revision=++epoch.current;
    return api.request(`/projects/${pid}/work`,WorkData).then(data=>{
      if(revision===epoch.current&&identity.current===userId){setLoaded({pid,userId,data});setFailure(undefined);}
    }).catch(error=>{
      if(revision===epoch.current)setFailure({pid,userId,code:error instanceof ApiFailure?error.code:'INTERNAL'});
    });
  },[api,pid,userId]);
  useEffect(()=>{identity.current=userId;epoch.current++;requests.current.clear();},[userId,pid]);
  useEffect(()=>{const requestEpoch=epoch;if(enabled) void refresh();return()=>{requestEpoch.current++;};},[enabled,refresh]);
  const data=loaded&&loaded.pid===pid&&loaded.userId===userId?loaded.data:undefined;
  const errorCode=failure?.pid===pid&&failure?.userId===userId?failure?.code:undefined;
  const phase=errorCode?'error' as const:'loading' as const;
  const offerResults=offerState?.pid===pid&&offerState?.userId===userId?offerState?.items:[];
  async function mutate(path:string,body:unknown,array=false) {
    if(!userId||!data) throw new ApiFailure('UNAUTHENTICATED');
    const actor=userId;
    const fingerprint=JSON.stringify([path,body]);
    const key=requests.current.get(fingerprint)??Crypto.randomUUID(); requests.current.set(fingerprint,key);
    const result=await api.request<z.infer<typeof WorkResult>|z.infer<typeof OfferResult>[]>(path,array?z.array(OfferResult):WorkResult,{method:'POST',body,key});
    if(identity.current!==actor) throw new ApiFailure('UNAUTHENTICATED');
    requests.current.delete(fingerprint);void refresh();return result;
  }
  return function read(route:MobileRoute):MobileBinding|undefined {
    if(!('projectId'in route)||!screens.includes(route.screen)) return;
    const state={phase:data?'ready' as const:phase,errorCode,refresh:()=>void refresh()};
    if(!data||route.projectId!==loaded?.pid) return {state};
    const owner=data.me.role==='OWNER'; const closed=data.project.status==='CLOSED';
    const active=data.project.status==='ACTIVE';
    const access={title:data.project.title,role:owner?'organizer' as const:'participant' as const,pending:false,draft:data.project.status==='DRAFT',closed};
    const nav=(screen:'task'|'task-editor'|'assign'|'tasks',id?:string)=>router.push(eventPath(route.projectId,screen,id) as Href);
    const task=data.tasks.find(t=>t.id===route.itemId);
    const member=(id:string|null)=>data.members.find(m=>m.id===id)?.nickname??'Unassigned';
    const area=(id:string|null)=>data.areas.find(a=>a.id===id)?.name??'No area';
    const time=(date:string)=>new Intl.DateTimeFormat('en',{dateStyle:'medium',timeStyle:'short',timeZone:data.project.timezone}).format(new Date(date));
    const version={};
    const status=(action:string)=>mutate(`/tasks/${task!.id}/status`,{...version,expected_version:task!.version,action}).then(()=>{});
    if(route.screen==='tasks') return {state,access,view:{screen:'tasks',props:{tasks:data.tasks.map(t=>({key:t.id,title:t.title,statusLabel:t.status,areaLabel:area(t.area_id),assigneeLabel:member(t.assignee_member_id),dueLabel:time(t.due_at),mine:t.assignee_member_id===data.me.id,atRisk:t.risk!=='NONE',unassigned:!t.assignee_member_id,riskLabel:t.risk==='NONE'?undefined:t.risk,onOpen:()=>nav('task',t.id)})),
      onAdd:owner&&active&&!closed?()=>nav('task-editor'):undefined,onSuggest:owner&&active&&!closed?()=>nav('assign'):undefined,onRefresh:()=>void refresh()}}};
    if(route.screen==='task') {
      if(!task) return {state:{...state,phase:'error',errorCode:'NOT_FOUND'},access};
      const assignment=data.my_assignments.find(a=>a.task_id===task.id&&['OFFERED','ACCEPTED'].includes(a.status));
      const actions:TaskDetailActions={};
      if(!closed&&assignment?.status==='OFFERED') {
        const respond=(response:'ACCEPT'|'DECLINE',reason?:string)=>mutate(`/assignments/${assignment.id}/respond`,{...version,expected_version:assignment.version,response,...(reason?{reason}:{})}).then(()=>{});
        actions.onAccept=()=>respond('ACCEPT');actions.onDecline=reason=>respond('DECLINE',reason);
      }
      if(!closed&&assignment?.status==='ACCEPTED') {
        if(task.status==='ACCEPTED') actions.onStart=()=>mutate(`/tasks/${task.id}/start`,{...version,expected_version:task.version}).then(()=>{});
        if(['ACCEPTED','IN_PROGRESS','CHANGES_REQUESTED'].includes(task.status)) actions.onRelease=reason=>mutate(`/assignments/${assignment.id}/release`,{...version,expected_version:assignment.version,reason}).then(()=>{});
      }
      if(owner&&!closed&&!['APPROVED','CANCELLED'].includes(task.status)) {
        actions.onCancel=()=>status('CANCEL');actions.onDefer=()=>status('DEFER');
        if(task.status==='DEFERRED')actions.onReopen=()=>status('REOPEN');
        if(task.assignee_member_id)actions.onRevoke=()=>status('REVOKE');
        if(task.status==='OPEN')actions.onInvite=()=>nav('assign',task.id);
      }
      return {state,access,view:{screen:'task',props:{model:{versionKey:`${task.id}:${task.version}:${data.project.state_version}`,title:task.title,description:task.description,statusLabel:task.status,areaLabel:area(task.area_id),assigneeLabel:member(task.assignee_member_id),dueLabel:time(task.due_at),riskReasons:task.risk_reasons.map(r=>r.cause),criteria:task.criteria.map(c=>({key:c.id,text:c.description,statusLabel:c.state,critical:c.critical,photoExpected:c.photo_expected})),terminal:['APPROVED','CANCELLED'].includes(task.status),readOnlyReason:closed?'This event is closed.':undefined,
        dependencies:task.depends_on.map(d=>({key:d.task_id,title:data.tasks.find(t=>t.id===d.task_id)?.title??d.task_id,relationLabel:d.kind,detail:data.tasks.find(t=>t.id===d.task_id)?.status??'',onOpen:()=>nav('task',d.task_id)})),resources:task.needs.map((n,i)=>({key:String(i),title:data.resources.find(r=>r.id===n.resource_id)?.name??n.category??'',detail:n.hard?'Required':'Optional',onOpen:()=>router.push(eventPath(route.projectId,'resources') as Href)})),history:[],submissions:[],releaseReasons:[{key:'UNAVAILABLE',label:'I am unavailable'},{key:'OTHER',label:'Other reason'}]},actions}}};
    }
    if(route.screen==='task-editor') return {state,access,view:{screen:'task-editor',props:{versionKey:`new:${data.project.state_version}`,title:'Add task',currencyLabel:data.project.currency,
      initial:{titleInput:'',descriptionInput:'',areaKey:'',roleRequired:false,startsInput:'',dueInput:data.project.ends_at,durationInput:'30',stipendInput:'',critical:false,hardDeadline:false,criteria:[{key:'1',textInput:'',critical:true,photoExpected:false}],dependencies:[],resources:[]},
      areas:[{key:'',label:'No area'},...data.areas.map(a=>({key:a.id,label:a.name}))],roles:data.project.role_tags.map(r=>({key:r,label:r})),dependencies:data.tasks.map(t=>({key:t.id,label:t.title})),resources:data.resources.map(r=>({key:r.id,label:r.name})),
      limits:{titleMin:LIMITS.TASK_TITLE.min,titleMax:LIMITS.TASK_TITLE.max,descriptionMax:LIMITS.TASK_DESCRIPTION_MAX,criterionMax:LIMITS.CRITERION_MAX,criteriaMax:LIMITS.CRITERIA_PER_TASK.max},canEdit:owner&&active&&!closed,
      onSave:async draft=>{
        const body=CreateTaskBody.safeParse({...version,title:draft.titleInput,description:draft.descriptionInput,area_id:draft.areaKey||null,role_tag:draft.roleKey||null,role_required:draft.roleRequired,start_at:draft.startsInput?new Date(draft.startsInput).toISOString():null,due_at:new Date(draft.dueInput).toISOString(),hard_deadline:draft.hardDeadline,estimated_minutes:Number(draft.durationInput),critical:draft.critical,stipend_amount:draft.stipendInput?Number(draft.stipendInput):null,criteria:draft.criteria.map(c=>({description:c.textInput,critical:c.critical,photo_expected:c.photoExpected})),depends_on:draft.dependencies.map(d=>({task_id:d.key,kind:d.required?'HARD':'SOFT'})),needs:draft.resources.map(r=>({resource_id:r.useCategory?null:r.resourceKey??null,category:r.useCategory?r.categoryInput:null,hard:r.required}))});
        if(!body.success)throw new ApiFailure('VALIDATION_FAILED');
        await mutate(`/projects/${route.projectId}/tasks`,body.data);router.replace(eventPath(route.projectId,'tasks') as Href);
      }}}};
    if(route.screen==='assign') return {state,access,view:{screen:'assign',props:{versionKey:`offers:${data.project.state_version}`,canSend:owner&&active&&!closed,results:offerResults,
      tasks:data.tasks.filter(t=>t.status==='OPEN'&&(!route.itemId||route.itemId===t.id)).map(t=>({key:t.id,title:t.title,dueLabel:time(t.due_at),respondByLabel:'30 minutes after sending',members:data.members.filter(m=>m.presence!=='UNAVAILABLE'&&(!t.role_required||m.role_tags.includes(t.role_tag??''))).map(m=>({key:m.id,name:m.nickname,reason:'Availability and assignment limits are checked when sending.'}))})),
      onSend:async selections=>{const result=await mutate(`/projects/${route.projectId}/offers`,{...version,offers:selections.map(s=>({task_id:s.taskKey,member_id:s.memberKey}))},true);
        if(!Array.isArray(result))throw new ApiFailure('INTERNAL');
        setOfferState({pid:route.projectId,userId:userId!,items:result.map(r=>({taskKey:r.task_id,taskTitle:data.tasks.find(t=>t.id===r.task_id)?.title??'',memberKey:selections.find(s=>s.taskKey===r.task_id)?.memberKey??'',memberLabel:member(selections.find(s=>s.taskKey===r.task_id)?.memberKey??null),sent:r.error===null,errorMessage:r.error??undefined}))});},onRefresh:()=>void refresh()}}};
    if(route.screen==='offer') {
      const assignment=data.my_assignments.find(a=>a.id===route.itemId);
      const offered=data.tasks.find(t=>t.id===assignment?.task_id);
      if(!assignment||!offered)return {state:{...state,phase:'error',errorCode:'NOT_FOUND'},access};
      const respond=(response:'ACCEPT'|'DECLINE')=>mutate(`/assignments/${assignment.id}/respond`,{...version,expected_version:assignment.version,response}).then(()=>{});
      return {state,access,view:{screen:'offer',props:{model:{title:offered.title,detail:offered.description,criteria:offered.criteria.map(c=>c.description),dueLabel:time(offered.due_at),respondByLabel:time(assignment.respond_by),open:!closed&&assignment.status==='OFFERED',expiresAt:assignment.respond_by,versionKey:`${assignment.id}:${assignment.version}`},onAccept:()=>respond('ACCEPT'),onDecline:()=>respond('DECLINE')}}};
    }
  };
}
