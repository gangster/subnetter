import { CidrTracker } from '../../../../src/index';

describe('CidrTracker', () => {
  test('should correctly track allocated CIDRs', () => {
    const tracker = new CidrTracker();
    
    // Add some CIDRs to track
    tracker.add('10.0.0.0/24');
    tracker.add('10.1.0.0/24');
    
    // Test case 1: CIDR is exactly allocated
    expect(tracker.isAllocated('10.0.0.0/24')).toBe(true);
    
    // Test case 2: CIDR is not allocated
    expect(tracker.isAllocated('10.2.0.0/24')).toBe(false);
    
    // Test case 3: CIDR overlaps with allocated CIDR
    expect(tracker.isAllocated('10.0.0.0/25')).toBe(true);
    expect(tracker.isAllocated('10.0.0.128/25')).toBe(true);
    
    // Test case 4: CIDR contains allocated CIDR
    expect(tracker.isAllocated('10.0.0.0/16')).toBe(true);
  });

  test('should reset tracking state', () => {
    const tracker = new CidrTracker();
    
    // Add a CIDR and verify it's tracked
    tracker.add('10.0.0.0/24');
    expect(tracker.isAllocated('10.0.0.0/24')).toBe(true);
    
    // Reset the tracker and verify the CIDR is no longer tracked
    tracker.reset();
    expect(tracker.isAllocated('10.0.0.0/24')).toBe(false);
  });

  test('should return all allocated CIDRs', () => {
    const tracker = new CidrTracker();
    
    // Add some CIDRs to track
    tracker.add('10.0.0.0/24');
    tracker.add('10.1.0.0/24');
    tracker.add('192.168.0.0/16');
    
    // Get all allocated CIDRs
    const allocated = tracker.getAllocated();
    
    // Verify the returned list - with deterministic ordering, the CIDRs are sorted by prefix length first,
    // so /16 comes before /24, and then by IP address, so 192.168.0.0/16 comes first
    expect(allocated).toEqual(['192.168.0.0/16', '10.0.0.0/24', '10.1.0.0/24']);
    
    // Verify it's a copy, not the original array
    expect(allocated).not.toBe(tracker['allocatedCidrs']);
    
    // Modify the returned array and verify it doesn't affect the tracker
    allocated.push('172.16.0.0/12');
    // The expected order is now sorted by prefix length first then IP: 172.16.0.0/12, 192.168.0.0/16, then /24s
    expect(tracker.getAllocated()).toEqual(['192.168.0.0/16', '10.0.0.0/24', '10.1.0.0/24']);
  });
}); 