# Admin Flag Setup Guide

This guide explains how to set up admin functionality so certain users can view all items across all accounts.

## What This Does

- Adds an `is_admin` boolean flag to user profiles
- Updates database security (RLS) so admins can see all items
- Regular users continue to see only their own items
- You control who is admin by flipping the flag

## Step 1: Run the SQL Migration

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor** (left sidebar)
3. Click **"New Query"**
4. Copy the contents of `ADMIN_FLAG_MIGRATION.sql` and paste it
5. **Important:** Update line 9 with your actual email:
   ```sql
   WHERE email = 'aroncm@gmail.com';  -- Change this to your email
   ```
6. Click **"Run"** or press `Cmd/Ctrl + Enter`

## Step 2: Verify It Worked

Run this query in the SQL Editor:

```sql
SELECT email, is_admin FROM profiles WHERE email = 'aroncm@gmail.com';
```

You should see:
```
email              | is_admin
-------------------+---------
aroncm@gmail.com   | true
```

## Step 3: Test It

1. Log in to VintageLab as your admin account
2. You should now see **all items** from all users
3. The email-imported items from other accounts will now be visible

## Making Other Users Admin

To make another user an admin, run:

```sql
UPDATE profiles
SET is_admin = TRUE
WHERE email = 'their-email@example.com';
```

## Removing Admin Access

To remove admin access:

```sql
UPDATE profiles
SET is_admin = FALSE
WHERE email = 'their-email@example.com';
```

## How It Works

The RLS (Row Level Security) policy on the `items` table now checks:

1. **Is this your own item?** → Show it
2. **Are you an admin?** → Show all items

This means:
- Regular users: See only their items
- Admin users: See everyone's items

## Future Enhancement: UI Toggle

In the future, we can add a toggle in the dashboard:
- **"My Items"** - shows only your items (even if you're admin)
- **"All Items"** - shows everyone's items (admin only)

This would let admins choose between views without changing the underlying permissions.

## Troubleshooting

### "relation 'profiles' does not exist"

If you get this error, you need to create the profiles table first. Supabase usually auto-creates this, but if not:

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);
```

Then run the admin migration again.

### Not seeing all items

1. Make sure you're logged in with the admin email
2. Verify `is_admin = TRUE` in the database
3. Hard refresh your browser (Cmd+Shift+R / Ctrl+Shift+R)
4. Check that the RLS policy was created correctly:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'items';
   ```

## Security Notes

- Admin flag is stored in the database, protected by RLS
- Only admins can see sensitive data from other users
- Regular users cannot escalate themselves to admin
- All changes are audited in Supabase logs
