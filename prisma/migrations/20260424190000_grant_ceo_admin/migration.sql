-- Grant admin access to the CEO user account
UPDATE "User" SET "isAdmin" = true WHERE "email" = 'alex@yesterday-ai.de';
