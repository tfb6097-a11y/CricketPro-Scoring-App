-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "siteName" TEXT NOT NULL DEFAULT 'CrickPro',
    "siteTagline" TEXT NOT NULL DEFAULT 'Live Cricket. Real Excitement.',
    "adminEmail" TEXT NOT NULL DEFAULT 'admin@crickpro.com',
    "timezone" TEXT NOT NULL DEFAULT '(GMT+05:30) Asia/Karachi',
    "dateFormat" TEXT NOT NULL DEFAULT 'DD MMM YYYY',
    "timeFormat" TEXT NOT NULL DEFAULT '12 Hour',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);
