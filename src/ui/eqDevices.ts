/**
 * Equalizer per output device (Settings): the profile saved for a device is
 * applied by the backend when that device becomes the default output
 * (audio_output.rs). Here the profile is only kept in step with what the
 * equalizer shows while "remember for this device" is on.
 */

export interface OutputDevice {
  id: string;
  name: string;
}

export interface DeviceEqProfile {
  name: string;
  preset: string;
  gains: number[];
  preamp: number;
}

export type DeviceProfiles = Record<string, DeviceEqProfile>;

/** Matches MAX_DEVICE_PROFILES in config.rs. */
export const MAX_DEVICE_PROFILES = 16;

export function hasDeviceProfile(profiles: DeviceProfiles | undefined, device: OutputDevice | null): boolean {
  return !!device && !!profiles && Object.prototype.hasOwnProperty.call(profiles, device.id);
}

/**
 * The profiles to save: the current device's follows the equalizer while
 * `remember` is on and is dropped when it is off. Other devices' profiles
 * are left alone, and with no known device nothing changes. `null` when a
 * new profile would go over the limit.
 */
export function withDeviceProfile(
  profiles: DeviceProfiles | undefined,
  device: OutputDevice | null,
  remember: boolean,
  eq: { preset: string; gains: number[]; preamp: number }
): DeviceProfiles | null {
  const next: DeviceProfiles = { ...(profiles ?? {}) };
  if (!device) return next;
  if (!remember) {
    delete next[device.id];
    return next;
  }
  if (!hasDeviceProfile(next, device) && Object.keys(next).length >= MAX_DEVICE_PROFILES) return null;
  next[device.id] = { name: device.name, preset: eq.preset, gains: [...eq.gains], preamp: eq.preamp };
  return next;
}
