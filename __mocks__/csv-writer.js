// Mock implementation for csv-writer
const createObjectCsvWriter = jest.fn(() => ({
  writeRecords: jest.fn().mockResolvedValue(undefined)
}));

module.exports = {
  createObjectCsvWriter
}; 