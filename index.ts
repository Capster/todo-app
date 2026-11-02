import { Buffer } from "buffer";

(globalThis as { Buffer?: typeof Buffer }).Buffer = Buffer;

// Imported last so the global Buffer polyfill is installed before
// isomorphic-git is loaded by the router entry.
import "expo-router/entry";
