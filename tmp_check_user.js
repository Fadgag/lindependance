const { PrismaClient } = require('@prisma/client');
;(async () => {
  const p = new PrismaClient();
  try {
    const u = await p.user.findUnique({ where: { email: 'admin@studio.test' } });
    console.log(u);
  } catch (e) {
    console.error(e);
  } finally {
    await p.$disconnect();
  }
})();

