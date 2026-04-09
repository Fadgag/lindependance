//scr/app/api/stats/route.ts

import { NextResponse } from 'next/server'
import apiErrorResponse from '@/lib/api' // Assure-toi que ce helper existe
import { auth } from '@/auth'
import dashboardService from '@/services/dashboard.service' // Nom corrigé
import { z } from 'zod'

export async function GET(request: Request) {
  try {
    const session = await auth();

    // 1. Vérification d'authentification
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Récupération de l'organisation
    const orgId = session.user.organizationId
    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 })
    }

    // 3. Validation des paramètres avec Zod
    const url = new URL(request.url)
    const paramsSchema = z.object({
      start: z.string().optional(),
      end: z.string().optional()
    })

    const parsed = paramsSchema.safeParse({
      start: url.searchParams.get('start') ?? undefined,
      end: url.searchParams.get('end') ?? undefined
    })

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query params' }, { status: 400 })
    }

    // 4. Conversion des dates
    let startDate: Date | undefined
    let endDate: Date | undefined

    if (parsed.data.start) {
      startDate = new Date(parsed.data.start)
      if (isNaN(startDate.getTime())) return NextResponse.json({ error: 'Invalid start date' }, { status: 400 })
    }

    if (parsed.data.end) {
      endDate = new Date(parsed.data.end)
      if (isNaN(endDate.getTime())) return NextResponse.json({ error: 'Invalid end date' }, { status: 400 })
    }

    // 5. Appel du service (on utilise les bons noms ici)
    const stats = await dashboardService.getDashboardForOrg(orgId, {
      start: startDate,
      end: endDate
    })

    return NextResponse.json(stats)

  } catch (err) {
    // Si apiErrorResponse n'est pas dispo, utilise : return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    return apiErrorResponse(err)
  }
}