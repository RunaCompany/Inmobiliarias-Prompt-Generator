'use client';

import { Check } from '@untitledui/icons';
import { Checkbox as AriaCheckbox } from 'react-aria-components';
import { cx } from '../../utils/cx.js';

export function Checkbox({ children, className, ...props }) {
  return (
    <AriaCheckbox {...props} className={cx('ui-checkbox', className)}>
      {({ isSelected }) => (
        <>
          <span className="ui-checkbox-box">{isSelected && <Check aria-hidden="true" />}</span>
          <span>{children}</span>
        </>
      )}
    </AriaCheckbox>
  );
}
