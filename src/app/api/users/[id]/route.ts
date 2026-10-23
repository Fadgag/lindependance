import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiErrorResponse } from '@/lib/api'
import { getOrganizationAdminAccess } from '@/lib/organizationAdminAccess'
import { UpdateOrganizationAccountSchema } from '@/schemas/userAccounts'
import {
  deleteOrganizationAccount,
  updateOrganizationAccountRole,
} from '@/services/userAccounts.service'

type UserRouteContext = {
  params: Promise<{ id: string }>
}

const PRIVATE_NO_STORE = { 'Cache-Control': 'private, no-store' }

function mutationError(kind: 'not_found' | 'self' | 'privileged_account' | 'last_admin') {
  if (kind === 'not_found' || kind === 'privileged_account') {
    return NextResponse.json({ error: 'Ce compte est introuvable dans votre salon.' }, { status: 404 })
  }
  if (kind === 'self') {
    return NextResponse.json({ error: 'Vous ne pouvez pas modifier votre propre compte.' }, { status: 409 })
  }
  return NextResponse.json({
    error: 'Le dernier administrateur du salon ne peut pas être supprimé ni rétrogradé.',
  }, { status: 409 })
}

function actorAccessError() {
  return NextResponse.json({ error: 'Accès réservé aux administrateurs du salon.' }, { status: 403 })
}

function validAccountId(value: string): string | null {
  const parsed = z.string().trim().min(1).max(128).safeParse(value)
  return parsed.success ? parsed.data : null
}

export async function PATCH(request: Request, context: UserRouteContext) {
  try {
    const access = await getOrganizationAdminAccess()
    if (!access.authorized) {
      return NextResponse.json(
        { error: access.status === 401 ? 'Unauthorized' : 'Forbidden' },
        { status: access.status },
      )
    }

    const accountId = validAccountId((await context.params).id)
    if (!accountId) return NextResponse.json({ error: 'Identifiant de compte invalide.' }, { status: 400 })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 })
    }
    const parsed = UpdateOrganizationAccountSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Le rôle de compte est invalide.' }, { status: 400 })
    }

    const result = await updateOrganizationAccountRole({
      actorId: access.userId,
      organizationId: access.organizationId,
      accountId,
      role: parsed.data.role,
    })
    switch (result.kind) {
      case 'updated':
        return NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE })
      case 'deleted':
        return NextResponse.json({ error: 'Résultat de modification invalide.' }, { status: 500 })
      case 'actor_forbidden':
        return actorAccessError()
      default:
        return mutationError(result.kind)
    }
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

export async function DELETE(_request: Request, context: UserRouteContext) {
  try {
    const access = await getOrganizationAdminAccess()
    if (!access.authorized) {
      return NextResponse.json(
        { error: access.status === 401 ? 'Unauthorized' : 'Forbidden' },
        { status: access.status },
      )
    }

    const accountId = validAccountId((await context.params).id)
    if (!accountId) return NextResponse.json({ error: 'Identifiant de compte invalide.' }, { status: 400 })

    const result = await deleteOrganizationAccount({
      actorId: access.userId,
      organizationId: access.organizationId,
      accountId,
    })
    switch (result.kind) {
      case 'deleted':
        return NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE })
      case 'updated':
        return NextResponse.json({ error: 'Résultat de suppression invalide.' }, { status: 500 })
      case 'actor_forbidden':
        return actorAccessError()
      default:
        return mutationError(result.kind)
    }
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}
