import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Pressable, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  FadeInRight,
  FadeIn,
  Layout,
  interpolateColor,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface QuestionCardProps {
  type: 'select' | 'input';
  options?: string[];
  placeholder?: string;
  onValueChange: (value: string | string[]) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const QuestionCard = ({ type, options, placeholder, onValueChange }: QuestionCardProps) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  const toggleOption = (option: string) => {
    const isSelected = selectedOptions.includes(option);
    const newSelection = isSelected
      ? selectedOptions.filter(o => o !== option)
      : [...selectedOptions, option];
    
    setSelectedOptions(newSelection);
    onValueChange(newSelection);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleInputChange = (text: string) => {
    setInputValue(text);
    onValueChange(text);
  };

  if (type === 'select' && options) {
    return (
      <View style={styles.gridContainer}>
        {options.map((option, index) => {
          const isSelected = selectedOptions.includes(option);
          
          return (
            <Animated.View 
              key={option} 
              entering={FadeInRight.delay(index * 100).duration(500)}
              layout={Layout.springify()}
            >
              <Pressable
                onPress={() => toggleOption(option)}
                style={[
                  styles.chip,
                  { 
                    backgroundColor: isSelected ? theme.primary : theme.card,
                    borderColor: isSelected ? theme.primary : 'rgba(255,255,255,0.1)',
                  }
                ]}
              >
                <Text style={[styles.chipText, { color: isSelected ? '#fff' : theme.text }]}>
                  {option}
                </Text>
                {isSelected && (
                  <Animated.View 
                    entering={FadeIn.duration(200)}
                    style={[styles.activeDot, { backgroundColor: theme.secondary }]} 
                  />
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    );
  }

  return (
    <Animated.View entering={FadeInRight.delay(200).duration(600)}>
      <TextInput
        style={[
          styles.input,
          { 
            backgroundColor: theme.card,
            color: theme.text,
            borderColor: theme.primary + '44',
            shadowColor: theme.primary,
          }
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.text + '50'}
        value={inputValue}
        onChangeText={handleInputChange}
        selectionColor={theme.primary}
        autoFocus
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  chip: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 8,
  },
  input: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
    fontSize: 20,
    borderWidth: 1,
    marginTop: 20,
    fontWeight: '600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
});
