import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { subDays, addDays, startOfDay, setHours } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  const orgId = "org_studio_001"
  const adminEmail = "admin@studio.com"

  console.log('--- Début du Seed Dynamique ---')

  // 1. Organisation
  await prisma.organization.upsert({
    where: { id: orgId },
    update: {},
    create: { id: orgId, name: "Studio Luxe" }
  })

  // 2. Admin
  const hashedPassword = await bcrypt.hash("Admin123!", 10)
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { organizationId: orgId },
    create: {
      email: adminEmail,
      name: "Gérante Studio",
      hashedPassword: hashedPassword,
      role: "ADMIN",
      organizationId: orgId
    }
  })

  // 3. Staff & Services
  const staff = await prisma.staff.upsert({
    where: { id: "staff_001" },
    update: {},
    create: { id: "staff_001", firstName: "Julie", lastName: "Expert", organizationId: orgId }
  })

  const svc = await prisma.service.upsert({
    where: { id: "svc_coupe" },
    update: {},
    create: { id: "svc_coupe", name: "Coupe Signature", durationMinutes: 45, price: 50, organizationId: orgId }
  })

// 4. Clients avec dates de création différentes
  const clients = [
    { id: "c1", firstName: "Léa", lastName: "Vasseur", phone: "0601020304", createdAt: subDays(new Date(), 10) },
    { id: "c2", firstName: "Marc", lastName: "Rousseau", phone: "0605060708", createdAt: new Date() },
    { id: "c3", firstName: "Julie", lastName: "Demo", phone: "0611223344", createdAt: addDays(new Date(), 2) }
  ]

  for (const c of clients) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: {
        createdAt: c.createdAt,
        phone: c.phone // On s'assure que le téléphone est aussi mis à jour
      },
      create: {
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        organizationId: orgId,
        createdAt: c.createdAt
      }
    })
  }

  // 5. Rendez-vous Stratégiques
  const appointments = [
    // RDV PASSÉ (Payé) - Il y a 2 jours
    {
      id: "past_1",
      title: "Coupe Passée",
      startTime: setHours(subDays(startOfDay(new Date()), 2), 14),
      status: "PAID",
      finalPrice: 60, // 50€ + 10€ d'extras
    },
    // RDV AUJOURD'HUI (Non payé) - À 15h
    {
      id: "today_1",
      title: "Coupe Aujourd'hui",
      startTime: setHours(startOfDay(new Date()), 15),
      status: "CONFIRMED",
    },
    // RDV DEMAIN (Non payé) - À 10h
    {
      id: "tomorrow_1",
      title: "Coupe Demain",
      startTime: setHours(addDays(startOfDay(new Date()), 1), 10),
      status: "CONFIRMED",
    },
    // RDV SEMAINE PROCHAINE (Même mois)
    {
      id: "next_week_1",
      title: "Coupe Futur",
      startTime: setHours(addDays(startOfDay(new Date()), 5), 11),
      status: "CONFIRMED",
    }
  ]

  for (const a of appointments) {
    const start = a.startTime
    const end = new Date(start.getTime() + 45 * 60000)
    await prisma.appointment.upsert({
      where: { id: a.id },
      update: { startTime: start, endTime: end, status: a.status, finalPrice: a.finalPrice || null },
      create: {
        id: a.id,
        title: a.title,
        startTime: start,
        endTime: end,
        status: a.status as any,
        finalPrice: a.finalPrice || null,
        serviceId: svc.id,
        customerId: "c1",
        staffId: staff.id,
        organizationId: orgId,
        duration: 45
      }
    })
  }

  console.log('✅ Seed terminé avec succès !')
}

main().finally(() => prisma.$disconnect())