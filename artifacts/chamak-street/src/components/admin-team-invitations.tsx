import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateAdminInvitation, useListAdminInvitations, useRevokeAdminInvitation,
  getListAdminInvitationsQueryKey,
  type AdminInvitationInput,
} from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Copy, Link2, ShieldCheck } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const PERMISSIONS = ["products", "orders", "content", "support", "customers", "discounts", "analytics", "notifications", "settings"] as const;
const INVITATION_MESSAGE = "You're invited to join the Imaginate admins. Press this link to join!";
const button = "inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/10 disabled:opacity-40";
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "The request failed. Please try again.";

export default function AdminTeamInvitations({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const qc = useQueryClient();
  const [permissions, setPermissions] = useState<AdminInvitationInput["permissions"]>([]);
  const [created, setCreated] = useState<{ link: string; expiresAt: string } | null>(null);
  const [copyState, setCopyState] = useState("");
  const create = useCreateAdminInvitation();
  const revoke = useRevokeAdminInvitation();
  const invitations = useListAdminInvitations({ query: { queryKey: getListAdminInvitationsQueryKey(), staleTime: 0, refetchInterval: 5_000 } });
  const invalidate = () => qc.invalidateQueries({ queryKey: getListAdminInvitationsQueryKey() });
  const generate = async () => {
    try {
      const result = await create.mutateAsync({ data: { permissions } });
      setCreated({ link: `${window.location.origin}${BASE}/api/admin-invite.html#${result.token}`, expiresAt: result.expiresAt });
      setCopyState("");
      await invalidate();
    } catch { /* The mutation error is displayed below. */ }
  };
  const copy = async (message: boolean) => {
    if (!created) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard is unavailable");
      await navigator.clipboard.writeText(message ? `${INVITATION_MESSAGE}\n\n${created.link}` : created.link);
      setCopyState(message ? "Invitation message and link copied." : "Link copied.");
    } catch { setCopyState("Copying is unavailable here. Select the link below and copy it manually."); }
  };
  const changeOpen = (next: boolean) => {
    if (!next && create.isPending) return;
    if (!next) { setCreated(null); setPermissions([]); setCopyState(""); create.reset(); }
    onOpenChange(next);
  };
  return <>
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto border-primary/30 bg-[#0d0b13] text-white sm:max-w-lg" data-testid="dialog-team-invite">
        <DialogHeader>
          <DialogTitle>Invite an admin</DialogTitle>
          <DialogDescription>Only the owner can invite team members. Links are single-use and expire in seven days.</DialogDescription>
        </DialogHeader>
        {created ? <div className="space-y-5">
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 text-center">
            <img src={`${BASE}/imaginate-logo.png`} alt="IMAGINATE" className="mx-auto mb-4 w-36 object-contain" />
            <p className="font-semibold">{INVITATION_MESSAGE}</p>
          </div>
          <label className="block space-y-2 text-sm">
            <span>Invitation link</span>
            <input readOnly value={created.link} onFocus={event => event.currentTarget.select()} className="w-full rounded-xl border border-white/15 bg-black/30 p-3 text-xs text-white" data-testid="input-admin-invitation-link" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className={`${button} bg-primary/20`} onClick={() => void copy(false)} data-testid="button-copy-invitation-link"><Copy className="h-4 w-4" />Copy link</button>
            <button className={button} onClick={() => void copy(true)} data-testid="button-copy-invitation-message">Copy message + link</button>
          </div>
          {copyState && <p role="status" className="text-sm text-primary" data-testid="status-invitation-copy">{copyState}</p>}
          <p className="text-xs text-white/55">Expires {new Date(created.expiresAt).toLocaleString()}. Anyone with this link can claim the selected access once; send it only to the intended person.</p>
          {window.location.hostname.endsWith(".replit.dev") && <p className="rounded-xl border border-primary/20 p-3 text-xs text-white/65">This is a preview link and may require Replit access. Publish the app, then create invitations from the published site to share them publicly.</p>}
          <button className={button} onClick={() => changeOpen(false)} data-testid="button-invitation-done">Done</button>
        </div> : <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 p-3 text-sm"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" />They choose their own username and password. This never grants owner access.</div>
          <fieldset>
            <legend className="mb-3 text-sm font-semibold">Choose permissions</legend>
            <div className="grid grid-cols-2 gap-3">
              {PERMISSIONS.map(permission => <label key={permission} className="flex items-center gap-2 rounded-xl border border-white/10 p-3 text-sm capitalize">
                <input type="checkbox" checked={permissions.includes(permission)} disabled={create.isPending} onChange={() => setPermissions(current => current.includes(permission) ? current.filter(value => value !== permission) : [...current, permission])} className="accent-primary" data-testid={`checkbox-invite-${permission}`} />{permission}
              </label>)}
            </div>
            <p className="mt-3 text-xs text-white/50">All admins can use team chat. Unchecked areas remain restricted.</p>
          </fieldset>
          {create.isError && <p role="alert" className="text-sm text-red-300">{errorMessage(create.error)}</p>}
          <button className={`${button} w-full bg-primary/20`} disabled={create.isPending} onClick={() => void generate()} data-testid="button-create-admin-invitation"><Link2 className="h-4 w-4" />{create.isPending ? "Creating…" : "Create invitation link"}</button>
        </div>}
      </DialogContent>
    </Dialog>
    <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4" aria-label="Team invitations">
      <h2 className="mb-3 font-semibold">Invitations</h2>
      {invitations.isLoading ? <p className="text-sm text-white/50">Loading invitations…</p> : invitations.isError ? <div><p role="alert" className="text-sm text-red-300">{errorMessage(invitations.error)}</p><button className={button} onClick={() => void invitations.refetch()} data-testid="button-invitations-retry">Try again</button></div> : !invitations.data?.length ? <p className="text-sm text-white/50">No invitations yet. Use + Add to invite someone.</p> : <ul className="divide-y divide-white/10">
        {invitations.data.map(invite => <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3" data-testid={`row-invitation-${invite.id}`}>
          <div><p className="text-sm capitalize" data-testid={`status-invitation-${invite.id}`}>{invite.status}</p><p className="mt-1 text-xs text-white/50">{invite.permissions.length ? invite.permissions.join(", ") : "Team chat only"} · Expires {new Date(invite.expiresAt).toLocaleDateString()}</p></div>
          {invite.status === "pending" && <button className={button} disabled={revoke.isPending} onClick={() => { if (window.confirm("Revoke this invitation? The link will stop working.")) revoke.mutate({ id: invite.id }, { onSuccess: () => void invalidate() }); }} data-testid={`button-revoke-invitation-${invite.id}`}>Revoke</button>}
        </li>)}
      </ul>}
      {revoke.isError && <p role="alert" className="text-sm text-red-300">{errorMessage(revoke.error)}</p>}
    </section>
  </>;
}
