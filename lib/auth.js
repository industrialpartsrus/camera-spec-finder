// lib/auth.js
// Simple username + passcode authentication for warehouse scanner
// Users are stored in Firestore approved_users collection

import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Verify user credentials against approved_users collection
 * @param {string} username - User's name (case-insensitive)
 * @param {string} passcode - 4-digit PIN
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function verifyUser(username, passcode) {
  if (!username || !passcode) {
    return { success: false, error: 'Username and passcode required' };
  }

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedPasscode = passcode.trim();

  try {
    const usersRef = collection(db, 'approved_users');
    const q = query(
      usersRef,
      where('username_lower', '==', normalizedUsername),
      where('active', '==', true)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { success: false, error: 'User not found' };
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    if (userData.passcode !== normalizedPasscode) {
      return { success: false, error: 'Incorrect passcode' };
    }

    return {
      success: true,
      user: {
        id: userDoc.id,
        username: userData.username,
        role: userData.role || 'scanner',
        active: userData.active
      }
    };
  } catch (error) {
    console.error('Auth error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Get all active users (for user selection dropdown)
 * @returns {Promise<Array<{id: string, username: string, role: string}>>}
 */
export async function getActiveUsers() {
  try {
    const usersRef = collection(db, 'approved_users');
    const q = query(usersRef, where('active', '==', true));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      username: doc.data().username,
      role: doc.data().role || 'scanner'
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}
