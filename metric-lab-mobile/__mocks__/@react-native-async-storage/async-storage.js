// Manual mock for '@react-native-async-storage/async-storage'.
//
// Jest auto-loads mocks for node_modules packages from a `__mocks__`
// directory adjacent to `node_modules` at the project root, so every test
// that imports the real package (directly, or transitively through a
// zustand `persist` store) gets this in-memory implementation instead of
// the native module, which is unavailable under Jest.
//
// The library ships its own in-memory mock for exactly this purpose; we
// just re-export it so persisted stores can read/write without touching
// real device storage or the network.
module.exports = require('@react-native-async-storage/async-storage/jest').default;
