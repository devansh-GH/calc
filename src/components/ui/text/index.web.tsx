import React from "react";
import type { VariantProps } from "@gluestack-ui/utils/nativewind-utils";
import { textStyle } from "./styles";

type ITextProps = React.ComponentProps<"span"> &
  VariantProps<typeof textStyle> & {
    numberOfLines?: number;
    adjustsFontSizeToFit?: boolean;
    allowFontScaling?: boolean;
  };

const Text = React.forwardRef<React.ComponentRef<"span">, ITextProps>(function Text(
  {
    className,
    isTruncated,
    bold,
    underline,
    strikeThrough,
    size = "md",
    sub,
    italic,
    highlight,
    // RN-only props — strip so they never hit the DOM on web.
    numberOfLines,
    adjustsFontSizeToFit: _adjustsFontSizeToFit,
    allowFontScaling: _allowFontScaling,
    ...props
  },
  ref,
) {
  const truncate = Boolean(isTruncated || (numberOfLines !== undefined && numberOfLines > 0));

  return (
    <span
      className={textStyle({
        isTruncated: truncate,
        bold: bold as boolean,
        underline: underline as boolean,
        strikeThrough: strikeThrough as boolean,
        size,
        sub: sub as boolean,
        italic: italic as boolean,
        highlight: highlight as boolean,
        class: className,
      })}
      {...props}
      ref={ref}
    />
  );
});

Text.displayName = "Text";

export { Text };
