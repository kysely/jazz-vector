import { config } from "../config";

export const peerUrl = (apiKey = config.apiKey): `wss://${string}` =>
  `wss://cloud.jazz.tools/?key=${apiKey}`;
