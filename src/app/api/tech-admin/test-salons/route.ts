import { NextResponse } from 'next/server'
import { canProvisionTestSalon } from '@/domain/tech-admin/testSalonProvisioning'
import { apiErrorResponse } from '@/lib/api'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'
import { CreateTestSalonSchema } from '@/schemas/techAdmin'
import { sendTestStaffActivationEmail } from '@/services/testStaffActivationEmail.service'
import { provisionTestSalon } from '@/services/testSalonProvisioning.service'

export async function POST(request: Request) {
  if (!canProvisionTestSalon({
    vercelEnvironment: process.env.VERCEL_ENV,
    gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF,
  })) {
    return NextResponse.json({
      error: 'La création d’un salon de test est réservée à la préproduction sur la branche preprod.',
    }, { status: 404 })
  }

  let access: Awaited<ReturnType<typeof getTestCampaignAdminAccess>>
  try {
    access = await getTestCampaignAdminAccess()
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
  if (!access.authorized) {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs techniques.' }, { status: access.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 })
  }
  const parsed = CreateTestSalonSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Les données de création sont invalides.' }, { status: 400 })
  }

  try {
    const salon = await provisionTestSalon({
      email: parsed.data.email,
      role: parsed.data.role,
    })
    const invitation = await sendTestStaffActivationEmail({
      email: salon.staffAccount.email,
      salonName: salon.name,
    })
    return NextResponse.json({ ...salon, invitation }, {
      status: 201,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}
