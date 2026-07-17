import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import {
  Modal,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Text, TextInput } from "@/components/Themed";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Cross-platform replacement for Alert.prompt (which is iOS-only — on Android it
// is undefined, so `Alert.prompt(...)` crashes and `Alert.prompt?.(...)` silently
// no-ops, leaving rename/create/edit actions dead). usePrompt() returns a
// promise-based prompt({...}) => Promise<string | null> rendered as a themed
// bottom sheet, the drawer-over-modal pattern DESIGN.md prefers.

export interface PromptOptions {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

type PromptFn = (opts: PromptOptions) => Promise<string | null>;

const PromptContext = createContext<PromptFn>(async () => null);

export function usePrompt(): PromptFn {
  return useContext(PromptContext);
}

interface ActiveRequest extends PromptOptions {
  resolve: (value: string | null) => void;
}

export function PromptProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [req, setReq] = useState<ActiveRequest | null>(null);
  const [value, setValue] = useState("");
  // Guard so backdrop-dismiss + button-press can't both resolve the same request.
  const settled = useRef(false);

  const prompt = useCallback<PromptFn>((opts) => {
    return new Promise<string | null>((resolve) => {
      settled.current = false;
      setValue(opts.defaultValue ?? "");
      setReq({ ...opts, resolve });
    });
  }, []);

  const finish = (result: string | null) => {
    if (settled.current || !req) return;
    settled.current = true;
    req.resolve(result);
    setReq(null);
    setValue("");
  };

  return (
    <PromptContext.Provider value={prompt}>
      {children}
      <Modal
        visible={req !== null}
        transparent
        animationType="slide"
        onRequestClose={() => finish(null)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => finish(null)}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kav}
          pointerEvents="box-none"
        >
          {req ? (
            <View style={styles.sheet}>
              <Text style={styles.title}>{req.title}</Text>
              {req.message ? <Text style={styles.message}>{req.message}</Text> : null}
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={setValue}
                placeholder={req.placeholder}
                placeholderTextColor={colors.textFaint}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => finish(value)}
              />
              <View style={styles.actions}>
                <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => finish(null)}>
                  <Text style={styles.btnGhostText}>{req.cancelLabel ?? "Cancel"}</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => finish(value)}>
                  <Text style={styles.btnPrimaryText}>{req.confirmLabel ?? "Done"}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </Modal>
    </PromptContext.Provider>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)" },
    kav: { flex: 1, justifyContent: "flex-end" },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 32,
      gap: 14,
    },
    title: { color: c.text, fontSize: 18, fontWeight: "600" },
    message: { color: c.textDim, fontSize: 14, marginTop: -6 },
    input: {
      backgroundColor: c.surfaceAlt,
      color: c.text,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
    },
    actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
    btn: { borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
    btnGhost: { backgroundColor: "transparent" },
    btnGhostText: { color: c.textDim, fontSize: 15, fontWeight: "500" },
    btnPrimary: { backgroundColor: c.accent },
    btnPrimaryText: { color: c.onAccent, fontSize: 15, fontWeight: "600" },
  });
}
