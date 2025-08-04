import { Client, Account, Databases } from 'appwrite';

const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1') // Replace with your endpoint
  .setProject('688f58b70026fd5ddd72'); // Replace with your project ID

export const account = new Account(client);
export const databases = new Databases(client);


export const DATABASE_ID = '688fe891002d28014958';

// Collections
export const COLLECTIONS = {
  USERS: 'users',
  REPORTS: '688ffb6000083b4eb69a',
  STAFF: '688ff470001035cf83bc',
};