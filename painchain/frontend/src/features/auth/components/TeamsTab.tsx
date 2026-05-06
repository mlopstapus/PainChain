import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useInvitations } from '../hooks/useInvitations';
import type { TeamMember, Invitation } from '../types/auth.types';

// Format relative date
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return 'Expired';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days} days`;
}

// Role Select Component
function RoleSelect({
  value,
  onChange,
  disabled,
  excludeOwner = false,
}: {
  value: string;
  onChange: (role: string) => void;
  disabled?: boolean;
  excludeOwner?: boolean;
}) {
  const roles = excludeOwner
    ? ['admin', 'member', 'viewer']
    : ['owner', 'admin', 'member', 'viewer'];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="role-select"
    >
      {roles.map((role) => (
        <option key={role} value={role}>
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </option>
      ))}
    </select>
  );
}

// Team Member Row Component
function TeamMemberRow({
  member,
  currentUser,
  canManage,
  onUpdateRole,
}: {
  member: TeamMember;
  currentUser: { id: string; role: string } | null;
  canManage: boolean;
  onUpdateRole: (userId: string, role: string) => Promise<void>;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const isCurrentUser = member.id === currentUser?.id;
  const isOwner = member.role === 'owner';

  const handleRoleChange = async (newRole: string) => {
    setIsUpdating(true);
    try {
      await onUpdateRole(member.id, newRole);
    } catch (err) {
      alert(`Failed to update role: ${(err as Error).message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="team-member-row">
      <div className="member-info">
        <div className="member-avatar">
          {member.avatarUrl ? (
            <img src={member.avatarUrl} alt={member.displayName || ''} />
          ) : (
            <span>
              {(member.displayName || member.email).charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="member-details">
          <span className="member-name">
            {member.displayName || member.email.split('@')[0]}
            {isCurrentUser && <span className="you-badge">(you)</span>}
          </span>
          <span className="member-email">{member.email}</span>
        </div>
      </div>

      <div className="member-role">
        {canManage && !isOwner && !isCurrentUser ? (
          <RoleSelect
            value={member.role}
            onChange={handleRoleChange}
            disabled={isUpdating}
            excludeOwner
          />
        ) : (
          <span className={`role-badge role-${member.role}`}>
            {member.role}
          </span>
        )}
      </div>
    </div>
  );
}

// Invitation Row Component
function InvitationRow({
  invitation,
  onRevoke,
}: {
  invitation: Invitation;
  onRevoke: (token: string) => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const inviteUrl = `${window.location.origin}/register?invite=${invitation.token}`;
  const isExpired = new Date(invitation.expiresAt) < new Date();
  const isExhausted = invitation.useCount >= invitation.maxUses;
  const isInvalid = isExpired || isExhausted || invitation.isRevoked;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = inviteUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      await onRevoke(invitation.token);
    } catch (err) {
      alert(`Failed to revoke invitation: ${(err as Error).message}`);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className={`invitation-row ${isInvalid ? 'expired' : ''}`}>
      <div className="invite-info">
        <span className={`role-badge role-${invitation.role}`}>
          {invitation.role}
        </span>
        <span className="invite-expiry">
          {invitation.isRevoked
            ? 'Revoked'
            : isExpired
            ? 'Expired'
            : `Expires ${formatRelativeDate(invitation.expiresAt)}`}
        </span>
        <span className="invite-uses">
          {invitation.useCount} / {invitation.maxUses} uses
        </span>
      </div>

      <div className="invite-actions">
        <button
          className="btn-secondary btn-sm"
          onClick={handleCopy}
          disabled={isInvalid}
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
        {!invitation.isRevoked && (
          <button
            className="btn-delete btn-sm"
            onClick={handleRevoke}
            disabled={isRevoking}
          >
            {isRevoking ? 'Revoking...' : 'Revoke'}
          </button>
        )}
      </div>
    </div>
  );
}

// Create Invite Modal Component
function CreateInviteModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (url: string) => void;
}) {
  const { createInvitation } = useInvitations();
  const [role, setRole] = useState('member');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [maxUses, setMaxUses] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const invitation = await createInvitation({ role, expiresInDays, maxUses });
      const url = invitation.inviteUrl || `${window.location.origin}/register?invite=${invitation.token}`;
      setCreatedUrl(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAndClose = async () => {
    if (createdUrl) {
      try {
        await navigator.clipboard.writeText(createdUrl);
      } catch {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = createdUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      onCreated(createdUrl);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Invitation Link</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {createdUrl ? (
            <>
              <p style={{ color: '#c9d1d9', marginBottom: '16px' }}>
                Invitation created! Share this link:
              </p>
              <div className="invite-url-box">
                <input type="text" value={createdUrl} readOnly />
              </div>
              <button className="btn-primary btn-full" onClick={handleCopyAndClose}>
                Copy Link & Close
              </button>
            </>
          ) : (
            <>
              {error && (
                <div style={{
                  background: 'rgba(248, 81, 73, 0.1)',
                  border: '1px solid rgba(248, 81, 73, 0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#f85149',
                  marginBottom: '16px',
                  fontSize: '0.9rem',
                }}>
                  {error}
                </div>
              )}

              <div className="form-group">
                <label>Role</label>
                <RoleSelect value={role} onChange={setRole} excludeOwner />
                <p className="form-help">
                  The role assigned to users who join with this link
                </p>
              </div>

              <div className="form-group">
                <label>Expires In</label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                >
                  <option value={1}>1 day</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>

              <div className="form-group">
                <label>Max Uses</label>
                <select
                  value={maxUses}
                  onChange={(e) => setMaxUses(Number(e.target.value))}
                >
                  <option value={1}>Single use</option>
                  <option value={5}>5 uses</option>
                  <option value={10}>10 uses</option>
                  <option value={100}>Unlimited (100)</option>
                </select>
              </div>

              <button
                className="btn-primary btn-full"
                onClick={handleCreate}
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Invitation'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Teams Tab Component
export function TeamsTab() {
  const { user } = useAuth();
  const { members, loading: membersLoading, updateRole } = useTeamMembers();
  const { invitations, loading: invitesLoading, revokeInvitation, refetch: refetchInvites } = useInvitations();
  const [showInviteModal, setShowInviteModal] = useState(false);

  const canManageTeam = user && ['owner', 'admin'].includes(user.role);

  const handleInviteCreated = () => {
    refetchInvites();
    setShowInviteModal(false);
  };

  return (
    <>
      {/* Header */}
      <div className="settings-header">
        <div>
          <h1>Team</h1>
          <p>Manage team members and invitations</p>
        </div>
        {canManageTeam && (
          <button className="btn-primary" onClick={() => setShowInviteModal(true)}>
            + Invite Team Member
          </button>
        )}
      </div>

      {/* Team Members Section */}
      <div className="teams-section">
        <h2 className="teams-section-title">
          Team Members
          <span className="teams-count">{members.length}</span>
        </h2>

        <div className="team-member-list">
          {membersLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#808080' }}>
              Loading...
            </div>
          ) : members.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#808080' }}>
              No team members found
            </div>
          ) : (
            members.map((member) => (
              <TeamMemberRow
                key={member.id}
                member={member}
                currentUser={user ? { id: user.id, role: user.role } : null}
                canManage={!!canManageTeam}
                onUpdateRole={updateRole}
              />
            ))
          )}
        </div>
      </div>

      {/* Invitations Section (only for owners/admins) */}
      {canManageTeam && (
        <div className="teams-section">
          <h2 className="teams-section-title">
            Active Invitations
            <span className="teams-count">
              {invitations.filter((i) => !i.isRevoked && new Date(i.expiresAt) > new Date()).length}
            </span>
          </h2>

          <div className="invitation-list">
            {invitesLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#808080' }}>
                Loading...
              </div>
            ) : invitations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#808080' }}>
                No invitations yet. Create one to invite team members.
              </div>
            ) : (
              invitations.map((invitation) => (
                <InvitationRow
                  key={invitation.id}
                  invitation={invitation}
                  onRevoke={revokeInvitation}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Create Invite Modal */}
      {showInviteModal && (
        <CreateInviteModal
          onClose={() => setShowInviteModal(false)}
          onCreated={handleInviteCreated}
        />
      )}
    </>
  );
}
