import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';

interface OptionItem {
  label: string;
  emoji?: string;
  icon?: string;
}

interface QuestionCardProps {
  type: 'select' | 'input';
  options?: OptionItem[];
  placeholder?: string;
  multiSelect?: boolean;
  maxLength?: number;
  onValueChange: (value: string | string[]) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const OptionRow = ({ option, isSelected, theme, onPress, multiSelect, index }: any) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 55).duration(480).springify()}
      style={{ width: '100%' }}
    >
      <AnimatedPressable
        onPressIn={() => { scale.value = withSpring(0.975, { damping: 18, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 18, stiffness: 300 }); }}
        onPress={() => onPress(option.label)}
        style={[
          styles.row,
          animatedStyle,
          {
            backgroundColor: isSelected ? theme.text : theme.card,
            borderColor: isSelected ? theme.text : theme.border,
          },
        ]}
      >
        {/* Emoji */}
        {option.emoji ? (
          <View style={[styles.rowEmoji, { backgroundColor: isSelected ? 'rgba(255,255,255,0.15)' : theme.background }]}>
            <Text style={styles.rowEmojiText}>{option.emoji}</Text>
          </View>
        ) : (
          <View style={[styles.rowEmoji, { backgroundColor: isSelected ? 'rgba(255,255,255,0.15)' : theme.background }]}>
            <Ionicons name="ellipse-outline" size={16} color={isSelected ? theme.background : theme.icon} />
          </View>
        )}

        {/* Label */}
        <Text style={[
          styles.rowLabel,
          { color: isSelected ? theme.background : theme.text },
          isSelected && { fontWeight: '700' },
        ]}>
          {option.label}
        </Text>

        {/* Check indicator */}
        {multiSelect ? (
          <View style={[
            styles.checkbox,
            {
              backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'transparent',
              borderColor: isSelected ? 'rgba(255,255,255,0.4)' : theme.border,
            }
          ]}>
            {isSelected && (
              <Animated.View entering={FadeIn.duration(200)}>
                <Ionicons name="checkmark" size={13} color={theme.background} />
              </Animated.View>
            )}
          </View>
        ) : (
          isSelected && (
            <Animated.View entering={FadeIn.duration(200)}>
              <Ionicons name="checkmark-circle" size={20} color={theme.background} style={{ opacity: 0.85 }} />
            </Animated.View>
          )
        )}
      </AnimatedPressable>
    </Animated.View>
  );
};

export const QuestionCard = ({
  type,
  options,
  placeholder,
  multiSelect = false,
  maxLength,
  onValueChange,
}: QuestionCardProps) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  const toggleOption = (label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!multiSelect) {
      setSelectedOptions([label]);
      onValueChange(label);
      return;
    }

    const isSelected = selectedOptions.includes(label);
    const next = isSelected
      ? selectedOptions.filter(o => o !== label)
      : [...selectedOptions, label];
    setSelectedOptions(next);
    onValueChange(next);
  };

  if (type === 'select' && options) {
    return (
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {options.map((option, index) => (
          <OptionRow
            key={option.label}
            option={option}
            index={index}
            isSelected={selectedOptions.includes(option.label)}
            theme={theme}
            onPress={toggleOption}
            multiSelect={multiSelect}
          />
        ))}
      </ScrollView>
    );
  }

  // Input type
  const isFilled = inputValue.length > 0;
  return (
    <Animated.View entering={FadeInDown.delay(200).duration(600)} style={{ width: '100%' }}>
      <View style={[
        styles.inputWrapper,
        {
          backgroundColor: theme.card,
          borderColor: isFilled ? theme.text : theme.border,
        },
      ]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder={placeholder}
          placeholderTextColor={theme.icon}
          value={inputValue}
          onChangeText={(text) => { setInputValue(text); onValueChange(text); }}
          selectionColor={theme.primary}
          autoCapitalize="sentences"
          autoCorrect={true}
          maxLength={maxLength}
        />
        {isFilled && (
          <Pressable onPress={() => { setInputValue(''); onValueChange(''); }} hitSlop={12}>
            <Ionicons name="close-circle" size={22} color={theme.icon} />
          </Pressable>
        )}
      </View>
      {maxLength && (
        <Text style={[styles.charCount, { color: theme.icon }]}>
          {inputValue.length}/{maxLength}
        </Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    gap: 10,
    paddingBottom: 120,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
  },
  rowEmoji: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowEmojiText: {
    fontSize: 18,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 12,
    marginTop: 8,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  charCount: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 8,
    paddingRight: 4,
  },
});
