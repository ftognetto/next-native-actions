'use client';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import React from 'react';
import { toast } from 'sonner';
import { useNativeActionState, useNativeFormField } from './index.js';

export function FormLabel({ children }: { children: React.ReactNode }) {
  const { name, id } = useNativeFormField();
  const { state } = useNativeActionState();
  return (
    <Label className={cn(state.invalid?.[name] && 'text-destructive', 'text-sm font-medium leading-none')} htmlFor={id}>
      {children}
    </Label>
  );
}

export function FormDescription({ children }: { children: React.ReactNode }) {
  const { descriptionId } = useNativeFormField();
  return (
    <p id={descriptionId} className={cn('text-sm text-muted-foreground', '')}>
      {children}
    </p>
  );
}

export function FormMessage({ children }: { children?: React.ReactNode }) {
  const { name, messageId } = useNativeFormField();
  const { state } = useNativeActionState();
  const error = state.invalid?.[name] || children;
  if (!error) {
    return null;
  }
  return (
    <p id={messageId} className={cn('text-sm', error && 'text-destructive')}>
      {error}
    </p>
  );
}

export function FormToast({ success, error, formatError }: { success?: string; error?: string; formatError?: (error: string) => string }) {
  const { state } = useNativeActionState();
  React.useEffect(() => {
    if (state.success) {
      toast.success(success ?? 'Azione eseguita con successo');
    } else if (state.error) {
      toast.error(error ?? 'Si è verificato un errore', {
        description: formatError?.(state.error) ?? state.error,
      });
    }
  }, [state, success, error, formatError]);
  return null;
}
