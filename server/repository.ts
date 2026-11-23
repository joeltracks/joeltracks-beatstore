import { createClient } from '@supabase/supabase-js';

export interface OrderFile { id: string; name: string; type: string; key: string; }
export interface AccessOrder {
  id: string; reference: string; currency: string; totalCents: number; paidAt: string;
  items: { title: string; license: string }[]; files: OrderFile[];
}
export interface MailJob { id: string; payload: string; attempts: number; }
export interface Repository {
  request(input: { reference: string; email: string; tokenHash: string; payload: string; ipHash: string; emailHash: string }): Promise<void>;
  exchange(tokenHash: string, sessionHash: string): Promise<boolean>;
  order(sessionHash: string): Promise<AccessOrder | null>;
  revoke(sessionHash: string): Promise<void>;
  claimMail(): Promise<MailJob | null>;
  completeMail(id: string): Promise<void>;
  failMail(id: string): Promise<void>;
}
export function createRepository(url: string, secret: string): Repository {
  const client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  async function rpc<T>(name: string, params: Record<string, unknown> = {}): Promise<T> {
    const { data, error } = await client.rpc(name, params);
    if (error) throw new Error('DATABASE_UNAVAILABLE');
    return data as T;
  }
  return {
    request: input => rpc('jt_request_order_access', {
      p_reference: input.reference, p_email: input.email, p_token_hash: input.tokenHash,
      p_payload: input.payload, p_ip_hash: input.ipHash, p_email_hash: input.emailHash
    }),
    exchange: (tokenHash, sessionHash) => rpc('jt_exchange_order_access', { p_token_hash: tokenHash, p_session_hash: sessionHash }),
    order: sessionHash => rpc('jt_get_access_order', { p_session_hash: sessionHash }),
    revoke: sessionHash => rpc('jt_revoke_access_session', { p_session_hash: sessionHash }),
    claimMail: () => rpc('jt_claim_access_email'),
    completeMail: id => rpc('jt_complete_access_email', { p_id: id }),
    failMail: id => rpc('jt_fail_access_email', { p_id: id })
  };
}
