'use client';
import React, { useRef } from 'react';
import { z } from 'zod';
import { type ActionResult, type IdleActionResult } from '../server/index.js';

// ** Initial state helper
export const initialState = <Schema extends z.ZodTypeAny>(data: z.infer<Schema> | undefined) =>
  ({
    success: false,
    data,
    invalid: undefined,
    error: undefined,
  } as IdleActionResult<Schema>);

export const FormNativeStateContext = React.createContext<ActionResult<any>>({} as ActionResult<any>);
export const useNativeActionState = () => {
  const state = React.useContext(FormNativeStateContext);
  return {
    state,
  };
};

const FormNativeFieldContext = React.createContext<{ name: string }>({} as { name: string });
export const useNativeFormField = () => {
  const { name } = React.useContext(FormNativeFieldContext);
  return {
    name,
    id: `${name}-form-item`,
    descriptionId: `${name}-form-item-description`,
    messageId: `${name}-form-item-message`,
  };
};

export function Form<Schema extends z.AnyZodObject>({
  children,
  action,
  state,
  reset,
}: {
  children: React.ReactNode;
  action: (payload: FormData) => void;
  state: ActionResult<Schema>;
  reset?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  if (reset !== false) {
    if (formRef.current && state.success) {
      formRef.current.reset();
    }
  }

  return (
    <FormNativeStateContext.Provider value={state}>
      <form action={action} ref={formRef}>
        {children}
      </form>
    </FormNativeStateContext.Provider>
  );
}

// TODO: name should be keyof z.TypeOf<Schema>
export function FormField({ children, name }: { children: React.ReactNode; name: string }) {
  return (
    <FormNativeFieldContext.Provider value={{ name }}>
      <div className="space-y-1.5">{children}</div>
    </FormNativeFieldContext.Provider>
  );
}

export function FormInput({ render }: { render: (input: { defaultValue: any; id: string; name: string }) => React.ReactElement }) {
  const { name, id } = useNativeFormField();
  const { state } = useNativeActionState();
  const defaultValue = state.data?.[name];
  return render({ defaultValue, id, name });
}

export function FormLabel({ children }: { children: React.ReactNode }) {
  const { name } = useNativeFormField();
  const { state } = useNativeActionState();
  return <p style={{ color: state.invalid?.[name] ? 'red' : 'inherit' }}>{children}</p>;
}

export function FormDescription({ children }: { children: React.ReactNode }) {
  const { descriptionId } = useNativeFormField();
  return <p id={descriptionId}>{children}</p>;
}

export function FormMessage({ children }: { children?: React.ReactNode }) {
  const { name, messageId } = useNativeFormField();
  const { state } = useNativeActionState();
  const error = state.invalid?.[name] || children;
  if (!error) {
    return null;
  }
  return (
    <p id={messageId} style={{ color: 'red' }}>
      {error}
    </p>
  );
}
