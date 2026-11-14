import {createClient, processLock} from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import {Platform} from 'react-native';
import {sessionStorage} from './session-storage';
import {ApiFailure} from './api-client';

WebBrowser.maybeCompleteAuthSession();
export const connection = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  key: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  api: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
};
const configured = !!connection.url && !!connection.key && !!connection.api;
export const authClient = configured ? createClient(connection.url, connection.key, {
  auth: {storage: sessionStorage, persistSession: true, autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web', flowType: 'pkce', ...(Platform.OS === 'web' ? {} : {lock: processLock})},
}) : null;

export async function googleSignIn(next?: 'join', invite?: string) {
  if (!authClient) throw new ApiFailure('SERVICE_UNAVAILABLE');
  const redirectTo = (Platform.OS === 'web' ? `${window.location.origin}/auth/callback` : 'weave://auth/callback') +
    (next === 'join' ? `?next=join${invite && /^[A-Z2-9]{6}$/.test(invite) ? `&invite=${invite}` : ''}` : '');
  const {data, error} = await authClient.auth.signInWithOAuth({provider: 'google', options: {
    redirectTo, skipBrowserRedirect: Platform.OS !== 'web',
  }});
  if (error || !data.url) throw new ApiFailure('AUTH_UNAVAILABLE');
  if (Platform.OS === 'web') return;
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') throw new ApiFailure('AUTH_CANCELLED');
  const callback = new URL(result.url);
  if (callback.protocol !== 'weave:' || callback.hostname !== 'auth' || callback.pathname !== '/callback') throw new ApiFailure('UNAUTHENTICATED');
  const code = callback.searchParams.get('code');
  if (!code) throw new ApiFailure('AUTH_UNAVAILABLE');
  const exchange = await authClient.auth.exchangeCodeForSession(code);
  if (exchange.error || !exchange.data.session) throw new ApiFailure('UNAUTHENTICATED');
}
