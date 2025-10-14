import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

const { SafeHerStorage } = NativeModules;
const CONTACTS_STORAGE_KEY = '@safeher_emergency_contacts';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

class ContactsService {
  /**
   * Get all emergency contacts from AsyncStorage
   */
  async getContacts(): Promise<EmergencyContact[]> {
    try {
      const contactsJson = await AsyncStorage.getItem(CONTACTS_STORAGE_KEY);
      return contactsJson ? JSON.parse(contactsJson) : [];
    } catch (error) {
      console.error('❌ Error loading contacts:', error);
      return [];
    }
  }

  /**
   * Save contacts to AsyncStorage and mirror to native SharedPreferences
   */
  async saveContacts(contacts: EmergencyContact[]): Promise<boolean> {
    try {
      await AsyncStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
      console.log(`✅ Saved ${contacts.length} contacts to AsyncStorage`);

      // ✅ CORRECTED LOGIC: Directly call the native module
      if (Platform.OS === 'android' && SafeHerStorage?.setValue) {
        const phoneNumbers = contacts.map(c => c.phone.trim()).join(',');
        console.log(`📤 Attempting to mirror contacts to native storage: "${phoneNumbers}"`);
        SafeHerStorage.setValue('emergency_contacts', phoneNumbers);
      } else if (Platform.OS === 'android') {
        console.warn('⚠️ SafeHerStorage native module not available during save.');
      }

      return true;
    } catch (error) {
      console.error('❌ Error saving contacts:', error);
      return false;
    }
  }

  /**
   * Add a new contact
   */
  async addContact(name: string, phone: string): Promise<EmergencyContact | null> {
    try {
      const contacts = await this.getContacts();
      const newContact: EmergencyContact = {
        id: Date.now().toString(),
        name: name.trim(),
        phone: phone.trim(),
      };
      contacts.push(newContact);
      await this.saveContacts(contacts); // This will now automatically mirror the data
      return newContact;
    } catch (error) {
      console.error('❌ Error adding contact:', error);
      return null;
    }
  }

  /**
   * Delete an emergency contact
   */
  async deleteContact(id: string): Promise<boolean> {
    try {
      const contacts = await this.getContacts();
      const filtered = contacts.filter(c => c.id !== id);
      return await this.saveContacts(filtered);
    } catch (error) {
      console.error('❌ Error deleting contact:', error);
      return false;
    }
  }

  /**
   * Update an existing contact
   */
  async updateContact(id: string, name: string, phone: string): Promise<boolean> {
    try {
      const contacts = await this.getContacts();
      const index = contacts.findIndex(c => c.id === id);
      if (index === -1) {
        return false;
      }
      contacts[index] = { id, name: name.trim(), phone: phone.trim() };
      return await this.saveContacts(contacts);
    } catch (error) {
      console.error('❌ Error updating contact:', error);
      return false;
    }
  }
}

export const contactsService = new ContactsService();