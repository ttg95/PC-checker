import type { DmaDeviceEntry } from '../types';
import { generateId, calculateRiskLevel } from '../utils/id';
import { calculateItemRisk } from '../utils/riskEngine';

function makeEntry(partial: Partial<DmaDeviceEntry> & { deviceId: string; vendorId: string; deviceName: string }): DmaDeviceEntry {
  const riskScore = calculateItemRisk({ isSigned: partial.isSigned, path: partial.deviceName });
  return {
    id: generateId(),
    location: '',
    busType: 'Unknown',
    driverInstalled: true,
    isHidden: false,
    isSigned: null,
    riskScore,
    riskLevel: calculateRiskLevel(riskScore),
    flagStatus: 'unflagged',
    ...partial,
  };
}

export function scanDmaDevices(): DmaDeviceEntry[] {
  return [
    // Suspicious PCIe DMA device
    makeEntry({ deviceId: 'DEV_5678', vendorId: 'VEN_1234', deviceName: 'DMA Capture Module', location: 'PCI Express Root Complex -> Bus 0, Device 3, Function 0', busType: 'PCIe', driverInstalled: false, isHidden: false, isSigned: false, riskScore: 85 }),
    // Unknown USB with descriptor failure
    makeEntry({ deviceId: 'PID_9ABC', vendorId: 'VID_ABCD', deviceName: 'Unknown USB Device (Descriptor Request Failed)', location: 'USB Host Controller -> Hub 1 -> Port 3', busType: 'USB', driverInstalled: false, isHidden: true, isSigned: null, riskScore: 70 }),
    // USB Ethernet (sometimes used for DMA passthrough)
    makeEntry({ deviceId: 'PID_EF01', vendorId: 'VID_ABCD', deviceName: 'USB Ethernet Adapter', location: 'USB Host Controller -> Hub 2 -> Port 1', busType: 'USB', driverInstalled: true, isHidden: false, isSigned: true, riskScore: 25 }),
    // Legitimate GPU
    makeEntry({ deviceId: 'DEV_2504', vendorId: 'VEN_10DE', deviceName: 'NVIDIA GeForce RTX 3060', location: 'PCI Express Root Complex -> Bus 0, Device 1, Function 0', busType: 'PCIe', driverInstalled: true, isHidden: false, isSigned: true, riskScore: 0 }),
    // Legitimate chipset
    makeEntry({ deviceId: 'DEV_A085', vendorId: 'VEN_8086', deviceName: 'Intel PCIe Controller', location: 'PCI Express Root Complex -> Bus 0, Device 0, Function 0', busType: 'PCIe', driverInstalled: true, isHidden: false, isSigned: true, riskScore: 0 }),
    // Unknown interrupt controller
    makeEntry({ deviceId: 'DEV_1111', vendorId: 'VEN_5555', deviceName: 'Custom Interrupt Controller', location: 'PCI Express Root Complex -> Bus 0, Device 5, Function 0', busType: 'PCIe', driverInstalled: false, isHidden: true, isSigned: null, riskScore: 65 }),
    // Another suspicious PCIe device
    makeEntry({ deviceId: 'DEV_7788', vendorId: 'VEN_9999', deviceName: 'PCIe Memory Access Device', location: 'PCI Express Root Complex -> Bus 0, Device 7, Function 0', busType: 'PCIe', driverInstalled: true, isHidden: false, isSigned: false, riskScore: 75 }),
    // Thunderbolt device
    makeEntry({ deviceId: 'DEV_3344', vendorId: 'VEN_8086', deviceName: 'Thunderbolt Controller', location: 'PCI Express Root Complex -> Bus 0, Device 2, Function 0', busType: 'Thunderbolt', driverInstalled: true, isHidden: false, isSigned: true, riskScore: 15 }),
    // Legitimate NVMe
    makeEntry({ deviceId: 'DEV_0A58', vendorId: 'VEN_144D', deviceName: 'Samsung NVMe Controller', location: 'PCI Express Root Complex -> Bus 0, Device 4, Function 0', busType: 'PCIe', driverInstalled: true, isHidden: false, isSigned: true, riskScore: 0 }),
  ];
}
