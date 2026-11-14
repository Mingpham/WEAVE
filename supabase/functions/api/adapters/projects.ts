import { CreateProjectData, CreateProjectResponse, ERROR_HTTP_STATUS } from '../contracts.ts';
import type { ErrorCode } from '../contracts.ts';
import { ApiError } from '../lib/errors.ts';
import type { ProjectRepository } from '../ports.ts';
import { userClient, type SupabaseConfig } from './supabase.ts';

export function supabaseProjects(cfg: SupabaseConfig): ProjectRepository {
  return {
    async create(user, body, key) {
      const db = userClient(cfg, user.jwt);
      // Never elevate this call: the RPC derives auth.uid() and verifies Google identity.
      const result = await db.rpc('create_project', { p_request: body, p_idempotency_key: key });
      if (result.error) {
        const code = result.error.message;
        if (Object.hasOwn(ERROR_HTTP_STATUS, code)) throw new ApiError(code as ErrorCode);
        throw new ApiError('INTERNAL');
      }
      const envelope = CreateProjectResponse.parse(result.data);
      const projectId = envelope.data.project_id;
      const [project, member] = await Promise.all([
        db
          .from('projects')
          .select(
            'id,title,brief,status,venue_name,starts_at,ends_at,timezone,expected_team_size,expected_attendees,currency,state_version,role_tags,settings,closed_at',
          )
          .eq('id', projectId)
          .is('deleted_at', null)
          .single(),
        db
          .from('members')
          .select(
            'id,nickname,role,role_tags,presence,current_area_id,status,availability,consent_at,consent_version,version',
          )
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .eq('id', envelope.data.owner_member_id)
          .single(),
      ]);
      if (project.error || member.error) throw new ApiError('INTERNAL');
      // Return the public API read model while preserving the DB RPC contract.
      const data = CreateProjectData.parse({
        project: {
          ...project.data,
          starts_at: new Date(project.data.starts_at).toISOString(),
          ends_at: new Date(project.data.ends_at).toISOString(),
          closed_at: project.data.closed_at ? new Date(project.data.closed_at).toISOString() : null,
          owner_nickname: member.data.nickname,
        },
        me: {
          ...member.data,
          consent_at: member.data.consent_at
            ? new Date(member.data.consent_at).toISOString()
            : null,
        },
      });
      return { data, stateVersion: envelope.meta.state_version };
    },
  };
}
