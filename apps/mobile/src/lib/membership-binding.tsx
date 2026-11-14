import {useEffect, useRef, useState} from 'react';
import {router} from 'expo-router';
import * as Crypto from 'expo-crypto';
import type {MobileBinding} from '@/features/navigation/presentation';
import {eventPath, type MobileRoute} from '@/features/navigation/routes';
import type {EditableProfile} from '@/features/onboarding/shared';
import {onboardingEn} from '@/strings/en';
import {Join, JoinBody, ResolveInvite, LeaveProject, type ResolveInviteData} from '../../../../packages/contracts/src/api/membership';
import type {MeData} from './contracts';
import {ApiClient, ApiFailure} from './api-client';
import {localToUtc} from './event-time';

type Options = {api: ApiClient; userId?: string; me?: MeData; refreshMe: () => Promise<void>};
export function useMembershipBinding(options: Options) {
  const {api,userId,me,refreshMe} = options;
  const [resolved,setResolved] = useState<{code:string;data:ResolveInviteData;user:string}>();
  const [consent,setConsent] = useState(false);
  const actor = useRef(userId);
  useEffect(() => {actor.current=userId; return () => {actor.current=undefined;};},[userId]);
  const requests = useRef(new Map<string,string>());
  const mutate = async <T,>(path:string,schema:import('zod').z.ZodType<T>,body:unknown) => {
    const current=actor.current;
    const identity=JSON.stringify({current,path,body});
    let key=requests.current.get(identity);
    if(!key) {key=Crypto.randomUUID();requests.current.set(identity,key);}
    try {
      const result=await api.request(path,schema,{method:'POST',body,key});
      if(current!==actor.current) throw new ApiFailure('UNAUTHENTICATED');
      requests.current.delete(identity);
      return result;
    } catch(error) {
      // Preserve uncertain writes for retry; a definite rejection can use a new key.
      if(error instanceof ApiFailure && !['NETWORK_ERROR','INTERNAL'].includes(error.code)) requests.current.delete(identity);
      throw error;
    }
  };
  return {
    read(route:MobileRoute): MobileBinding | undefined {
      const ready={phase:'ready' as const,refresh:()=>void refreshMe()};
      const invite=resolved?.user===userId ? resolved : undefined;
      const summary=invite && {eventName:invite.data.project_title,organizerName:invite.data.organizer_nickname,
        consentVersion:invite.data.consent_version,timezone:invite.data.timezone};
      if(route.screen==='join-code') return {state:ready,view:{screen:'join-code',props:{initialCode:route.code,
        invite:summary,onResolve:async code=>{
          const current=actor.current;
          const data=await mutate('/invites/resolve',ResolveInvite.data,{code});
          if(!current || current!==actor.current) throw new ApiFailure('UNAUTHENTICATED');
          setResolved({code,data,user:current});setConsent(false);
        },onContinue:()=>{if(summary)router.push('/join/consent');}}}};
      if(route.screen==='join-consent' || route.screen==='join-profile') {
        if(!invite || !summary) return {state:{phase:'error',errorCode:'INVITE_INVALID',refresh:()=>router.replace('/join')}};
        if(route.screen==='join-consent') return {state:ready,view:{screen:'join-consent',props:{invite:summary,
          onContinue:()=>{setConsent(true);router.push('/join/profile');}}}};
        return {state:ready,view:{screen:'join-profile',props:{invite:summary,consentAccepted:consent,
          roles:[...invite.data.role_tags.map(tag=>({key:tag,label:tag})),{key:'__other__',label:onboardingEn.otherRole}],
          initialProfile:{nickname:'',roleKeys:[],wholeEvent:true,windows:[]},
          onJoin:async(profile:EditableProfile,consentVersion:string)=>{
            if(!consent)throw new ApiFailure('VALIDATION_FAILED');
            const body=JoinBody.parse({code:invite.code,nickname:profile.nickname,
              role_tags:profile.roleKeys.filter(key=>key!=='__other__'),consent_version:consentVersion,
              availability:profile.wholeEvent?{whole_event:true}:{windows:profile.windows.map(window=>({
                from:localToUtc(window.start,invite.data.timezone),to:localToUtc(window.end,invite.data.timezone)}))}});
            const result=await mutate('/invites/join',Join.data,body);
            await refreshMe();
            router.replace(eventPath(result.project_id,result.member.status==='PENDING'?'waiting':'home'));
          }}}};
      }
      if(route.screen==='waiting' && 'projectId' in route) {
        const membership=me?.memberships.find(m=>m.project.id===route.projectId);
        if(!membership)return undefined;
        return {state:ready,access:{title:membership.project.title,role:'participant',pending:membership.status==='PENDING',draft:membership.project.status==='DRAFT',closed:membership.project.status==='CLOSED'},
          view:{screen:'waiting',props:{eventName:membership.project.title,onCancel:async()=>{
            await mutate(`/projects/${route.projectId}/leave`,LeaveProject.data,{});await refreshMe();router.replace('/events');
          }}}};
      }
    },
  };
}
export function readMembership(route:MobileRoute,context:ReturnType<typeof useMembershipBinding>):MobileBinding|undefined {
  return context.read(route);
}
