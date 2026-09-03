'use client';

import {
  FieldError,
  Input as AriaInput,
  Label,
  Text,
  TextArea as AriaTextArea,
  TextField,
} from 'react-aria-components';
import { cx } from '../../utils/cx.js';

function FieldShell({ label, hint, error, optional, children, ...props }) {
  return (
    <TextField {...props} isInvalid={Boolean(error)} className="ui-field">
      <Label className="ui-label">
        <span>{label}</span>
        {optional && <small>Opcional</small>}
      </Label>
      {children}
      {error ? <FieldError className="ui-error">{error}</FieldError> : hint ? <Text slot="description" className="ui-hint">{hint}</Text> : null}
    </TextField>
  );
}

export function Input({ label, hint, error, optional, className, value, onChange, isRequired, ...props }) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} value={value} onChange={onChange} isRequired={isRequired}>
      <AriaInput {...props} className={cx('ui-control', className)} />
    </FieldShell>
  );
}

export function Textarea({ label, hint, error, optional, className, value, onChange, isRequired, ...props }) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} value={value} onChange={onChange} isRequired={isRequired}>
      <AriaTextArea {...props} className={cx('ui-control ui-textarea', className)} />
    </FieldShell>
  );
}

export function Select({ label, value, onChange, children }) {
  return (
    <label className="ui-field">
      <span className="ui-label"><span>{label}</span></span>
      <select className="ui-control ui-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}
