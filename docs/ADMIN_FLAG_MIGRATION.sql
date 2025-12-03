-- ============================================
-- Admin Flag Migration
-- ============================================
-- This migration adds admin functionality so certain users
-- can view all items across all accounts.

-- 1. Add is_admin column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Set your account as admin (update the email to match yours)
UPDATE profiles
SET is_admin = TRUE
WHERE email = 'aroncm@gmail.com';

-- 3. Drop existing SELECT policy on items
DROP POLICY IF EXISTS "Users can view their own items" ON items;

-- 4. Create new policy that allows admins to see everything
CREATE POLICY "Users can view own items or admins view all"
ON items FOR SELECT
USING (
  auth.uid() = owner_id
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = TRUE
  )
);

-- 5. Verify the change (optional - check if you're admin)
-- SELECT email, is_admin FROM profiles WHERE email = 'aroncm@gmail.com';
