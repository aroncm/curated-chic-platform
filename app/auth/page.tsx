import { AuthForm } from '@/components/AuthForm';

export default function AuthPage() {
  return (
    <main className="space-y-6 max-w-md mx-auto">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="text-sm text-slate-600">
        Enter your email to receive a magic link. Once signed in you can view items,
        reporting, and inventory management.
      </p>
      <AuthForm />
    </main>
  );
}
