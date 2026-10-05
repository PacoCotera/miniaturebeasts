import { emptyEnvelope, validateEnvelope, applyCommand } from './domain.mjs';

export const DATABASE_NAME = 'critter-lab-founder-demo-v1';

export function openRepository(indexedDB, name = DATABASE_NAME) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('experiment');
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('STORAGE BLOCKED'));
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      function transact(command) {
        return new Promise((finish, fail) => {
          const transaction = database.transaction('experiment', command ? 'readwrite' : 'readonly');
          const store = transaction.objectStore('experiment');
          let answer;
          let error;
          const read = store.get('state');
          read.onsuccess = () => {
            try {
              const envelope = read.result ?? emptyEnvelope();
              validateEnvelope(envelope);
              if (command) {
                const changed = applyCommand(envelope, command);
                store.put(changed.envelope, 'state');
                answer = changed;
              } else answer = { envelope };
            } catch (reason) {
              error = reason;
              transaction.abort();
            }
          };
          // A successful put is not a committed transaction.
          transaction.oncomplete = () => finish(structuredClone(answer));
          transaction.onabort = () => fail(error ?? transaction.error ?? new Error('STORAGE ABORTED'));
          transaction.onerror = () => { error ??= transaction.error; };
        });
      }
      resolve({ read: () => transact(null), execute: transact, close: () => database.close() });
    };
  });
}
