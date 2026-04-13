import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Pressable, Dimensions } from 'react-native';
import { Ionicons, FontAwesome6, Entypo, AntDesign } from '@expo/vector-icons';
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
  multiSelect?: boolean;
  maxLength?: number;
  onValueChange: (value: string | string[]) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PLATFORM_ICONS: Record<string, any> = {
  'Instagram': { provider: FontAwesome6, name: 'instagram' },
  'TikTok': { provider: FontAwesome6, name: 'tiktok' },
  'YouTube': { provider: FontAwesome6, name: 'youtube' },
  'LinkedIn': { provider: FontAwesome6, name: 'linkedin' },
  'Facebook': { provider: FontAwesome6, name: 'facebook' },
  'Threads': { provider: FontAwesome6, name: 'threads' },
  'Pinterest': { provider: FontAwesome6, name: 'pinterest' },
};

const OptionChip = ({ option, isSelected, theme, onPress, showIcon }: any) => {
  const scale = useSharedValue(1);
  const IconComponent = PLATFORM_ICONS[option]?.provider;

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
          shadowColor: isSelected ? theme.primary : 'transparent',
          shadowOpacity: isSelected ? 0.3 : 0,
          shadowRadius: 10,
          elevation: isSelected ? 5 : 0,
          paddingLeft: showIcon && PLATFORM_ICONS[option] ? 14 : 20,
        }
      ]}
    >
      {showIcon && IconComponent && (
        <IconComponent 
          name={PLATFORM_ICONS[option].name} 
          size={18} 
          color={isSelected ? theme.background : theme.text} 
          style={{ marginRight: 8 }}
        />
      )}
      <Text style={[
        styles.chipText, 
        { 
          color: isSelected ? theme.background : theme.text,
          fontWeight: isSelected ? '700' : '500'
        }
      ]}>
        {option}
      </Text>
      {isSelected && !showIcon && (
        <Animated.View 
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[styles.activeDot, { backgroundColor: theme.background }]} 
        />
      )}
    </AnimatedPressable>
  );
};

export const QuestionCard = ({ type, options, placeholder, multiSelect = true, maxLength, onValueChange }: QuestionCardProps) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);

  const toggleOption = (option: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (option === 'Other') {
       setShowOtherInput(!showOtherInput);
       if (!multiSelect) {
         setSelectedOptions(['Other']);
         onValueChange('Other');
         return;
       }
    }

    if (!multiSelect) {
      setSelectedOptions([option]);
      onValueChange(option);
      if (option !== 'Other') setShowOtherInput(false);
      return;
    }

    const isSelected = selectedOptions.includes(option);
    const newSelection = isSelected
      ? selectedOptions.filter(o => o !== option)
      : [...selectedOptions, option];
    
    setSelectedOptions(newSelection);
    onValueChange(newSelection);
  };

  const handleInputChange = (text: string) => {
    setInputValue(text);
    onValueChange(text);
  };

  const handleOtherInputChange = (text: string) => {
    setInputValue(text);
    onValueChange(text);
  };

  if (type === 'select' && options) {
    return (
      <View style={{ width: '100%' }}>
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
                  showIcon={options.some(opt => PLATFORM_ICONS[opt])}
                />
              </Animated.View>
            );
          })}
        </View>

        {showOtherInput && (
          <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={{ marginTop: 20 }}>
            <TextInput
              style={[
                styles.miniInput,
                { 
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: inputValue.length > 0 ? theme.primary : theme.border,
                }
              ]}
              placeholder="Please specify..."
              placeholderTextColor={theme.icon}
              value={inputValue}
              onChangeText={handleOtherInputChange}
              selectionColor={theme.primary}
              autoFocus
              onFocus={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            />
          </Animated.View>
        )}
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
            borderColor: inputValue.length > 0 ? theme.primary : theme.border,
          }
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.icon}
        value={inputValue}
        onChangeText={handleInputChange}
        selectionColor={theme.primary}
        autoCapitalize="sentences"
        autoCorrect={true}
        maxLength={maxLength}
      />
      {maxLength && (
        <Text style={[styles.characterCount, { color: theme.icon }]}>
          {inputValue.length}/{maxLength}
        </Text>
      )}
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
  miniInput: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    fontSize: 16,
    borderWidth: 1,
    fontWeight: '500',
    textAlign: 'center',
  },
  characterCount: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
    fontWeight: '600',
    paddingRight: 10,
  },
});
