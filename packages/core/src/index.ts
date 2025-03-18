// Export everything from the allocator
export * from './allocator';

// Export everything from the config
export * from './config/loader';
export * from './config/schema';

// Export everything from the models
export * from './models/types';

// Export everything from the output
export * from './output/csv-writer';
export * from './output/validator';

// Export from utils
export { 
  Logger, 
  LogLevel, 
  configureLogger, 
  createLogger,
  parseLogLevel
} from './utils/logger';

// Export cloud detection utilities
export { 
  detectCloudProviderFromRegion, 
  CloudProvider 
} from './utils/region-detector';

// Export error utilities
export {
  SubnetterError,
  ErrorCode,
  ConfigurationError,
  AllocationError,
  IOError,
  ValidationError,
  CloudProviderError
} from './utils/errors';

// Export core functionality
export { loadConfig, validateConfig } from './config/loader';
export { CidrAllocator } from './allocator/core/allocator';
export { writeAllocationsToCsv, filterAllocationsByProvider } from './output/csv-writer';
export { validateNoOverlappingCidrs } from './output/validator';

// Export allocator components for tests
export { SubnetAllocator } from './allocator/core/subnet';
export { CidrTracker } from './allocator/utils/tracking';

// Export CIDR utilities
export {
  isValidIpv4Cidr,
  calculateUsableIps,
  doCidrsOverlap,
  subdivideIpv4Cidr,
  calculateOptimalPrefixLength,
  calculateRequiredPrefixLength,
  ContiguousAllocator,
  HierarchicalAllocator
} from './allocator/utils/cidr';

// For backward compatibility in tests
import { AllocationError as CidrError } from './utils/errors';
export { CidrError };
export { ConfigurationError as ConfigValidationError } from './utils/errors'; 