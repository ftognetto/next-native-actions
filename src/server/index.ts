import { z } from 'zod';

// ** Action wrapper
export const action = <Schema extends z.ZodTypeAny>(schema: Schema, fn: (data: z.infer<Schema>) => unknown) => {
  return async (prevState: unknown, data: FormData) => {
    const formData = decodeFormData(data);
    const parsedData = await schema.safeParseAsync(formData);
    if (!parsedData.success) {
      return failure<Schema>(serialize(formData), parsedData.error.flatten().fieldErrors as FieldErrors<Schema>);
    }
    try {
      const actionResponse = await fn(parsedData.data);
      if (actionResponse && isFailureActionResult(actionResponse)) {
        // Permit to return a FailureActionResult from the action for custom validations
        return actionResponse;
      }
      return success<Schema>(serialize(parsedData.data));
    } catch (e: unknown) {
      if (e instanceof Error && (e.message === 'NEXT_REDIRECT' || e.message === 'NEXT_NOT_FOUND')) {
        throw e;
      } else {
        return error(serialize(parsedData.data), e);
      }
    }
  };
};

export const actionWithParam = <Schema extends z.ZodTypeAny>(schema: Schema, fn: (param: string, data: z.infer<Schema>) => unknown) => {
  return async (param: string, prevState: unknown, data: FormData) => {
    const formData = decodeFormData(data);
    const parsedData = await schema.safeParseAsync(formData);
    if (!parsedData.success) {
      return failure<Schema>(serialize(formData), parsedData.error.flatten().fieldErrors as FieldErrors<Schema>);
    }
    try {
      const actionResponse = await fn(param, parsedData.data);
      if (actionResponse && isFailureActionResult(actionResponse)) {
        return actionResponse;
      }
      return success<Schema>(serialize(parsedData.data));
    } catch (e: unknown) {
      if (e instanceof Error && (e.message === 'NEXT_REDIRECT' || e.message === 'NEXT_NOT_FOUND')) {
        throw e;
      } else {
        return error(serialize(parsedData.data), e);
      }
    }
  };
};

// ** Action result types
export type IdleActionResult<Schema extends z.ZodTypeAny> = {
  success: false;
  data: z.infer<Schema> | undefined;
  invalid: undefined;
  error: undefined;
};
export type SuccessActionResult<Schema extends z.ZodTypeAny> = {
  success: true;
  data: z.infer<Schema> | undefined;
  invalid: undefined;
  error: undefined;
};
export type InvalidActionResult<Schema extends z.ZodTypeAny> = {
  success: false;
  data: z.infer<Schema> | undefined;
  invalid: FieldErrors<Schema> | undefined;
  error: undefined;
};
export type ErrorActionResult<Schema extends z.ZodTypeAny> = {
  success: false;
  data: z.infer<Schema> | undefined;
  invalid: undefined;
  error: string;
};
export type ActionResult<Schema extends z.ZodTypeAny> =
  | IdleActionResult<Schema>
  | SuccessActionResult<Schema>
  | InvalidActionResult<Schema>
  | ErrorActionResult<Schema>;

type FieldErrors<Schema extends z.ZodTypeAny> = {
  [key in keyof Partial<z.TypeOf<Schema>>]: string[];
};

// ** Action result constructors helpers
const success = <Schema extends z.ZodTypeAny>(data: z.infer<Schema>) =>
  ({
    success: true,
    data,
    invalid: undefined,
    error: undefined,
  } satisfies SuccessActionResult<Schema>);

const failure = <Schema extends z.ZodTypeAny>(data: z.infer<Schema>, invalid: FieldErrors<Schema>) =>
  ({
    success: false,
    data, // pass down the data even if there are errors to leave the form filled
    invalid,
    error: undefined,
  } satisfies InvalidActionResult<Schema>);

const error = <Schema extends z.ZodTypeAny>(data: z.infer<Schema>, error: unknown) =>
  ({
    data, // pass down the data even if there are errors to leave the form filled
    success: false,
    invalid: undefined,
    error: error instanceof Error ? error.message : JSON.stringify(error),
  } satisfies ErrorActionResult<Schema>);

export function setInvalid<Schema extends z.ZodTypeAny>(data: z.infer<Schema>, field: keyof z.TypeOf<Schema>, error: string) {
  return {
    invalid: {
      [field]: error,
    } as unknown as FieldErrors<Schema>,
    success: false,
    error: undefined,
    data, // pass down the data even if there are errors to leave the form filled
  } satisfies InvalidActionResult<Schema>;
}

// ** Action result typeguards
export const isFailureActionResult = <Schema extends z.ZodTypeAny>(data: unknown): data is InvalidActionResult<Schema> => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    data.success === false &&
    'invalid' in data &&
    data.invalid !== undefined
  );
};

// ** Decode form helper
export const decodeFormData = (formData: FormData): Record<string, any> => {
  const data: Record<string, any> = {};
  formData.forEach((value, key) => {
    // Reflect.has in favor of: object.hasOwnProperty(key)
    if (!Reflect.has(data, key)) {
      if (value && value.toString().length) {
        data[key] = value;
      } else {
        data[key] = undefined;
      }
      return;
    }
    // For grouped fields like multi-selects and checkboxes, we need to
    // store the values in an array.
    if (!Array.isArray(data[key])) {
      data[key] = [data[key]];
    }
    data[key].push(value);
  });

  // if in data there are fields with dot i assume that they are nested objects
  // and i transform them in nested objects
  for (const [key, value] of Object.entries(data)) {
    if (key.includes('.')) {
      const keys = key.split('.');
      const lastKey = keys.pop() as string;
      let obj = data;
      for (const k of keys) {
        if (!obj[k]) {
          obj[k] = {};
        }
        obj = obj[k];
      }
      obj[lastKey] = value;
      delete data[key];
    }
  }

  return data;
};
const serialize = <Schema extends z.ZodTypeAny>(data: z.infer<Schema>) => JSON.parse(JSON.stringify(data));
