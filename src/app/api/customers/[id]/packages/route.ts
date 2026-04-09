import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import apiErrorResponse from '@/lib/api'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { auth } from "@/auth";

export async function GET(_request: Request) {
    try {
        const url = new URL(_request.url);
        const m = url.pathname.match(/\/api\/customers\/([^\/]+)\/packages/);
        const customerId = m ? decodeURIComponent(m[1]) : null;
        if (!customerId) return NextResponse.json({ error: 'Missing customer id' }, { status: 400 });

        const session = await auth();
        const orgId = session?.user?.organizationId;
        if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const serviceId = url.searchParams.get('serviceId');
        const now = new Date();

        const packs = await prisma.customerPackage.findMany({
            where: {
                customerId,
                sessionsRemaining: { gt: 0 },
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                // Filtre optionnel par service
                ...(serviceId ? { package: { packageServices: { some: { serviceId } } } } : {})
            },
            select: {
                id: true,
                totalSessions: true,
                sessionsRemaining: true,
                expiresAt: true,
                package: {
                    select: {
                        id: true,
                        name: true,
                        packageServices: {
                            select: { serviceId: true }
                        }
                    }
                }
            }
        });

        return NextResponse.json(packs);
    } catch (err) {
        logger.error('GET customer packages error:', err);
        return apiErrorResponse(err);
    }
}

export async function POST(request: Request) {
    try {
        const url = new URL(request.url);
        const m = url.pathname.match(/\/api\/customers\/([^\/]+)\/packages/);
        const customerId = m ? decodeURIComponent(m[1]) : null;

        const session = await auth();
        const orgId = session?.user?.organizationId;
        if (!orgId || !customerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();

        // Validation stricte
        const schema = z.object({
            packageId: z.string().min(1),
            totalSessions: z.number().int().positive(),
            expiresAt: z.string().nullable().optional()
        });

        const parsed = schema.safeParse({
            ...body,
            totalSessions: Number(body.totalSessions)
        });

        if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

        // Vérification de propriété (Double check orgId)
        const [targetCustomer, targetPackage] = await Promise.all([
            prisma.customer.findFirst({ where: { id: customerId, organizationId: orgId } }),
            prisma.package.findFirst({ where: { id: parsed.data.packageId, organizationId: orgId } })
        ]);

        if (!targetCustomer || !targetPackage) {
            return NextResponse.json({ error: 'Access denied' }, { status: 404 });
        }

        const cp = await prisma.customerPackage.create({
            data: {
                customerId,
                packageId: parsed.data.packageId,
                totalSessions: parsed.data.totalSessions,
                sessionsRemaining: parsed.data.totalSessions,
                expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null
            }
        });

        return NextResponse.json(cp);
    } catch (err) {
        return apiErrorResponse(err);
    }
}