import type { OnAfterSignupHook, OnAfterLoginHook } from 'wasp/server/auth'

export const onAfterSignup: OnAfterSignupHook = async ({
  providerId,
  user,
  prisma,
}) => {
  const email = providerId.providerUserId

  // Check for a pending invitation for this email
  const invitation = await prisma.invitation.findFirst({
    where: { email, status: 'pending' },
  })

  let teamId: number
  let role: string

  if (invitation) {
    // Accept the invitation: join the existing team
    teamId = invitation.teamId
    role = invitation.role

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    })

    await prisma.activityLog.create({
      data: { teamId, userId: user.id, action: 'ACCEPT_INVITATION' },
    })
  } else {
    // No invitation: create a new team
    const team = await prisma.team.create({
      data: { name: `${email}'s Team` },
    })
    teamId = team.id
    role = 'owner'

    await prisma.activityLog.create({
      data: { teamId, userId: user.id, action: 'CREATE_TEAM' },
    })
  }

  await prisma.teamMember.create({
    data: { userId: user.id, teamId, role },
  })

  await prisma.activityLog.create({
    data: { teamId, userId: user.id, action: 'SIGN_UP' },
  })
}

export const onAfterLogin: OnAfterLoginHook = async ({
  user,
  prisma,
}) => {
  const membership = await prisma.teamMember.findFirst({
    where: { userId: user.id },
    select: { teamId: true },
  })

  if (membership) {
    await prisma.activityLog.create({
      data: {
        teamId: membership.teamId,
        userId: user.id,
        action: 'SIGN_IN',
      },
    })
  }
}
