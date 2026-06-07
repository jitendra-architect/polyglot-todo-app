import mongoose from 'mongoose';
import { logger } from '../common/logger';

let isConnected = false;

export async function connectMongo(uri: string): Promise<void> {
  if (isConnected) return;
  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB error', { err }));
  await mongoose.connect(uri);
  isConnected = true;
}

export async function disconnectMongo(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}

export { mongoose };
