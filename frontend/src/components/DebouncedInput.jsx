import React, { useState, useEffect } from 'react';
import { Form } from 'react-bootstrap';

/**
 * A wrapper for Form.Control that debounces the onChange event.
 * Eliminates input lag in large React forms by keeping the fast typing state local,
 * and only syncing with the parent component after the user stops typing.
 */
const DebouncedInput = ({ value, onChange, delay = 300, ...props }) => {
  const [localValue, setLocalValue] = useState(value || '');

  // Update local value if parent value changes externally
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      // Only trigger onChange if the value actually changed to prevent infinite loops
      if (localValue !== (value || '')) {
        onChange({ target: { value: localValue, name: props.name } });
      }
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [localValue, delay, onChange, value, props.name]);

  const handleChange = (e) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = (e) => {
    // Immediately sync on blur
    if (localValue !== (value || '')) {
      onChange({ target: { value: localValue, name: props.name } });
    }
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <Form.Control
      {...props}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

export default DebouncedInput;
