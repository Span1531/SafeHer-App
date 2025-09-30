import AsyncStorage from '@react-native-async-storage/async-storage';

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
      
      if (!contactsJson) {
        console.log('📇 No contacts found in storage');
        return [];
      }

      const contacts = JSON.parse(contactsJson);
      console.log(`📇 Loaded ${contacts.length} contacts from storage`);
      return contacts;
    } catch (error) {
      console.error('❌ Error loading contacts:', error);
      return [];
    }
  }

  /**
   * Save contacts to AsyncStorage
   */
  async saveContacts(contacts: EmergencyContact[]): Promise<boolean> {
    try {
      await AsyncStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
      console.log(`✅ Saved ${contacts.length} contacts to storage`);
      return true;
    } catch (error) {
      console.error('❌ Error saving contacts:', error);
      return false;
    }
  }

  /**
   * Add a new emergency contact
   */
  async addContact(name: string, phone: string): Promise<EmergencyContact | null> {
    try {
      const contacts = await this.getContacts();
      
      // Create new contact
      const newContact: EmergencyContact = {
        id: Date.now().toString(),
        name: name.trim(),
        phone: phone.trim(),
      };

      // Add to list
      contacts.push(newContact);
      
      // Save
      const saved = await this.saveContacts(contacts);
      
      if (saved) {
        console.log('✅ Contact added:', newContact);
        return newContact;
      }
      
      return null;
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
      
      const saved = await this.saveContacts(filtered);
      
      if (saved) {
        console.log('✅ Contact deleted:', id);
      }
      
      return saved;
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
        console.error('❌ Contact not found:', id);
        return false;
      }

      // Update contact
      contacts[index] = {
        id,
        name: name.trim(),
        phone: phone.trim(),
      };

      const saved = await this.saveContacts(contacts);
      
      if (saved) {
        console.log('✅ Contact updated:', contacts[index]);
      }
      
      return saved;
    } catch (error) {
      console.error('❌ Error updating contact:', error);
      return false;
    }
  }

  /**
   * Clear all contacts (for testing/debugging)
   */
  async clearAllContacts(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(CONTACTS_STORAGE_KEY);
      console.log('🗑️ All contacts cleared');
      return true;
    } catch (error) {
      console.error('❌ Error clearing contacts:', error);
      return false;
    }
  }

  /**
   * Get contact count
   */
  async getContactCount(): Promise<number> {
    const contacts = await this.getContacts();
    return contacts.length;
  }
}

export const contactsService = new ContactsService();