import React, { useEffect, useRef, useState } from 'react';
import {
  FieldElementType,
  FieldValues,
  GetValueHandler,
  GetValuesHandler,
  HandleSubmitHandler,
  InputRefsType,
  OptionsType,
} from './type';
import useRender from './useRender';
import { Validation } from './validation/type';
import { validate } from './validation/validation';

const useForm = <T = FieldValues>() => {
  const [errors, setErrors] = useState<Partial<T>>({});
  const inputRefs = useRef<InputRefsType<T>>({});
  const valuesRef = useRef<Partial<T>>({});
  const listeners = useRef<Set<keyof T>>(new Set());
  const { reRender } = useRender();

  useEffect(() => {
    if (listeners.current.size > 0) {
      reRender();
    }
  }, []);

  const register = (name: keyof T, options?: OptionsType) => {
    return {
      id: name,

      name: String(name),

      ref: (element: FieldElementType) => {
        if (!element) return;

        if (!inputRefs.current[name]) {
          if (options?.initialValue) {
            element.value = String(options.initialValue);

            valuesRef.current[name as keyof T] = options.initialValue as T[keyof T];
          }

          inputRefs.current[name] = element;

          if (options?.onMountFocus) inputRefs.current[name]?.focus();
        }

        return inputRefs.current[name];
      },

      onChange: ({ target }: React.ChangeEvent<FieldElementType>) => {
        const { name, value } = target;
        const transformedValue = options?.setValueAs ? options.setValueAs(value) : value;

        // validation
        let [isError, errorMessage] = [false, ''];
        if (options) {
          const { maxLength, max, pattern } = options;
          Object.entries({ maxLength, max, pattern }).forEach(([key, pair]) => {
            if (isError) return;

            if (key === 'maxLength' && pair) {
              [isError, errorMessage] = validate.maxLength(value, pair as Validation<number>);
            } else if (key === 'max' && pair) {
              [isError, errorMessage] = validate.max(value, pair as Validation<number>);
            } else if (key === 'pattern' && pair) {
              [isError, errorMessage] = validate.pattern(value, pair as Validation<RegExp>);
            }
          });

          if (isError && errors[name as keyof T] !== errorMessage) {
            setErrors((prev) => ({ ...prev, [name]: errorMessage }));
            target.focus();
          }
        }

        valuesRef.current[name as keyof T] = transformedValue as T[keyof T];

        if (listeners.current.has(name as keyof T)) reRender();
      },

      onBlur: ({ target }: React.FocusEvent<FieldElementType>) => {
        // validation
        if (!options) return;
        const { name, value } = target;
        let [isError, errorMessage] = [false, ''];

        const { required, minLength, min } = options;
        Object.entries({ required, minLength, min }).forEach(([key, pair]) => {
          if (isError) return;

          if (key === 'required' && pair) {
            [isError, errorMessage] = validate.required(value, pair as Validation<boolean>);
          } else if (key === 'minLength' && pair) {
            [isError, errorMessage] = validate.minLength(value, pair as Validation<number>);
          }
        });

        if (isError && errors[name as keyof T] !== errorMessage) {
          setErrors((prev) => ({ ...prev, [name]: errorMessage }));
          target.focus();
        }
      },
    };
  };

  const getValue: GetValueHandler<T> = (name) => {
    const value = valuesRef.current[name];
    listeners.current.add(name);

    return value;
  };

  const getValues: GetValuesHandler<T> = (names) => {
    const values = names.reduce((acc, name) => {
      listeners.current.add(name);
      const currentValue = valuesRef.current[name];
      if (currentValue !== undefined) {
        acc[name] = currentValue;
      }
      return acc;
    }, {} as Pick<T, (typeof names)[number]>);

    return values;
  };

  function watch<K extends keyof T>(name: K): T[K] | undefined;
  function watch<K extends keyof T>(...names: K[]): { [P in K]?: T[P] };
  function watch<K extends keyof T>(...names: K[]): T[K] | { [P in K]?: T[P] } | undefined {
    if (names.length === 1) {
      return getValue(names[0]);
    }
    return getValues(names);
  }

  const handleSubmit: HandleSubmitHandler<T> = (callback) => (e) => {
    e.preventDefault();

    // TODO: 유효성 검사

    const values = valuesRef.current as T;

    callback(values);
  };

  return {
    register,
    handleSubmit,
    errors,
    getValue,
    getValues,
    watch,
  };
};

export default useForm;
