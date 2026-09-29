import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface SmartInputHandle {
  insert: (text: string) => void;
  backspace: () => void;
  clear: () => void;
  focus: () => void;
}

interface Props {
  value: string;
  onChange: (text: string) => void;
}

const PLACEHOLDER = "#94a3b8";
/** Soft keyboard blocked on native; web keeps normal keyboard input. */
const IS_NATIVE = Platform.OS === "ios" || Platform.OS === "android";

const SmartInput = forwardRef<SmartInputHandle, Props>(({ value, onChange }, ref) => {
  const innerRef = useRef<TextInput>(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const updateSelection = (next: { start: number; end: number }) => {
    selectionRef.current = next;
    setSelection(next);
  };

  useImperativeHandle(ref, () => ({
    insert(text: string) {
      const { start, end } = selectionRef.current;
      const before = value.slice(0, start);
      const after = value.slice(end);
      const next = `${before}${text}${after}`;
      const cursor = (before + text).length;
      updateSelection({ start: cursor, end: cursor });
      onChange(next);
    },
    backspace() {
      const { start, end } = selectionRef.current;
      if (start !== end) {
        const next = value.slice(0, start) + value.slice(end);
        updateSelection({ start, end: start });
        onChange(next);
        return;
      }
      if (start === 0) return;
      const next = value.slice(0, start - 1) + value.slice(end);
      const cursor = start - 1;
      updateSelection({ start: cursor, end: cursor });
      onChange(next);
    },
    clear() {
      updateSelection({ start: 0, end: 0 });
      onChange("");
    },
    focus() {
      innerRef.current?.focus();
    },
  }));

  return (
    <View className="relative">
      <TextInput
        ref={innerRef}
        value={value}
        onChangeText={(text) => {
          // Web / hardware keyboards still type normally.
          // On native, soft keyboard stays hidden via showSoftInputOnFocus={false}.
          onChange(text);
        }}
        onSelectionChange={(event) => {
          updateSelection(event.nativeEvent.selection);
        }}
        selection={selection}
        placeholder="100 USD + ₹500"
        placeholderTextColor={PLACEHOLDER}
        autoCorrect={false}
        autoCapitalize="characters"
        multiline
        // Native: focus + move caret / select text without opening the soft keyboard.
        // Web: omit / true so laptop keyboards work as usual.
        showSoftInputOnFocus={!IS_NATIVE}
        caretHidden={false}
        editable
        selectTextOnFocus={false}
        accessibilityLabel="Smart calculation input"
        accessibilityHint={
          IS_NATIVE
            ? "Tap to place the cursor. Use the keypad and currency chips to edit."
            : "Type with your keyboard, or use the keypad and currency chips."
        }
        className="min-h-16 rounded-2xl border border-primary/50 bg-card px-4 py-3 pr-12 text-lg font-semibold text-foreground dark:border-primary/50 dark:bg-card dark:text-foreground"
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear input"
          onPress={() => {
            updateSelection({ start: 0, end: 0 });
            onChange("");
          }}
          className="absolute right-2 top-3 rounded-lg p-2 active:bg-muted dark:active:bg-muted"
          hitSlop={6}
        >
          <Ionicons name="close-circle" size={20} color={PLACEHOLDER} />
        </Pressable>
      ) : null}
    </View>
  );
});

SmartInput.displayName = "SmartInput";
export default SmartInput;
