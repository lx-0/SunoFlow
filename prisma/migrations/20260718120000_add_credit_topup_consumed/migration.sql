-- Durable consumption counter for the top-up ledger. Previously the balance
-- formula summed unexpired CreditTopUp.credits against a month-windowed usage
-- sum, so purchased credits silently replenished on the 1st of every month.
-- consumedCredits is debited FIFO at spend time and never resets.
--
-- Backfill: prod is in a 100%-free closed beta and is expected to have ZERO
-- CreditTopUp rows (verify pre-deploy: SELECT COUNT(*) FROM "CreditTopUp";).
-- If any rows exist, DEFAULT 0 is a deliberate one-time user-favorable
-- amnesty: historical CreditUsage rows were never source-tagged, so past
-- top-up consumption cannot be attributed retroactively without risking
-- mis-charging users on ambiguous data.

-- AlterTable
ALTER TABLE "CreditTopUp" ADD COLUMN "consumedCredits" INTEGER NOT NULL DEFAULT 0;
