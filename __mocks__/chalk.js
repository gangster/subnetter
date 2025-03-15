// Mock implementation for chalk
const createColorFn = (color) => (text) => `[${color.toUpperCase()}]${text}[/${color.toUpperCase()}]`;

const chalk = {
  green: createColorFn('green'),
  red: createColorFn('red'),
  yellow: createColorFn('yellow'),
  blue: createColorFn('blue'),
  cyan: createColorFn('cyan'),
  gray: createColorFn('gray'),
  white: createColorFn('white'),
  black: createColorFn('black'),
  
  // Style modifiers
  bold: createColorFn('bold'),
  dim: createColorFn('dim'),
  italic: createColorFn('italic'),
  underline: createColorFn('underline'),
  
  // Allow chaining
  get bgRed() { return { ...this, _bgRed: true, toString: () => '[BGRED]' }; },
  get bgGreen() { return { ...this, _bgGreen: true, toString: () => '[BGGREEN]' }; },
  get bgYellow() { return { ...this, _bgYellow: true, toString: () => '[BGYELLOW]' }; },
  get bgBlue() { return { ...this, _bgBlue: true, toString: () => '[BGBLUE]' }; },
};

// Support chaining of styles
const chainableProxy = new Proxy(chalk, {
  get(target, prop) {
    if (prop in target) {
      return target[prop];
    }
    
    // Handle nested color + style combinations
    return createColorFn(prop);
  }
});

export default chainableProxy; 