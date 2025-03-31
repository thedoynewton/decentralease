import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView 
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function Create() {
  const [lookingFor, setLookingFor] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');

  const categories = [
    'Vehicle', 
    'Tools', 
    'Electronics', 
    'Sports Equipment', 
    'Home Appliances'
  ];

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Back Button (simulated) */}
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        <Text style={styles.title}>Post Item Request</Text>
        <Text style={styles.subtitle}>Please input your location and item you're looking for.</Text>

        {/* What do you need to rent input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>What do you need to rent?</Text>
          <TextInput 
            placeholder="I am looking for..."
            style={styles.textInput}
            value={lookingFor}
            onChangeText={setLookingFor}
          />
        </View>

        {/* Category Dropdown */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity 
            style={styles.dropdownContainer}
            onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
          >
            <Text style={[styles.dropdownText, !category && styles.placeholderText]}>
              {category || 'Select a category'}
            </Text>
            <Ionicons name="chevron-down" color="#888" size={20} />
          </TouchableOpacity>

          {showCategoryDropdown && (
            <View style={styles.dropdown}>
              {categories.map((cat) => (
                <TouchableOpacity 
                  key={cat}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Description Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description</Text>
          <TextInput 
            placeholder="Describe the asset you want to rent"
            style={styles.textAreaInput}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />

          {/* Upload Photo Button */}
          <TouchableOpacity style={styles.uploadButton}>
            <Ionicons name="camera-outline" color="#888" size={20} />
            <Text style={styles.uploadButtonText}>Upload a photo of the asset you're looking for</Text>
          </TouchableOpacity>
        </View>

        {/* Address Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Addresses</Text>
          <View style={styles.addressInputContainer}>
            <TextInput 
              placeholder="Please input your address"
              style={styles.addressInput}
              value={address}
              onChangeText={setAddress}
            />
            <Ionicons name="location-outline" color="#888" size={20} />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton}>
          <Text style={styles.submitButtonText}>Post Item Request</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContainer: {
    padding: 20,
  },
  backButton: {
    marginTop: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 10,
    color: '#333',
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  dropdownContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  dropdownText: {
    flex: 1,
  },
  placeholderText: {
    color: '#888',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 5,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  textAreaInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  uploadButtonText: {
    marginLeft: 10,
    color: '#888',
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  addressInput: {
    flex: 1,
    marginRight: 10,
  },
  submitButton: {
    backgroundColor: '#007AFF', // iOS blue, adjust as needed
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});