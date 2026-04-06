import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Pressable, Dimensions } from 'react-native';
import Animated, { 
  FadeInRight,
  FadeIn,
  FadeOut,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';

interface QuestionCardProps {
  type: 'select' | 'input';
  options?: string[];
  placeholder?: string;
  onValueChange: (value: string | string[]) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const OptionChip = ({ option, isSelected, theme, onPress }: any) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => onPress(option)}
      style={[
        styles.chip,
        animatedStyle,
        { 
          backgroundColor: isSelected ? theme.primary : theme.card,
          borderColor: isSelected ? theme.primary : theme.border,
        }
      ]}
    >
      <Text style={[styles.chipText, { color: isSelected ? theme.background : theme.text }]}>
        {option}
      </Text>
      {isSelected && (
        <Animated.View 
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[styles.activeDot, { backgroundColor: theme.background }]} 
        />
      )}
    </AnimatedPressable>
  );
};

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
              <OptionChip 
                option={option} 
                isSelected={isSelected} 
                theme={theme} 
                onPress={toggleOption} 
              />
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
            borderColor: theme.border,
          }
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.icon}
        value={inputValue}
        onChangeText={handleInputChange}
        selectionColor={theme.primary}
        autoCapitalize="words"
        autoCorrect={false}
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
    justifyContent: 'center',
  },
  chip: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 8,
  },
  input: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    fontSize: 18,
    borderWidth: 1,
    marginTop: 20,
    fontWeight: '500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    textAlign: 'center',
  },
});
