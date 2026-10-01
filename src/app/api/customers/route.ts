import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import apiErrorResponse from '@/lib/api'
import { logger } from '@/lib/logger'
import { CustomerCreateSchema, CustomerUpdateSchema } from '@/schemas/customers'
import { auth } from "@/auth"


// --- GET : Récupérer les clients (Unité ou Liste) ---
export async function GET(_request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const url = new URL(_request.url);
    const id = url.searchParams.get('id');

    // CAS 1 : Récupérer UN client spécifique par ID
    if (id) {
      const customer = await prisma.customer.findFirst({
        where: {
          id,
          organizationId: orgId
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          Note: true,
          createdAt: true,
          // On sélectionne précisément ce qu'on veut dans les relations
          appointments: {
            orderBy: { startTime: 'desc' },
            select: {
              id: true,
              startTime: true,
              endTime: true,
              status: true,
              finalPrice: true,
              note: true,
              soldProducts: true,
              paymentMethod: true,
              service: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  color: true
                }
              }
            }
          }
        }
      });

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }
      return NextResponse.json(customer);
    }

    // CAS 2 : Récupérer TOUS les clients de l'organisation
    const customers = await prisma.customer.findMany({
      where: { organizationId: orgId },
      orderBy: { lastName: 'asc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
        appointments: {
          orderBy: { startTime: 'desc' },
          take: 1,
          select: { startTime: true }
        }
      }
    });

    return NextResponse.json(customers);
  } catch (err) {
    logger.error('[API_CUSTOMERS_GET]', err);
    return apiErrorResponse(err);
  }
}

// --- POST : Créer un nouveau client ---
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const body = await request.json();

    // Validation avec Zod
    const parse = CustomerCreateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.message }, { status: 400 });
    }

    const { firstName, lastName, phone, notes } = parse.data;

    // Vérifier les doublons par téléphone au sein de l'organisation (seulement si phone fourni)
    if (phone) {
      const existing = await prisma.customer.findFirst({
        where: { phone, organizationId: orgId }
      });

      if (existing) {
        return NextResponse.json(
            { error: 'Un client avec ce numéro existe déjà', existing },
            { status: 409 }
        );
      }
    }

    const created = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        // RAISON: phone est optionnel dans le schema — le DB accept null
        phone: phone ?? null,
        Note: notes ?? null,
        organizationId: orgId,
      }
    });

    revalidatePath('/customers');
    return NextResponse.json(created);
  } catch (err) {
    logger.error('[API_CUSTOMERS_POST]', err);
    return apiErrorResponse(err);
  }
}

// --- PUT : Modifier un client ---
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const body = await request.json();

    const parse = CustomerUpdateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.message }, { status: 400 });
    }

    const { id, firstName, lastName, phone, notes } = parse.data;

    // Mise à jour sécurisée par organizationId
    const dataToUpdate: Partial<Prisma.CustomerUncheckedUpdateInput> = {};
    if (firstName !== undefined) dataToUpdate.firstName = firstName;
    if (lastName !== undefined) dataToUpdate.lastName = lastName;
    if (phone !== undefined) dataToUpdate.phone = phone ?? null;
    if (notes !== undefined) dataToUpdate.Note = notes ?? null;

    const updatedRecord = await prisma.customer.updateMany({
      where: {
        id,
        organizationId: orgId
      },
      data: dataToUpdate
    });

    if (updatedRecord.count === 0) {
      return NextResponse.json({ error: 'Customer not found or unauthorized' }, { status: 404 });
    }

    // Récupérer l'objet mis à jour proprement avec select
    const updatedCustomer = await prisma.customer.findFirst({
      where: { id, organizationId: orgId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        Note: true,
        appointments: {
          take: 5,
          orderBy: { startTime: 'desc' },
          select: { id: true, startTime: true }
        }
      }
    });

    return NextResponse.json(updatedCustomer);
  } catch (err) {
    logger.error('[API_CUSTOMERS_PUT]', err);
    return apiErrorResponse(err);
  }
}