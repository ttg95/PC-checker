import type { DmaDeviceEntry, EventLogEntry } from '../types';

const usbTerms = [
  'usb',
  'hid',
  'keyboard',
  'mouse',
  'input',
  'vid_',
  'pid_',
  'mass storage',
  'removable',
  'device descriptor',
];

export function isUsbEvent(item: EventLogEntry): boolean {
  if (
    item.eventCategory === 'usb_connect'
    || item.eventCategory === 'usb_disconnect'
    || item.eventCategory === 'device_config'
    || item.eventCategory === 'device_delete'
  ) {
    return true;
  }

  const text = `${item.logChannel} ${item.source} ${item.message}`.toLowerCase();
  const isDriverFrameworkEvent = item.logChannel.toLowerCase().includes('driverframeworks-usermode')
    || item.source.toLowerCase().includes('driverframeworks-usermode');
  return isDriverFrameworkEvent
    ? usbTerms.some(term => text.includes(term))
    : usbTerms.some(term => text.includes(term)) && text.includes('device');
}

export function isUsbDevice(item: DmaDeviceEntry): boolean {
  const text = `${item.busType} ${item.deviceName} ${item.location} ${item.vendorId} ${item.deviceId}`.toLowerCase();
  return item.busType === 'USB' || usbTerms.some(term => text.includes(term));
}
