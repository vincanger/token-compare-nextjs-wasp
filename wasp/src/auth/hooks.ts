import type { OnAfterSignupHook } from 'wasp/server/auth'

export const onAfterSignup: OnAfterSignupHook = async ({
  providerId,
  user,
  prisma,
}) => {
  const email = providerId.providerUserId

  const team = await prisma.team.create({
    data: { name: `${email}'s Team` },
  })

  await prisma.teamMember.create({
    data: {
      userId: user.id,
      teamId: team.id,
      role: 'owner',
    },
  })

  await prisma.activityLog.create({
    data: {
      teamId: team.id,
      userId: user.id,
      action: 'SIGN_UP',
    },
  })
}
