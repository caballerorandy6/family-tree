'use server';

import { redirect } from 'next/navigation';
import { signIn } from '@/lib/auth';
import { api } from '@/lib/api';
import type { AuthTokens, UserWithoutPassword } from '@familytree/types/auth.types';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if ((error as Error).message?.includes('NEXT_REDIRECT')) {
      throw error;
    }
    redirect('/login?error=InvalidCredentials');
  }
}

export async function googleSignInAction() {
  await signIn('google', { redirectTo: '/dashboard' });
}

export async function registerAction(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const response = await api<{ user: UserWithoutPassword; tokens: AuthTokens }>('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });

  if (!response.success) {
    const errorMessage = encodeURIComponent(response.error.message);
    redirect(`/register?error=${errorMessage}`);
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if ((error as Error).message?.includes('NEXT_REDIRECT')) {
      throw error;
    }
    redirect('/login?error=RegistrationSuccessLoginFailed');
  }
}
