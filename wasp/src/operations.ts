import type {
  GetTeamForUser,
  GetActivityLogs,
  UpdateAccount,
  DeleteAccount,
  RemoveTeamMember,
  InviteTeamMember,
} from 'wasp/server/operations'
import { HttpError } from 'wasp/server'
import { findAuthIdentity, createProviderId, getProviderDataWithPassword } from 'wasp/server/auth'
import { verifyPassword } from 'wasp/auth/password'
import { z } from 'zod'

// ── Helpers ──────────────────────────────────────────────────

function validated<S extends z.ZodType, Args, Ctx, Result>(
  schema: S,
  fn: (data: z.infer<S>, context: Ctx) => Promise<Result>
): (args: Args, context: Ctx) => Promise<Result> {
  return async (args, context) => {
    const result = schema.safeParse(args)
    if (!result.success) {
      throw new HttpError(400, result.error.errors[0].message)
    }
    return fn(result.data, context)
  }
}

async function getTeamIdForUser(userId: string, entities: any): Promise<number | null> {
  const membership = await entities.TeamMember.findFirst({
    where: { userId },
    select: { teamId: true },
  })
  return membership?.teamId ?? null
}

async function logActivity(
  entities: any,
  teamId: number | null,
  userId: string,
  action: string
) {
  if (!teamId) return
  await entities.ActivityLog.create({
    data: { teamId, userId, action },
  })
}

// ── Queries ──────────────────────────────────────────────────

export const getTeamForUser: GetTeamForUser<void, any> = async (_args, context) => {
  if (!context.user) throw new HttpError(401)

  const membership = await context.entities.TeamMember.findFirst({
    where: { userId: context.user.id },
    include: {
      team: {
        include: {
          teamMembers: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
          invitations: true,
        },
      },
    },
  })

  if (!membership) return null

  const team = membership.team
  const teamMembers = team.teamMembers.map((tm: any) => ({
    ...tm,
    user: {
      ...tm.user,
      email: '', // Email comes from auth identity, not User model
    },
  }))

  return { ...team, teamMembers }
}

export const getActivityLogs: GetActivityLogs<void, any> = async (_args, context) => {
  if (!context.user) throw new HttpError(401)

  return context.entities.ActivityLog.findMany({
    where: { userId: context.user.id },
    orderBy: { timestamp: 'desc' },
    take: 10,
    include: {
      user: { select: { name: true } },
    },
  })
}

// ── Actions ──────────────────────────────────────────────────

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
})

export const updateAccount: UpdateAccount<
  { name: string },
  { success: string }
> = validated(updateAccountSchema, async ({ name }, context) => {
  if (!context.user) throw new HttpError(401)

  const teamId = await getTeamIdForUser(context.user.id, context.entities)

  await context.entities.User.update({
    where: { id: context.user.id },
    data: { name },
  })

  await logActivity(context.entities, teamId, context.user.id, 'UPDATE_ACCOUNT')
  return { success: 'Account updated successfully.' }
})

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100),
})

export const deleteAccount: DeleteAccount<
  { password: string },
  { error?: string }
> = validated(deleteAccountSchema, async ({ password }, context) => {
  if (!context.user) throw new HttpError(401)

  const email = context.user.identities.email?.id
  if (!email) throw new HttpError(400, 'No email identity found')

  const providerId = createProviderId('email', email)
  const identity = await findAuthIdentity(providerId)
  if (!identity) throw new HttpError(400, 'No email identity found')

  const providerData = getProviderDataWithPassword<'email'>(identity.providerData)

  try {
    await verifyPassword(providerData.hashedPassword, password)
  } catch {
    return { error: 'Incorrect password. Account deletion failed.' }
  }

  const teamId = await getTeamIdForUser(context.user.id, context.entities)

  await logActivity(context.entities, teamId, context.user.id, 'DELETE_ACCOUNT')

  await context.entities.User.update({
    where: { id: context.user.id },
    data: { deletedAt: new Date() },
  })

  if (teamId) {
    await context.entities.TeamMember.deleteMany({
      where: { userId: context.user.id, teamId },
    })
  }

  return {}
})

const removeTeamMemberSchema = z.object({
  memberId: z.number(),
})

export const removeTeamMember: RemoveTeamMember<
  { memberId: number },
  { success?: string; error?: string }
> = validated(removeTeamMemberSchema, async ({ memberId }, context) => {
  if (!context.user) throw new HttpError(401)

  const teamId = await getTeamIdForUser(context.user.id, context.entities)
  if (!teamId) return { error: 'User is not part of a team' }

  await context.entities.TeamMember.delete({
    where: { id: memberId, teamId },
  })

  await logActivity(context.entities, teamId, context.user.id, 'REMOVE_TEAM_MEMBER')
  return { success: 'Team member removed successfully' }
})

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'owner']),
})

export const inviteTeamMember: InviteTeamMember<
  { email: string; role: string },
  { success?: string; error?: string }
> = validated(inviteTeamMemberSchema, async ({ email, role }, context) => {
  if (!context.user) throw new HttpError(401)

  const teamId = await getTeamIdForUser(context.user.id, context.entities)
  if (!teamId) return { error: 'User is not part of a team' }

  const existingInvitation = await context.entities.Invitation.findFirst({
    where: { email, teamId, status: 'pending' },
  })

  if (existingInvitation) {
    return { error: 'An invitation has already been sent to this email' }
  }

  await context.entities.Invitation.create({
    data: {
      email,
      role,
      teamId,
      invitedById: context.user.id,
      status: 'pending',
    },
  })

  await logActivity(context.entities, teamId, context.user.id, 'INVITE_TEAM_MEMBER')
  return { success: 'Invitation sent successfully' }
})
