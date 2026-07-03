import {
  StyleSheet,
  TextInput,
  TextInputProps,
} from "react-native";

import { SyncColors } from "../../constants/sync-theme";

type SyncTextInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoFocus?: boolean;
} & Pick<TextInputProps, "keyboardType" | "returnKeyType" | "onSubmitEditing">;

export function SyncTextInput({
  value,
  onChange,
  placeholder,
  multiline = false,
  autoFocus = false,
  keyboardType,
  returnKeyType,
  onSubmitEditing,
}: SyncTextInputProps) {
  return (
    <TextInput
      autoFocus={autoFocus}
      keyboardType={keyboardType}
      multiline={multiline}
      onChangeText={onChange}
      onSubmitEditing={onSubmitEditing}
      placeholder={placeholder}
      placeholderTextColor={SyncColors.textWhisper}
      returnKeyType={returnKeyType}
      style={[styles.input, multiline && styles.inputMultiline]}
      textAlignVertical={multiline ? "top" : "center"}
      value={value}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SyncColors.border,
    backgroundColor: SyncColors.inputBg,
    color: SyncColors.text,
    fontSize: 17,
    lineHeight: 24,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputMultiline: {
    minHeight: 132,
    paddingTop: 16,
  },
});
