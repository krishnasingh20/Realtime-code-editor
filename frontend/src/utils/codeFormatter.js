const formatJavaScript = (code) => {
  try {
    let formatted = code.trim();
    let indent = 0;
    const lines = formatted.split('\n');
    const formattedLines = lines.map(line => {
      let trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('}') || trimmedLine.startsWith(']') || trimmedLine.startsWith(')')) {
        indent = Math.max(0, indent - 1);
      }
      
      const indentedLine = '  '.repeat(indent) + trimmedLine;
      
      if (trimmedLine.endsWith('{') || trimmedLine.endsWith('[') || trimmedLine.endsWith('(')) {
        indent++;
      }
      
      return indentedLine;
    });
    
    return formattedLines.join('\n');
  } catch (error) {
    return code;
  }
};

const formatPython = (code) => {
  try {
    let formatted = code.trim();
    let indent = 0;
    const lines = formatted.split('\n');
    
    const formattedLines = lines.map(line => {
      let trimmedLine = line.trim();
      
      if (!trimmedLine) return '';
      
      if (trimmedLine.startsWith('elif ') || 
          trimmedLine.startsWith('else:') || 
          trimmedLine.startsWith('except') || 
          trimmedLine.startsWith('finally:')) {
        indent = Math.max(0, indent - 1);
      }
      
      const indentedLine = '    '.repeat(indent) + trimmedLine;
      
      if (trimmedLine.endsWith(':')) {
        indent++;
      }
      
      if (trimmedLine === 'return' || 
          trimmedLine.startsWith('return ') ||
          trimmedLine === 'break' || 
          trimmedLine === 'continue' ||
          trimmedLine === 'pass') {
        indent = Math.max(0, indent - 1);
      }
      
      return indentedLine;
    });
    
    return formattedLines.join('\n');
  } catch (error) {
    return code;
  }
};

const formatCpp = (code) => {
  try {
    let formatted = code.trim();
    let indent = 0;
    const lines = formatted.split('\n');
    
    const formattedLines = lines.map(line => {
      let trimmedLine = line.trim();
      
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        return trimmedLine;
      }
      
      if (trimmedLine.startsWith('}')) {
        indent = Math.max(0, indent - 1);
      }
      
      const indentedLine = '    '.repeat(indent) + trimmedLine;
      
      if (trimmedLine.endsWith('{')) {
        indent++;
      }
      
      return indentedLine;
    });
    
    return formattedLines.join('\n');
  } catch (error) {
    return code;
  }
};

const formatJava = (code) => {
  try {
    let formatted = code.trim();
    let indent = 0;
    const lines = formatted.split('\n');
    
    const formattedLines = lines.map(line => {
      let trimmedLine = line.trim();
      
      if (!trimmedLine || trimmedLine.startsWith('import ') || trimmedLine.startsWith('package ')) {
        return trimmedLine;
      }
      
      if (trimmedLine.startsWith('}')) {
        indent = Math.max(0, indent - 1);
      }
      
      const indentedLine = '    '.repeat(indent) + trimmedLine;
      
      if (trimmedLine.endsWith('{')) {
        indent++;
      }
      
      return indentedLine;
    });
    
    return formattedLines.join('\n');
  } catch (error) {
    return code;
  }
};

export const formatCode = (code, language) => {
  if (!code || !code.trim()) {
    return code;
  }
  
  switch (language) {
    case 'javascript':
      return formatJavaScript(code);
    case 'python':
      return formatPython(code);
    case 'cpp':
      return formatCpp(code);
    case 'java':
      return formatJava(code);
    default:
      return code;
  }
};

export const getFormattingMessage = (language) => {
  return `Code formatted for ${language.toUpperCase()}`;
};