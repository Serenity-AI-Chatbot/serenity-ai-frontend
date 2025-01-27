'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Store } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClientComponentClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign up the user
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}`,
            data: {
              store_name: storeName // Store the store name in user metadata
            }
          }
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          // Create the store using service role client (handled by API route)
          const response = await fetch('/api/stores/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: storeName,
              userId: authData.user.id,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create store');
          }

          toast({
            title: 'Account created',
            description: 'Welcome to your new store!',
          });
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        toast({
          title: 'Welcome back!',
          description: 'Successfully signed in to your store.',
        });
      }

      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 w-full max-w-md mx-auto bg-white dark:bg-black">
      <div className="flex items-center gap-2 mb-6">
        <Store className="w-6 h-6 text-emerald-500" />
        <h1 className="text-2xl font-bold text-emerald-500">
          {isSignUp ? 'Create Store Account' : 'Sign In to Your Store'}
        </h1>
      </div>

      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-white dark:bg-black border-emerald-500 text-gray-900 dark:text-emerald-500 placeholder:text-gray-500 dark:placeholder:text-emerald-500/50"
          />
        </div>
        <div>
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-white dark:bg-black border-emerald-500 text-gray-900 dark:text-emerald-500 placeholder:text-gray-500 dark:placeholder:text-emerald-500/50"
          />
        </div>
        {isSignUp && (
          <div>
            <Input
              placeholder="Store Name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
              className="bg-white dark:bg-black border-emerald-500 text-gray-900 dark:text-emerald-500 placeholder:text-gray-500 dark:placeholder:text-emerald-500/50"
            />
          </div>
        )}
        <Button 
          type="submit" 
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white" 
          disabled={isLoading}
        >
          {isLoading
            ? 'Loading...'
            : isSignUp
            ? 'Create Account'
            : 'Sign In'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600 dark:text-emerald-500/70">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          {isSignUp ? 'Sign In' : 'Create Account'}
        </button>
      </p>
    </Card>
  );
}