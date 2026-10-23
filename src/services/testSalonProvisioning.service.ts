import { randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { CreateTestSalonInput } from '@/schemas/techAdmin'

type ProvisionedTestSalon = {
  id: string
  name: string
  slug: string
  customerEmail: string
  staffAccount: {
    email: string
    role: 'USER' | 'ADMIN'
  }
}

type ProvisionTestSalonResult =
  | { kind: 'created'; salon: ProvisionedTestSalon }
  | { kind: 'email_exists' }

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export async function provisionTestSalon(
  input: Pick<CreateTestSalonInput, 'email' | 'role'>,
): Promise<ProvisionTestSalonResult> {
  const token = randomUUID()
  const slug = `salon-test-${token}`
  const name = `Salon de test ${slug}`
  const customerEmail = `client-${slug}@example.invalid`

  try {
    return await prisma.$transaction(async (transaction) => {
      const existingUser = await transaction.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      })
      if (existingUser) return { kind: 'email_exists' }

      const organization = await transaction.organization.create({
        data: {
          name,
          slug,
          portalEnabled: true,
        },
        select: { id: true, name: true },
      })
      const service = await transaction.service.create({
        data: {
          name: 'Prestation de test',
          durationMinutes: 30,
          price: '25.00',
          organizationId: organization.id,
        },
        select: { id: true },
      })
      const staff = await transaction.staff.create({
        data: {
          firstName: 'Camille',
          lastName: 'Test',
          active: true,
          organizationId: organization.id,
        },
        select: { id: true },
      })
      await transaction.user.create({
        data: {
          email: input.email,
          role: input.role,
          organizationId: organization.id,
          hashedPassword: null,
        },
        select: { id: true },
      })
      const customer = await transaction.customer.create({
        data: {
          firstName: 'Client',
          lastName: 'Test',
          email: customerEmail,
          organizationId: organization.id,
        },
        select: { id: true },
      })

      const appointmentStart = new Date()
      appointmentStart.setUTCDate(appointmentStart.getUTCDate() + 1)
      appointmentStart.setUTCHours(10, 0, 0, 0)

      await transaction.appointment.create({
        data: {
          startTime: appointmentStart,
          endTime: new Date(appointmentStart.getTime() + 30 * 60 * 1000),
          duration: 30,
          status: 'CONFIRMED',
          bookingSource: 'PORTAL',
          price: '25.00',
          finalPrice: 25,
          serviceId: service.id,
          staffId: staff.id,
          customerId: customer.id,
          organizationId: organization.id,
        },
        select: { id: true },
      })

      return {
        kind: 'created',
        salon: {
          id: organization.id,
          name: organization.name,
          slug,
          customerEmail,
          staffAccount: {
            email: input.email,
            role: input.role,
          },
        },
      }
    })
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) return { kind: 'email_exists' }
    throw error
  }
}
