// Mock implementation for cidr-tools
export const parseCidr = jest.fn((cidr) => {
  const [ip, prefix] = cidr.split('/');
  return { 
    ip, 
    prefix: parseInt(prefix, 10),
    ipStart: ip,
    ipEnd: ip,
    ipMask: '255.255.255.0',
    ipWildcard: '0.0.0.0'
  };
});

export const overlapCidr = jest.fn((cidr1, cidr2) => {
  return cidr1 === cidr2;
});

export const subnetCidr = jest.fn((cidr, newPrefix) => {
  const [ip] = cidr.split('/');
  return `${ip}/${newPrefix}`;
});

export const expandCidr = jest.fn((cidr) => {
  return [cidr];
});

export const rangeCidr = jest.fn((cidr) => {
  const [ip, prefix] = cidr.split('/');
  const size = Math.pow(2, 32 - parseInt(prefix, 10));
  return { 
    start: ip, 
    end: ip,
    size: size
  };
});

export const splitCidr = jest.fn((cidr, count) => {
  const [ip, prefix] = cidr.split('/');
  const newPrefix = parseInt(prefix, 10) + Math.log2(count);
  
  // Generate the requested number of subnets
  return Array(count).fill(0).map((_, i) => {
    return `${ip}/${newPrefix}`;
  });
});

export const summarizeCidr = jest.fn((cidrs) => {
  return cidrs.length > 0 ? [cidrs[0]] : [];
});

export const sortCidr = jest.fn((cidrs) => {
  return [...cidrs].sort();
});

export const detectCidr = jest.fn(() => true); 