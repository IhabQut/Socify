import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Modal, FlatList, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeInDown, FadeOutDown } from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SettingsPickerProps {
  label: string;
  value: string | string[];
  options: string[];
  onSelect: (value: string | string[]) => void;
  theme: any;
  multiSelect?: boolean;
  enabled?: boolean;
}

export const SettingsPicker = ({ label, value, options, onSelect, theme, multiSelect = false, enabled = true }: SettingsPickerProps) => {
  const [modalVisible, setModalVisible] = useState(false);

  const isSelected = (option: string) => {
    if (multiSelect && Array.isArray(value)) {
      return value.includes(option);
    }
    return value === option;
  };

  const handleSelect = (option: string) => {
    if (multiSelect) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.includes(option)) {
        onSelect(currentValues.filter(v => v !== option));
      } else {
        onSelect([...currentValues, option]);
      }
    } else {
      onSelect(option);
      setModalVisible(false);
    }
  };

  const displayValue = Array.isArray(value) 
    ? (value.length > 0 ? value.join(', ') : 'None selected') 
    : (value || 'Select an option...');

  return (
    <View style={[styles.container, !enabled && { opacity: 0.6 }]}>
      <Text style={[styles.label, { color: theme.icon }]}>{label}</Text>
      <Pressable 
        style={[styles.pickerTrigger, { backgroundColor: theme.background, borderColor: theme.border }]}
        onPress={() => enabled && setModalVisible(true)}
      >
        <Text style={[styles.valueText, { color: theme.text }]} numberOfLines={1}>
          {displayValue}
        </Text>
        <Ionicons name="chevron-down" size={18} color={theme.icon} />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{label}</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.doneBtn}>
                <Text style={[styles.doneText, { color: theme.primary }]}>Done</Text>
              </Pressable>
            </View>

            <FlatList
              data={options}
              keyExtractor={item => item}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <Pressable 
                  style={[
                    styles.optionItem, 
                    isSelected(item) && { backgroundColor: theme.primary + '15' }
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={[
                    styles.optionText, 
                    { color: isSelected(item) ? theme.primary : theme.text },
                    isSelected(item) && { fontWeight: '700' }
                  ]}>
                    {item}
                  </Text>
                  {isSelected(item) && (
                    <Ionicons name="checkmark" size={20} color={theme.primary} />
                  )}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: SCREEN_HEIGHT * 0.6,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  doneBtn: {
    padding: 4,
  },
  doneText: {
    fontSize: 16,
    fontWeight: '700',
  },
  listContent: {
    padding: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
