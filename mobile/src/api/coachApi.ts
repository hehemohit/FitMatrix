import axios from 'axios';
import { BiometricPayload, CoachResponse } from '../types/schema';

// 'http://10.0.2.2:8000' for Android Emulator
// 'http://localhost:8000' for physical USB device with adb reverse
const BASE_URL = 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export const sendBiometricsAndMessage = async (
  payload: BiometricPayload
): Promise<CoachResponse> => {
  const response = await apiClient.post<CoachResponse>('/api/v1/chat', payload);
  return response.data;
};